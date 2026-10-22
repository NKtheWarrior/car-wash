import { describe, expect, it } from "vitest";
import {
  allocateUniqueAmount,
  formatPaise,
  paiseToRupeeString,
  rupeeStringToPaise,
} from "./amount.js";

describe("allocateUniqueAmount", () => {
  it("returns an amount above the base price", () => {
    const amt = allocateUniqueAmount(5000, [])!;
    expect(amt).toBeGreaterThanOrEqual(5001);
    expect(amt).toBeLessThanOrEqual(5099);
  });

  it("never collides with a taken amount", () => {
    const taken = new Set<number>();
    for (let i = 0; i < 90; i++) {
      const amt = allocateUniqueAmount(5000, taken)!;
      expect(taken.has(amt)).toBe(false);
      taken.add(amt);
    }
  });

  it("returns null when every offset is exhausted", () => {
    const taken = new Set<number>();
    for (let o = 0; o <= 99; o++) taken.add(5000 + o);
    expect(allocateUniqueAmount(5000, taken)).toBeNull();
  });
});

describe("formatting", () => {
  it("formats paise to rupee strings", () => {
    expect(paiseToRupeeString(5003)).toBe("50.03");
    expect(paiseToRupeeString(5000)).toBe("50.00");
    expect(paiseToRupeeString(7)).toBe("0.07");
    expect(formatPaise(5003)).toBe("₹50.03");
  });

  it("parses rupee strings back to paise", () => {
    expect(rupeeStringToPaise("50.03")).toBe(5003);
    expect(rupeeStringToPaise("₹50")).toBe(5000);
    expect(rupeeStringToPaise("50.3")).toBe(5030);
    expect(rupeeStringToPaise("abc")).toBeNull();
  });
});
