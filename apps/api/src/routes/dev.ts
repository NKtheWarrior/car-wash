// Dev-only helpers, enabled by ENABLE_DEV_ROUTES. NEVER enable in production.
// The mock payment-observation endpoint is added in the payments phase; this
// file also exposes a shortcut to start a session for manual testing.

import { randomUUID } from "node:crypto";
import { prisma, DeviceRole } from "@car-wash/db";
import { Router } from "express";
import { getOrCreateCookieId } from "../lib/cookies.js";
import { isBayReady } from "../services/bay.js";
import { processObservation } from "../services/payment.js";
import { startSession } from "../services/session.js";

export const devRouter: Router = Router();

const DEV_DEVICE_ID = "dev-listener";

async function devDevice() {
  return prisma.device.upsert({
    where: { id: DEV_DEVICE_ID },
    update: {},
    create: {
      id: DEV_DEVICE_ID,
      name: "Dev Mock Listener",
      role: DeviceRole.listener,
      signingKey: "dev-mock-key",
    },
  });
}

// Simulate a UPI credit observation (stands in for the Android listener until
// it exists). Mirrors the real /observations contract via processObservation.
devRouter.post("/dev/observe", async (req, res) => {
  const body = req.body ?? {};
  let amountPaise: number | undefined = body.amountPaise;

  // If a checkoutId is given, pay exactly its unique amount (the happy path).
  if (body.checkoutId) {
    const checkout = await prisma.checkout.findUnique({ where: { id: body.checkoutId } });
    if (!checkout) {
      res.status(404).json({ error: "checkout_not_found" });
      return;
    }
    amountPaise = checkout.amountPaise;
  }
  if (!amountPaise) {
    res.status(400).json({ error: "amountPaise_or_checkoutId_required" });
    return;
  }

  const device = await devDevice();
  const result = await processObservation(device, {
    amountPaise,
    upiRef: body.upiRef ?? `MOCK-${randomUUID().slice(0, 12)}`,
    senderVpa: body.senderVpa ?? "customer@upi",
    observedAt: new Date().toISOString(),
    rawText: body.rawText ?? `Mock: received Rs.${(amountPaise / 100).toFixed(2)}`,
    packageName: body.packageName ?? "com.fampay.in",
  });
  res.json(result);
});

// Start a session directly, bypassing payment (manual timer-engine testing).
devRouter.post("/dev/start-session", async (req, res) => {
  const { bayId, planId } = req.body ?? {};
  const bay = await prisma.bay.findUnique({ where: { id: bayId } });
  if (!bay) {
    res.status(404).json({ error: "bay_not_found" });
    return;
  }
  if (!isBayReady(bay)) {
    res.status(409).json({ error: "bay_not_ready" });
    return;
  }
  const cookieId = getOrCreateCookieId(req, res);
  const session = await startSession({ bayId, planId, cookieId });
  res.json(session);
});
