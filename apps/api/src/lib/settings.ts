// Reads tunable settings from the DB (Setting table) with an in-memory cache,
// falling back to the seeded defaults. Nothing business-related is hard-coded.

import { DEFAULT_SETTINGS, prisma } from "@car-wash/db";

type StationSettings = Record<string, string>;

const cache = new Map<string, StationSettings>();

export async function refreshSettings(stationId?: string): Promise<void> {
  const where = stationId ? { stationId } : {};
  const rows = await prisma.setting.findMany({ where });
  if (stationId) cache.delete(stationId);
  const grouped = new Map<string, StationSettings>();
  for (const r of rows) {
    const s = grouped.get(r.stationId) ?? {};
    s[r.key] = r.value;
    grouped.set(r.stationId, s);
  }
  for (const [sid, s] of grouped) cache.set(sid, s);
}

function raw(stationId: string, key: string): string | undefined {
  return cache.get(stationId)?.[key] ?? DEFAULT_SETTINGS[key];
}

export function getString(stationId: string, key: string, fallback = ""): string {
  return raw(stationId, key) ?? fallback;
}

export function getNumber(stationId: string, key: string, fallback = 0): number {
  const v = raw(stationId, key);
  if (v === undefined || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** Start periodic refresh so admin edits propagate without a restart. */
export function startSettingsRefresh(intervalMs = 15_000): NodeJS.Timeout {
  return setInterval(() => {
    refreshSettings().catch((e) => console.error("settings refresh failed", e));
  }, intervalMs);
}
