// Unique per-checkout amounts. Each checkout gets a unique amount in paise
// (e.g. ₹50.03) for a configurable window, so one UPI credit notification maps
// to exactly one customer even when several pay at once (PRD §Payments).

/** Largest paise offset we add to the base price (keeps it under one rupee). */
export const MAX_AMOUNT_OFFSET_PAISE = 99;

/**
 * Pick a unique amount (in paise) for a new checkout: base price + a small
 * offset not currently in use by another live checkout.
 *
 * @param basePaise   the plan price in paise
 * @param takenAmounts amounts already reserved by live checkouts
 * @returns a unique amount in paise, or null if every offset is taken
 */
export function allocateUniqueAmount(
  basePaise: number,
  takenAmounts: Iterable<number>,
  maxOffset: number = MAX_AMOUNT_OFFSET_PAISE,
): number | null {
  const taken = new Set(takenAmounts);
  // Randomised start so concurrent checkouts don't all probe offset 1 first.
  const start = 1 + Math.floor(Math.random() * maxOffset);
  for (let i = 0; i <= maxOffset; i++) {
    const offset = ((start - 1 + i) % maxOffset) + 1;
    const candidate = basePaise + offset;
    if (!taken.has(candidate)) return candidate;
  }
  // Fall back to the exact base price if no offset is free.
  return taken.has(basePaise) ? null : basePaise;
}

/** Format paise as rupees for display, e.g. 5003 -> "50.03". */
export function paiseToRupeeString(paise: number): string {
  const sign = paise < 0 ? "-" : "";
  const abs = Math.abs(paise);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

/** Format paise as a display amount with the rupee symbol, e.g. "₹50.03". */
export function formatPaise(paise: number): string {
  return `₹${paiseToRupeeString(paise)}`;
}

/** Parse a rupee string like "50.03" or "₹50.03" into integer paise. */
export function rupeeStringToPaise(input: string): number | null {
  const cleaned = input.replace(/[₹,\s]/g, "");
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(cleaned);
  if (!m) return null;
  const rupees = Number(m[1]);
  const paisePart = m[2] ? Number(m[2].padEnd(2, "0")) : 0;
  return rupees * 100 + paisePart;
}
