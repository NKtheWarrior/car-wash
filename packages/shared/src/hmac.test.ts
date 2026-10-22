import { describe, expect, it } from "vitest";
import { MAX_SIGNATURE_AGE_MS, sign, verify } from "./hmac.js";

describe("hmac", () => {
  const key = "test-signing-key";
  const body = JSON.stringify({ amountPaise: 5003, upiRef: "ABC123" });

  it("verifies a freshly signed request", () => {
    const ts = Date.now();
    const sig = sign(key, ts, body);
    expect(verify(key, ts, body, sig)).toEqual({ ok: true });
  });

  it("rejects a tampered body", () => {
    const ts = Date.now();
    const sig = sign(key, ts, body);
    const res = verify(key, ts, '{"amountPaise":9999}', sig);
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("bad_signature");
  });

  it("rejects the wrong key", () => {
    const ts = Date.now();
    const sig = sign(key, ts, body);
    expect(verify("other-key", ts, body, sig).ok).toBe(false);
  });

  it("rejects stale timestamps (replay protection)", () => {
    const ts = Date.now() - MAX_SIGNATURE_AGE_MS - 1000;
    const sig = sign(key, ts, body);
    const res = verify(key, ts, body, sig);
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("stale");
  });

  it("rejects timestamps too far in the future", () => {
    const ts = Date.now() + MAX_SIGNATURE_AGE_MS + 1000;
    const sig = sign(key, ts, body);
    expect(verify(key, ts, body, sig).reason).toBe("future");
  });
});
