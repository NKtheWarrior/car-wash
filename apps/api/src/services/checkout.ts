// Checkout creation: allocate a unique amount (paise) so one UPI credit maps to
// exactly one customer, and build the UPI pay link (PRD §Payments).

import { prisma, CheckoutState, SETTING_KEYS, type Plan, type Bay } from "@car-wash/db";
import { allocateUniqueAmount, buildUpiLink } from "@car-wash/shared";
import { getNumber } from "../lib/settings.js";
import { recordEvent } from "../lib/events.js";

export class CheckoutError extends Error {
  constructor(public code: string, message?: string) {
    super(message ?? code);
  }
}

export interface CheckoutResult {
  checkoutId: string;
  amountPaise: number;
  upiLink: string;
  expiresAt: number;
}

export async function createCheckout(bay: Bay, plan: Plan, cookieId: string): Promise<CheckoutResult> {
  const station = await prisma.station.findUnique({ where: { id: bay.stationId } });
  if (!station) throw new CheckoutError("station_not_found");

  const windowSec = getNumber(bay.stationId, SETTING_KEYS.checkoutMatchWindowSec, 300);
  const now = Date.now();

  // Amounts currently reserved by live checkouts for this station's bays.
  const live = await prisma.checkout.findMany({
    where: {
      state: { in: [CheckoutState.awaiting, CheckoutState.pending] },
      expiresAt: { gt: new Date(now) },
      bay: { stationId: bay.stationId },
    },
    select: { amountPaise: true },
  });

  const amountPaise = allocateUniqueAmount(plan.pricePaise, live.map((c) => c.amountPaise));
  if (amountPaise === null) throw new CheckoutError("no_unique_amount", "Too many checkouts in progress; try again shortly");

  const checkout = await prisma.checkout.create({
    data: {
      bayId: bay.id,
      planId: plan.id,
      cookieId,
      amountPaise,
      state: CheckoutState.awaiting,
      expiresAt: new Date(now + windowSec * 1000),
    },
  });

  const upiLink = buildUpiLink({
    payeeVpa: station.ownerVpa,
    payeeName: station.payeeName,
    amountPaise,
    note: checkout.id,
  });

  await recordEvent("checkout_created", {
    bayId: bay.id,
    data: { checkoutId: checkout.id, amountPaise, planId: plan.id, cookieId },
  });

  return { checkoutId: checkout.id, amountPaise, upiLink, expiresAt: checkout.expiresAt.getTime() };
}

/** Expire awaiting checkouts past their window (keeps unique amounts freed up). */
export function startCheckoutExpiry(tickMs = 10_000): NodeJS.Timeout {
  const tick = async () => {
    await prisma.checkout.updateMany({
      where: { state: CheckoutState.awaiting, expiresAt: { lt: new Date() } },
      data: { state: CheckoutState.expired },
    });
  };
  return setInterval(() => void tick(), tickMs);
}
