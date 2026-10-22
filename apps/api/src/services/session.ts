// Session lifecycle + server-authoritative timer engine.
//
// The server runs the countdown (the ESP32 also counts locally and persists to
// flash, but the API is the source of truth). `startedAt` marks the start of the
// current running segment and `remainingSec` the time left at that moment, so
// endsAt = startedAt + remainingSec and the state is fully recoverable after a
// restart.

import { prisma, BayStatus, SessionState, SETTING_KEYS, type Session } from "@car-wash/db";
import { buildCommand } from "@car-wash/shared";
import { recordEvent } from "../lib/events.js";
import { getNumber } from "../lib/settings.js";
import { publishBay } from "../lib/sse.js";
import { publishCommand } from "../mqtt/client.js";
import { rotateToken } from "./token.js";

const endTimers = new Map<string, NodeJS.Timeout>();
const pauseTimers = new Map<string, NodeJS.Timeout>();
const pauseStartedAt = new Map<string, number>();

export class SessionError extends Error {
  constructor(public code: string, message?: string) {
    super(message ?? code);
  }
}

export function computeRemainingSec(session: Pick<Session, "state" | "startedAt" | "remainingSec">): number {
  if (session.state === SessionState.running && session.startedAt) {
    const endsAt = session.startedAt.getTime() + session.remainingSec * 1000;
    return Math.max(0, Math.round((endsAt - Date.now()) / 1000));
  }
  if (session.state === SessionState.paused) return session.remainingSec;
  return 0;
}

function clearTimers(sessionId: string): void {
  const e = endTimers.get(sessionId);
  if (e) clearTimeout(e);
  endTimers.delete(sessionId);
  const p = pauseTimers.get(sessionId);
  if (p) clearTimeout(p);
  pauseTimers.delete(sessionId);
  pauseStartedAt.delete(sessionId);
}

function scheduleEnd(sessionId: string, remainingSec: number): void {
  const existing = endTimers.get(sessionId);
  if (existing) clearTimeout(existing);
  const t = setTimeout(() => void endSession(sessionId, "timer"), Math.max(0, remainingSec * 1000));
  endTimers.set(sessionId, t);
}

async function broadcast(session: Session, extra: Record<string, unknown> = {}): Promise<void> {
  publishBay(session.bayId, "session", {
    sessionId: session.id,
    bayId: session.bayId,
    state: session.state,
    remainingSec: computeRemainingSec(session),
    ...extra,
  });
}

/** Create and start a running session (called after a payment matches). */
export async function startSession(opts: {
  bayId: string;
  planId: string;
  cookieId: string;
  checkoutId?: string;
}): Promise<Session> {
  const plan = await prisma.plan.findUnique({ where: { id: opts.planId } });
  if (!plan) throw new SessionError("plan_not_found");

  const session = await prisma.session.create({
    data: {
      bayId: opts.bayId,
      planId: opts.planId,
      cookieId: opts.cookieId,
      state: SessionState.running,
      startedAt: new Date(),
      remainingSec: plan.durationSec,
    },
  });

  if (opts.checkoutId) {
    await prisma.checkout.update({
      where: { id: opts.checkoutId },
      data: { sessionId: session.id },
    });
  }

  await prisma.bay.update({ where: { id: opts.bayId }, data: { status: BayStatus.in_use } });
  publishCommand(opts.bayId, buildCommand("start", { durationSec: plan.durationSec, sessionId: session.id }));
  await recordEvent("session_started", { bayId: opts.bayId, data: { sessionId: session.id, planId: plan.id } });

  scheduleEnd(session.id, plan.durationSec);
  await broadcast(session);
  return session;
}

export async function pauseSession(sessionId: string, cookieId: string): Promise<Session> {
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) throw new SessionError("not_found");
  if (session.cookieId !== cookieId) throw new SessionError("forbidden");
  if (session.state !== SessionState.running) throw new SessionError("not_running");

  const remaining = computeRemainingSec(session);
  const updated = await prisma.session.update({
    where: { id: sessionId },
    data: { state: SessionState.paused, remainingSec: remaining },
  });

  clearTimers(sessionId);
  pauseStartedAt.set(sessionId, Date.now());

  // Enforce the pause limit: auto-resume once the allowance runs out.
  const limitSec = getNumber(session.bayId ? await stationIdForBay(session.bayId) : "", SETTING_KEYS.pauseLimitSec, 180);
  const allowanceSec = Math.max(0, limitSec - updated.pauseUsedSec);
  pauseTimers.set(
    sessionId,
    setTimeout(() => void resumeSession(sessionId, cookieId, true).catch(() => {}), allowanceSec * 1000),
  );

  await prisma.bay.update({ where: { id: session.bayId }, data: { status: BayStatus.paused } });
  publishCommand(session.bayId, buildCommand("pause", { sessionId }));
  await recordEvent("session_paused", { bayId: session.bayId, data: { sessionId } });
  await broadcast(updated, { pauseAllowanceSec: allowanceSec });
  return updated;
}

export async function resumeSession(sessionId: string, cookieId: string, auto = false): Promise<Session> {
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) throw new SessionError("not_found");
  if (!auto && session.cookieId !== cookieId) throw new SessionError("forbidden");
  if (session.state !== SessionState.paused) throw new SessionError("not_paused");

  const pausedAt = pauseStartedAt.get(sessionId) ?? Date.now();
  const pausedForSec = Math.round((Date.now() - pausedAt) / 1000);

  const updated = await prisma.session.update({
    where: { id: sessionId },
    data: {
      state: SessionState.running,
      startedAt: new Date(),
      pauseUsedSec: { increment: pausedForSec },
    },
  });

  clearTimers(sessionId);
  await prisma.bay.update({ where: { id: session.bayId }, data: { status: BayStatus.in_use } });
  publishCommand(session.bayId, buildCommand("resume", { durationSec: updated.remainingSec, sessionId }));
  await recordEvent(auto ? "session_resumed_auto" : "session_resumed", {
    bayId: session.bayId,
    data: { sessionId },
  });

  scheduleEnd(sessionId, updated.remainingSec);
  await broadcast(updated);
  return updated;
}

export async function endSession(sessionId: string, reason: string): Promise<void> {
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session || session.state === SessionState.ended) {
    clearTimers(sessionId);
    return;
  }

  const ended = await prisma.session.update({
    where: { id: sessionId },
    data: { state: SessionState.ended, endedAt: new Date(), remainingSec: 0 },
  });

  clearTimers(sessionId);
  publishCommand(session.bayId, buildCommand("stop", { sessionId }));

  // Return the bay to ready if it's still online; a fresh QR appears.
  const bay = await prisma.bay.findUnique({ where: { id: session.bayId } });
  if (bay?.online) {
    await prisma.bay.update({ where: { id: bay.id }, data: { status: BayStatus.ready } });
    await rotateToken(bay.id);
  }

  await recordEvent("session_ended", { bayId: session.bayId, data: { sessionId, reason } });
  await broadcast(ended, { reason });
}

async function stationIdForBay(bayId: string): Promise<string> {
  const bay = await prisma.bay.findUnique({ where: { id: bayId }, select: { stationId: true } });
  return bay?.stationId ?? "";
}

/** Owner remote stop: end whatever session is live on a bay. */
export async function endActiveSession(bayId: string, reason = "remote_stop"): Promise<boolean> {
  const active = await prisma.session.findFirst({
    where: { bayId, state: { in: [SessionState.running, SessionState.paused] } },
  });
  if (!active) return false;
  await endSession(active.id, reason);
  return true;
}

/** Reschedule timers for live sessions after an API restart. */
export async function recoverSessions(): Promise<void> {
  const live = await prisma.session.findMany({
    where: { state: { in: [SessionState.running, SessionState.paused] } },
  });
  for (const s of live) {
    if (s.state === SessionState.running) {
      const remaining = computeRemainingSec(s);
      if (remaining <= 0) await endSession(s.id, "recovered_expired");
      else scheduleEnd(s.id, remaining);
    } else {
      // Paused: restart the pause allowance from now (lost the exact pause start).
      pauseStartedAt.set(s.id, Date.now());
      const limitSec = getNumber(await stationIdForBay(s.bayId), SETTING_KEYS.pauseLimitSec, 180);
      const allowanceSec = Math.max(0, limitSec - s.pauseUsedSec);
      pauseTimers.set(
        s.id,
        setTimeout(() => void resumeSession(s.id, s.cookieId, true).catch(() => {}), allowanceSec * 1000),
      );
    }
  }
  if (live.length) console.log(`♻️  Recovered ${live.length} live session(s)`);
}
