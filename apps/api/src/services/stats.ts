// Owner insights computed from real data (payments, sessions, events). Kept
// intentionally simple; richer rollups can come later.

import { prisma, PaymentState, SessionState } from "@car-wash/db";

function since(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export async function computeStats(stationId: string) {
  const [payments, endedSessions, bays, offlineEvents] = await Promise.all([
    prisma.payment.findMany({
      where: { state: PaymentState.matched, checkout: { bay: { stationId } } },
      include: { checkout: { include: { plan: true } } },
    }),
    prisma.session.findMany({
      where: { state: SessionState.ended, bay: { stationId } },
      include: { plan: true },
    }),
    prisma.bay.findMany({ where: { stationId } }),
    prisma.event.count({ where: { type: "bay_offline", createdAt: { gt: since(1) } } }),
  ]);

  const dayAgo = since(1).getTime();
  const weekAgo = since(7).getTime();
  const monthAgo = since(30).getTime();

  const earnings = { today: 0, week: 0, month: 0 };
  const byPlan: Record<string, { name: string; paise: number; count: number }> = {};
  for (const p of payments) {
    const t = p.createdAt.getTime();
    if (t > dayAgo) earnings.today += p.amountPaise;
    if (t > weekAgo) earnings.week += p.amountPaise;
    if (t > monthAgo) earnings.month += p.amountPaise;
    const plan = p.checkout?.plan;
    if (plan && t > monthAgo) {
      const e = byPlan[plan.id] ?? { name: plan.name, paise: 0, count: 0 };
      e.paise += p.amountPaise;
      e.count += 1;
      byPlan[plan.id] = e;
    }
  }

  // Usage.
  const sessionCount = endedSessions.length;
  const avgDurationSec =
    sessionCount === 0
      ? 0
      : Math.round(endedSessions.reduce((a, s) => a + s.plan.durationSec, 0) / sessionCount);

  const peakHours = new Array(24).fill(0) as number[];
  const planCounts: Record<string, { name: string; count: number }> = {};
  let motorRuntimeSec = 0;
  for (const s of endedSessions) {
    if (s.startedAt) {
      const h = s.startedAt.getHours();
      peakHours[h] = (peakHours[h] ?? 0) + 1;
    }
    motorRuntimeSec += s.plan.durationSec;
    const e = planCounts[s.planId] ?? { name: s.plan.name, count: 0 };
    e.count += 1;
    planCounts[s.planId] = e;
  }
  const popularPlan = Object.values(planCounts).sort((a, b) => b.count - a.count)[0] ?? null;

  // Health.
  const onlineBays = bays.filter((b) => b.online).length;

  return {
    earnings,
    earningsByPlan: Object.values(byPlan),
    usage: {
      sessionCount,
      avgDurationSec,
      peakHours,
      popularPlan,
    },
    health: {
      baysOnline: onlineBays,
      baysTotal: bays.length,
      motorRuntimeHours: Math.round((motorRuntimeSec / 3600) * 10) / 10,
      outages24h: offlineEvents,
    },
  };
}
