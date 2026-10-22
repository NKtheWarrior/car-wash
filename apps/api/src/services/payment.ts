// Payment matching engine. An observed UPI credit is matched to a live checkout
// by its unique amount; duplicates (same UPI reference) are ignored; anything
// unmatched goes to the owner's pending list to confirm or reject.

import { randomUUID } from "node:crypto";
import { prisma, CheckoutState, PaymentState, type Device } from "@car-wash/db";
import type { ObservationInput } from "@car-wash/shared";
import { recordEvent } from "../lib/events.js";
import { publishAdmin } from "../lib/sse.js";
import { isBayReady } from "./bay.js";
import { startSession } from "./session.js";

export type ObservationStatus =
  | "duplicate"
  | "matched"
  | "matched_bay_unavailable"
  | "unmatched";

export interface ObservationResult {
  status: ObservationStatus;
  paymentId: string;
  sessionId?: string;
}

export async function processObservation(
  device: Device,
  obs: ObservationInput,
): Promise<ObservationResult> {
  // Duplicate: same UPI reference already seen (notification + SMS count once).
  const existing = await prisma.payment.findUnique({ where: { upiRef: obs.upiRef } });
  if (existing) {
    return { status: "duplicate", paymentId: existing.id };
  }

  const payment = await prisma.payment.create({
    data: {
      deviceId: device.id,
      amountPaise: obs.amountPaise,
      upiRef: obs.upiRef,
      senderVpa: obs.senderVpa ?? null,
      observedAt: new Date(obs.observedAt),
      rawText: obs.rawText ?? null,
      state: PaymentState.unmatched,
    },
  });

  // Match on the unique amount of a still-live checkout.
  const checkout = await prisma.checkout.findFirst({
    where: {
      state: CheckoutState.awaiting,
      expiresAt: { gt: new Date() },
      amountPaise: obs.amountPaise,
    },
    orderBy: { createdAt: "asc" },
    include: { bay: true, plan: true },
  });

  if (!checkout) {
    await prisma.payment.update({ where: { id: payment.id }, data: { state: PaymentState.pending } });
    await recordEvent("payment_unmatched", { data: { paymentId: payment.id, amountPaise: obs.amountPaise } });
    publishAdmin("payment", { paymentId: payment.id, status: "unmatched", amountPaise: obs.amountPaise });
    return { status: "unmatched", paymentId: payment.id };
  }

  return finalizeMatch(payment.id, checkout.id);
}

/** Links a payment to a checkout, marks both matched, and starts the session. */
async function finalizeMatch(paymentId: string, checkoutId: string): Promise<ObservationResult> {
  const checkout = await prisma.checkout.findUnique({
    where: { id: checkoutId },
    include: { bay: true },
  });
  if (!checkout) throw new Error("checkout_vanished");

  await prisma.$transaction([
    prisma.checkout.update({ where: { id: checkoutId }, data: { state: CheckoutState.matched } }),
    prisma.payment.update({
      where: { id: paymentId },
      data: { state: PaymentState.matched, checkoutId },
    }),
  ]);

  await recordEvent("payment_matched", {
    bayId: checkout.bayId,
    data: { paymentId, checkoutId, amountPaise: checkout.amountPaise },
  });
  publishAdmin("payment", { paymentId, status: "matched", checkoutId });

  // Bay offline after payment (edge case 12): keep the match, alert the owner,
  // don't start the motor.
  if (!isBayReady(checkout.bay)) {
    await recordEvent("payment_matched_bay_unavailable", { bayId: checkout.bayId, data: { paymentId } });
    return { status: "matched_bay_unavailable", paymentId };
  }

  const session = await startSession({
    bayId: checkout.bayId,
    planId: checkout.planId,
    cookieId: checkout.cookieId ?? randomUUID(),
    checkoutId,
  });
  return { status: "matched", paymentId, sessionId: session.id };
}

/** Owner confirms a pending payment, optionally linking it to a checkout. */
export async function confirmPayment(paymentId: string, checkoutId?: string): Promise<ObservationResult> {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw new Error("payment_not_found");

  const targetCheckoutId = checkoutId ?? payment.checkoutId;
  if (!targetCheckoutId) throw new Error("checkout_required");
  return finalizeMatch(paymentId, targetCheckoutId);
}

/** Owner rejects a pending payment (e.g. underpayment handled via refund). */
export async function rejectPayment(paymentId: string): Promise<void> {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw new Error("payment_not_found");
  await prisma.payment.update({ where: { id: paymentId }, data: { state: PaymentState.unmatched } });
  await recordEvent("payment_rejected", { data: { paymentId } });
}
