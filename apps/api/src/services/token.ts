// Rotating QR token per bay. The token inside the QR rotates so a shared photo
// of the QR stops working (PRD §Customer flow).

import { randomBytes } from "node:crypto";
import { prisma, type Bay, SETTING_KEYS } from "@car-wash/db";
import { env } from "../env.js";
import { getNumber } from "../lib/settings.js";
import { publishToken } from "../mqtt/client.js";
import { publishAdmin } from "../lib/sse.js";

export function buildScanUrl(bayId: string, token: string): string {
  return `${env.WEB_PUBLIC_URL}/b/${bayId}?t=${token}`;
}

export function isTokenValid(bay: Pick<Bay, "currentToken" | "tokenExpiresAt">, token: string): boolean {
  if (!bay.currentToken || !bay.tokenExpiresAt) return false;
  if (bay.currentToken !== token) return false;
  return bay.tokenExpiresAt.getTime() >= Date.now();
}

async function rotateBay(bay: Bay): Promise<void> {
  const ttlSec = getNumber(bay.stationId, SETTING_KEYS.qrRotationSec, 60);
  // Short token keeps the QR URL small so the bay screen can render a low-version
  // (big-module) code that scans easily. It rotates every ttlSec and is validated
  // per-bay, so 4 hex chars (65k values) is enough entropy for this use.
  const token = randomBytes(2).toString("hex");
  // Small grace beyond the interval so a QR scanned at the last second still works.
  const expiresAt = new Date(Date.now() + (ttlSec + 5) * 1000);

  await prisma.bay.update({
    where: { id: bay.id },
    data: { currentToken: token, tokenExpiresAt: expiresAt },
  });

  const url = buildScanUrl(bay.id, token);
  try {
    publishToken(bay.id, { token, url, expiresAt: expiresAt.getTime() });
  } catch {
    // MQTT may not be connected yet; the DB token is still authoritative.
  }
  publishAdmin("token", { bayId: bay.id, url, token, expiresAt: expiresAt.getTime() });
}

/** Rotate a single bay's token now (e.g. when a session ends). */
export async function rotateToken(bayId: string): Promise<void> {
  const bay = await prisma.bay.findUnique({ where: { id: bayId } });
  if (bay) await rotateBay(bay);
}

/**
 * Single loop that rotates each bay's token once its current one is near expiry.
 * Respects each bay's own qr_rotation_sec via the stored expiry.
 */
export function startTokenRotation(tickMs = 5000): NodeJS.Timeout {
  const tick = async () => {
    const bays = await prisma.bay.findMany();
    const now = Date.now();
    for (const bay of bays) {
      if (!bay.tokenExpiresAt || bay.tokenExpiresAt.getTime() - 5000 <= now) {
        await rotateBay(bay).catch((e) => console.error("token rotate failed", e));
      }
    }
  };
  void tick();
  return setInterval(() => void tick(), tickMs);
}
