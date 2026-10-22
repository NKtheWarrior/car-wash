// HMAC signing for the Android listener's requests (payment observations +
// heartbeats). The phone signs each request with the signing key issued at
// pairing; the API rejects bad signatures and stale timestamps (replay
// protection, PRD §Security).

import { createHmac, timingSafeEqual } from "node:crypto";

/** How old a signed request may be before the API rejects it. */
export const MAX_SIGNATURE_AGE_MS = 5 * 60 * 1000;

/**
 * Canonical string that gets signed: `${timestampMs}.${body}` where `body` is
 * the exact JSON string sent over the wire. Signing the raw body (not a
 * re-serialized object) avoids key-ordering mismatches between client & server.
 */
export function canonicalString(timestampMs: number, body: string): string {
  return `${timestampMs}.${body}`;
}

export function sign(key: string, timestampMs: number, body: string): string {
  return createHmac("sha256", key)
    .update(canonicalString(timestampMs, body))
    .digest("hex");
}

export interface VerifyResult {
  ok: boolean;
  reason?: "bad_signature" | "stale" | "future";
}

export function verify(
  key: string,
  timestampMs: number,
  body: string,
  signature: string,
  opts: { maxAgeMs?: number; now?: number } = {},
): VerifyResult {
  const now = opts.now ?? Date.now();
  const maxAge = opts.maxAgeMs ?? MAX_SIGNATURE_AGE_MS;

  const age = now - timestampMs;
  // Allow a little clock skew into the future.
  if (age < -maxAge) return { ok: false, reason: "future" };
  if (age > maxAge) return { ok: false, reason: "stale" };

  const expected = sign(key, timestampMs, body);
  if (!safeEqualHex(expected, signature)) {
    return { ok: false, reason: "bad_signature" };
  }
  return { ok: true };
}

function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}
