// UPI deep link / QR content. Opens the customer's UPI app with the amount
// pre-filled (PRD §Payments).

import { paiseToRupeeString } from "./amount.js";

export interface UpiLinkParams {
  /** Owner VPA, e.g. "owner@upi". */
  payeeVpa: string;
  /** Payee display name. */
  payeeName: string;
  /** Amount in paise (unique per checkout). */
  amountPaise: number;
  /** Transaction note — we use the checkout id. */
  note: string;
}

export function buildUpiLink({ payeeVpa, payeeName, amountPaise, note }: UpiLinkParams): string {
  const params = new URLSearchParams({
    pa: payeeVpa,
    pn: payeeName,
    am: paiseToRupeeString(amountPaise),
    cu: "INR",
    tn: note,
  });
  return `upi://pay?${params.toString()}`;
}
