// Verifies HMAC-signed requests from paired Android devices (payment
// observations + heartbeats). The phone sends:
//   X-Device-Id, X-Timestamp (epoch ms), X-Signature (hex HMAC of
//   `${timestamp}.${rawBody}` using the device's signing key).
// Bad signatures and stale timestamps are rejected (replay protection).

import { prisma, type Device } from "@car-wash/db";
import { verify } from "@car-wash/shared";
import type { NextFunction, Response } from "express";
import type { RawBodyRequest } from "../app.js";

export interface SignedRequest extends RawBodyRequest {
  device?: Device;
}

export async function requireSignedDevice(
  req: SignedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const deviceId = req.header("X-Device-Id");
  const timestamp = Number(req.header("X-Timestamp"));
  const signature = req.header("X-Signature");

  if (!deviceId || !signature || !Number.isFinite(timestamp)) {
    res.status(401).json({ error: "missing_signature_headers" });
    return;
  }

  const device = await prisma.device.findUnique({ where: { id: deviceId } });
  if (!device || device.revoked) {
    res.status(401).json({ error: "unknown_or_revoked_device" });
    return;
  }

  const result = verify(device.signingKey, timestamp, req.rawBody ?? "", signature);
  if (!result.ok) {
    res.status(401).json({ error: "bad_signature", reason: result.reason });
    return;
  }

  req.device = device;
  next();
}
