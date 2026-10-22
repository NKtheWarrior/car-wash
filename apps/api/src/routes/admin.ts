// Owner/admin endpoints (JWT-protected via per-route requireAuth). These back
// the web admin pages and, later, the Android dashboard.

import { randomBytes } from "node:crypto";
import {
  prisma,
  DeviceRole,
  PaymentState,
  SETTING_KEYS,
  DEFAULT_SETTINGS,
} from "@car-wash/db";
import { planInputSchema, settingUpdateSchema, stationPayoutSchema } from "@car-wash/shared";
import { Router } from "express";
import { env } from "../env.js";
import { requireAuth } from "../lib/auth.js";
import { refreshSettings } from "../lib/settings.js";
import { computeRemainingSec, endActiveSession } from "../services/session.js";
import { confirmPayment, rejectPayment } from "../services/payment.js";
import { computeStats } from "../services/stats.js";

export const adminRouter: Router = Router();

async function primaryStationId(): Promise<string> {
  const s = await prisma.station.findFirst({ orderBy: { createdAt: "asc" } });
  if (!s) throw new Error("no_station");
  return s.id;
}

// ---- Payments ----------------------------------------------------------------

adminRouter.get("/admin/payments", requireAuth, async (req, res) => {
  const state = typeof req.query.state === "string" ? (req.query.state as PaymentState) : undefined;
  const payments = await prisma.payment.findMany({
    where: state ? { state } : {},
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { checkout: { include: { plan: true, bay: true } } },
  });
  res.json(payments);
});

adminRouter.post("/admin/payments/:id/confirm", requireAuth, async (req, res) => {
  try {
    res.json(await confirmPayment(req.params.id!, req.body?.checkoutId));
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

adminRouter.post("/admin/payments/:id/reject", requireAuth, async (req, res) => {
  try {
    await rejectPayment(req.params.id!);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

adminRouter.get("/admin/checkouts", requireAuth, async (_req, res) => {
  const checkouts = await prisma.checkout.findMany({
    where: { state: { in: ["awaiting", "pending"] } },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { plan: true, bay: true },
  });
  res.json(checkouts);
});

// ---- Bays (live) -------------------------------------------------------------

adminRouter.get("/admin/bays", requireAuth, async (_req, res) => {
  const bays = await prisma.bay.findMany({ orderBy: { createdAt: "asc" } });
  const result = await Promise.all(
    bays.map(async (bay) => {
      const session = await prisma.session.findFirst({
        where: { bayId: bay.id, state: { in: ["running", "paused"] } },
        include: { plan: true },
      });
      const lastReading = await prisma.reading.findFirst({
        where: { bayId: bay.id },
        orderBy: { createdAt: "desc" },
      });
      return {
        id: bay.id,
        name: bay.name,
        status: bay.status,
        online: bay.online,
        lastHeartbeatAt: bay.lastHeartbeatAt,
        scanUrl: bay.currentToken ? `${env.WEB_PUBLIC_URL}/b/${bay.id}?t=${bay.currentToken}` : null,
        mains: lastReading?.mains ?? null,
        batteryMv: lastReading?.batteryMv ?? null,
        session: session
          ? {
              id: session.id,
              planName: session.plan.name,
              state: session.state,
              remainingSec: computeRemainingSec(session),
            }
          : null,
      };
    }),
  );
  res.json(result);
});

adminRouter.post("/admin/bays/:id/stop", requireAuth, async (req, res) => {
  const stopped = await endActiveSession(req.params.id!, "remote_stop");
  res.json({ stopped });
});

// ---- Plans -------------------------------------------------------------------

adminRouter.get("/admin/plans", requireAuth, async (_req, res) => {
  const plans = await prisma.plan.findMany({ orderBy: [{ vehicleType: "asc" }, { durationSec: "asc" }] });
  res.json(plans);
});

adminRouter.post("/admin/plans", requireAuth, async (req, res) => {
  const parsed = planInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
    return;
  }
  const plan = await prisma.plan.create({ data: { ...parsed.data, stationId: await primaryStationId() } });
  res.status(201).json(plan);
});

adminRouter.put("/admin/plans/:id", requireAuth, async (req, res) => {
  const parsed = planInputSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body" });
    return;
  }
  const plan = await prisma.plan.update({ where: { id: req.params.id }, data: parsed.data });
  res.json(plan);
});

adminRouter.delete("/admin/plans/:id", requireAuth, async (req, res) => {
  await prisma.plan.update({ where: { id: req.params.id }, data: { active: false } });
  res.json({ ok: true });
});

// ---- Settings ----------------------------------------------------------------

adminRouter.get("/admin/settings", requireAuth, async (_req, res) => {
  const stationId = await primaryStationId();
  const rows = await prisma.setting.findMany({ where: { stationId } });
  const map: Record<string, string> = { ...DEFAULT_SETTINGS };
  for (const r of rows) map[r.key] = r.value;
  res.json({ keys: SETTING_KEYS, values: map });
});

adminRouter.put("/admin/settings", requireAuth, async (req, res) => {
  const parsed = settingUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body" });
    return;
  }
  const stationId = await primaryStationId();
  await prisma.setting.upsert({
    where: { stationId_key: { stationId, key: parsed.data.key } },
    update: { value: parsed.data.value },
    create: { stationId, key: parsed.data.key, value: parsed.data.value },
  });
  await refreshSettings(stationId);
  res.json({ ok: true });
});

// ---- Station / payout --------------------------------------------------------

// The UPI account every customer payment is sent to (shown on the pay QR).
adminRouter.get("/admin/station", requireAuth, async (_req, res) => {
  const stationId = await primaryStationId();
  const station = await prisma.station.findUnique({ where: { id: stationId } });
  if (!station) {
    res.status(404).json({ error: "no_station" });
    return;
  }
  res.json({ id: station.id, name: station.name, ownerVpa: station.ownerVpa, payeeName: station.payeeName });
});

adminRouter.put("/admin/station", requireAuth, async (req, res) => {
  const parsed = stationPayoutSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "invalid_body" });
    return;
  }
  const stationId = await primaryStationId();
  const station = await prisma.station.update({
    where: { id: stationId },
    data: { ownerVpa: parsed.data.ownerVpa, payeeName: parsed.data.payeeName },
  });
  res.json({ id: station.id, name: station.name, ownerVpa: station.ownerVpa, payeeName: station.payeeName });
});

// ---- Issues ------------------------------------------------------------------

adminRouter.get("/admin/issues", requireAuth, async (_req, res) => {
  const issues = await prisma.issue.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  res.json(issues);
});

adminRouter.post("/admin/issues/:id/resolve", requireAuth, async (req, res) => {
  const issue = await prisma.issue.update({ where: { id: req.params.id }, data: { status: "resolved" } });
  res.json(issue);
});

// ---- Pairing / devices -------------------------------------------------------

// Create a device + signing key; the admin shows the returned payload as a QR
// the Android app scans once to pair (PRD §Payments pairing).
adminRouter.post("/admin/pairing", requireAuth, async (req, res) => {
  const name = typeof req.body?.name === "string" && req.body.name ? req.body.name : "Listener phone";
  const role = req.body?.role === "dashboard" ? DeviceRole.dashboard : DeviceRole.listener;
  const signingKey = randomBytes(32).toString("hex");
  const device = await prisma.device.create({ data: { name, role, signingKey } });
  res.status(201).json({
    pairing: { deviceId: device.id, signingKey, apiUrl: env.API_PUBLIC_URL },
    device: { id: device.id, name: device.name, role: device.role },
  });
});

adminRouter.get("/admin/devices", requireAuth, async (_req, res) => {
  const devices = await prisma.device.findMany({ orderBy: { createdAt: "desc" } });
  res.json(
    devices.map((d) => ({
      id: d.id,
      name: d.name,
      role: d.role,
      revoked: d.revoked,
      lastHeartbeatAt: d.lastHeartbeatAt,
    })),
  );
});

adminRouter.post("/admin/devices/:id/revoke", requireAuth, async (req, res) => {
  await prisma.device.update({ where: { id: req.params.id }, data: { revoked: true } });
  res.json({ ok: true });
});

// ---- Stats -------------------------------------------------------------------

adminRouter.get("/admin/stats", requireAuth, async (_req, res) => {
  res.json(await computeStats(await primaryStationId()));
});
