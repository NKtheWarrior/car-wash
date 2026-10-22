// Server-Sent Events hub: one-directional live updates to browsers (customer
// countdown/status on a bay channel, and an admin channel for the dashboard).

import type { Response } from "express";

type Client = Response;

const bayClients = new Map<string, Set<Client>>();
const adminClients = new Set<Client>();

function writeEvent(res: Client, event: string, data: unknown): void {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function initStream(res: Client): void {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // disable nginx buffering
  res.flushHeaders?.();
  // Initial comment so the connection opens immediately.
  res.write(": connected\n\n");
}

export function addBayClient(bayId: string, res: Client): void {
  initStream(res);
  let set = bayClients.get(bayId);
  if (!set) {
    set = new Set();
    bayClients.set(bayId, set);
  }
  set.add(res);
  res.on("close", () => set!.delete(res));
}

export function addAdminClient(res: Client): void {
  initStream(res);
  adminClients.add(res);
  res.on("close", () => adminClients.delete(res));
}

export function publishBay(bayId: string, event: string, data: unknown): void {
  const set = bayClients.get(bayId);
  if (set) for (const res of set) writeEvent(res, event, data);
  // Mirror bay events to admin so the Live screen updates too.
  for (const res of adminClients) writeEvent(res, event, { bayId, ...(data as object) });
}

export function publishAdmin(event: string, data: unknown): void {
  for (const res of adminClients) writeEvent(res, event, data);
}

/** Keep-alive ping so proxies don't drop idle SSE connections. */
export function startSseHeartbeat(intervalMs = 25_000): NodeJS.Timeout {
  return setInterval(() => {
    for (const set of bayClients.values())
      for (const res of set) res.write(": ping\n\n");
    for (const res of adminClients) res.write(": ping\n\n");
  }, intervalMs);
}
