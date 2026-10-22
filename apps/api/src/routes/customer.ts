// Customer-facing endpoints: scan landing, checkout, checkout status, session
// view + control, and issue reporting. No login — control via session cookie.

import { prisma, BayStatus, SessionState } from "@car-wash/db";
import { createCheckoutSchema, issueSchema } from "@car-wash/shared";
import { Router } from "express";
import { getCookieId, getOrCreateCookieId } from "../lib/cookies.js";
import { recordEvent } from "../lib/events.js";
import { isBayReady } from "../services/bay.js";
import { CheckoutError, createCheckout } from "../services/checkout.js";
import {
  computeRemainingSec,
  pauseSession,
  resumeSession,
  SessionError,
} from "../services/session.js";
import { isTokenValid } from "../services/token.js";

export const customerRouter: Router = Router();

function sessionView(s: {
  id: string;
  bayId: string;
  planId: string;
  state: SessionState;
  startedAt: Date | null;
  remainingSec: number;
  pauseUsedSec: number;
}) {
  return {
    id: s.id,
    bayId: s.bayId,
    planId: s.planId,
    state: s.state,
    remainingSec: computeRemainingSec(s),
    pauseUsedSec: s.pauseUsedSec,
  };
}

// Scan landing: what should the customer see for this bay right now?
customerRouter.get("/b/:bayId", async (req, res) => {
  const { bayId } = req.params;
  const token = typeof req.query.t === "string" ? req.query.t : "";
  const bay = await prisma.bay.findUnique({ where: { id: bayId } });
  if (!bay) {
    res.status(404).json({ state: "not_found" });
    return;
  }

  // Restore control if this browser already owns a live session on this bay.
  const cookieId = getCookieId(req);
  if (cookieId) {
    const mine = await prisma.session.findFirst({
      where: {
        bayId,
        cookieId,
        state: { in: [SessionState.running, SessionState.paused] },
      },
    });
    if (mine) {
      res.json({ state: "in_session", session: sessionView(mine) });
      return;
    }
  }

  if (!isBayReady(bay)) {
    res.json({
      state: "out_of_service",
      reason: bay.online ? bay.status : "offline",
    });
    return;
  }

  // Ready but busy with someone else's session -> waiting page.
  const active = await prisma.session.findFirst({
    where: { bayId, state: { in: [SessionState.running, SessionState.paused] } },
  });
  if (active || bay.status !== BayStatus.ready) {
    res.json({
      state: "busy",
      remainingSec: active ? computeRemainingSec(active) : null,
    });
    return;
  }

  if (!isTokenValid(bay, token)) {
    res.json({ state: "invalid_token" });
    return;
  }

  const plans = await prisma.plan.findMany({
    where: { stationId: bay.stationId, active: true },
    orderBy: [{ vehicleType: "asc" }, { durationSec: "asc" }],
  });
  res.json({
    state: "ready",
    bay: { id: bay.id, name: bay.name },
    plans: plans.map((p) => ({
      id: p.id,
      name: p.name,
      vehicleType: p.vehicleType,
      durationSec: p.durationSec,
      pricePaise: p.pricePaise,
    })),
  });
});

// Create a checkout for a plan: returns the unique amount + UPI link.
customerRouter.post("/b/:bayId/checkout", async (req, res) => {
  const parsed = createCheckoutSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
    return;
  }

  const bay = await prisma.bay.findUnique({ where: { id: req.params.bayId } });
  if (!bay) {
    res.status(404).json({ error: "bay_not_found" });
    return;
  }
  if (!isBayReady(bay)) {
    res.status(409).json({ error: "bay_not_ready" });
    return;
  }

  const plan = await prisma.plan.findFirst({
    where: { id: parsed.data.planId, stationId: bay.stationId, active: true },
  });
  if (!plan) {
    res.status(404).json({ error: "plan_not_found" });
    return;
  }

  const cookieId = getOrCreateCookieId(req, res);
  try {
    const result = await createCheckout(bay, plan, cookieId);
    res.json(result);
  } catch (e) {
    if (e instanceof CheckoutError) {
      res.status(409).json({ error: e.code, message: e.message });
      return;
    }
    throw e;
  }
});

// Poll checkout status (web waits here until the payment matches).
customerRouter.get("/checkout/:id", async (req, res) => {
  const checkout = await prisma.checkout.findUnique({
    where: { id: req.params.id },
    include: { session: true },
  });
  if (!checkout) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json({
    id: checkout.id,
    state: checkout.state,
    amountPaise: checkout.amountPaise,
    sessionId: checkout.sessionId,
    session: checkout.session ? sessionView(checkout.session) : null,
  });
});

// View a session (live page).
customerRouter.get("/session/:id", async (req, res) => {
  const session = await prisma.session.findUnique({ where: { id: req.params.id } });
  if (!session) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  const cookieId = getCookieId(req);
  res.json({ ...sessionView(session), controllable: cookieId === session.cookieId });
});

// Pause / resume — only the controlling browser (cookie) may do this.
for (const action of ["pause", "resume"] as const) {
  customerRouter.post(`/session/:id/${action}`, async (req, res) => {
    const cookieId = getCookieId(req) ?? "";
    try {
      const fn = action === "pause" ? pauseSession : resumeSession;
      const session = await fn(req.params.id, cookieId);
      res.json(sessionView(session));
    } catch (e) {
      if (e instanceof SessionError) {
        const status = e.code === "forbidden" ? 403 : e.code === "not_found" ? 404 : 409;
        res.status(status).json({ error: e.code });
        return;
      }
      throw e;
    }
  });
}

// Report an issue (payment or service problem).
customerRouter.post("/issue", async (req, res) => {
  const parsed = issueSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
    return;
  }
  const issue = await prisma.issue.create({ data: parsed.data });
  await recordEvent("issue_reported", {
    bayId: parsed.data.bayId,
    data: { issueId: issue.id, kind: issue.kind },
  });
  res.status(201).json({ id: issue.id, status: issue.status });
});
