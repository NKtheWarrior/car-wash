// Endpoints the Android listener calls. All are HMAC-signed (requireSignedDevice).

import { prisma } from "@car-wash/db";
import { observationSchema } from "@car-wash/shared";
import { Router } from "express";
import { requireSignedDevice, type SignedRequest } from "../lib/hmac-auth.js";
import { publishAdmin } from "../lib/sse.js";
import { processObservation } from "../services/payment.js";

export const listenerRouter: Router = Router();

// A payment observation parsed from a UPI credit notification.
listenerRouter.post("/observations", requireSignedDevice, async (req: SignedRequest, res) => {
  const parsed = observationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
    return;
  }
  const result = await processObservation(req.device!, parsed.data);
  res.json(result);
});

// Periodic heartbeat so the server knows the listener is alive (PRD edge 18).
listenerRouter.post("/listener/heartbeat", requireSignedDevice, async (req: SignedRequest, res) => {
  await prisma.device.update({
    where: { id: req.device!.id },
    data: { lastHeartbeatAt: new Date() },
  });
  publishAdmin("listener", { deviceId: req.device!.id, lastHeartbeatAt: Date.now() });
  res.json({ ok: true });
});
