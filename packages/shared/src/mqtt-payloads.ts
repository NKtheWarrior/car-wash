// Payloads exchanged over MQTT between the API and a bay device.
//
// Every command carries a unique id and an expiry; the device ignores repeats
// and stale commands (PRD §Security).

import { randomUUID } from "node:crypto";

export type CommandType = "start" | "stop" | "pause" | "resume";

export interface Command {
  cmdId: string;
  type: CommandType;
  /** Epoch ms after which the device must ignore this command. */
  expiresAt: number;
  issuedAt: number;
  /** For `start`/`resume`: how long the motor should run, in seconds. */
  durationSec?: number;
  /** Session this command belongs to (telemetry/correlation). */
  sessionId?: string;
}

export function buildCommand(
  type: CommandType,
  opts: { ttlMs?: number; durationSec?: number; sessionId?: string } = {},
): Command {
  const now = Date.now();
  const ttl = opts.ttlMs ?? 15_000;
  return {
    cmdId: randomUUID(),
    type,
    issuedAt: now,
    expiresAt: now + ttl,
    durationSec: opts.durationSec,
    sessionId: opts.sessionId,
  };
}

/** Why the bay cannot run right now (drives the "out of service" screen). */
export type OutOfServiceReason =
  | "no_water"
  | "no_mains"
  | "motor_fault"
  | "stuck_relay"
  | "offline";

export type DeviceScreen =
  | "ready"
  | "in_use"
  | "paused"
  | "power_returned"
  | "out_of_service";

/** device -> API: periodic heartbeat + status snapshot. */
export interface StatusMessage {
  bayId: string;
  screen: DeviceScreen;
  motorOn: boolean;
  mains: boolean;
  /** Battery voltage in millivolts, if the device reports it. */
  batteryMv?: number;
  /** WiFi RSSI in dBm. */
  wifiRssi?: number;
  /** Remaining session time the device is counting down locally. */
  remainingSec?: number;
  outOfServiceReason?: OutOfServiceReason;
  /** Last command the device acted on (so the API can confirm delivery). */
  ackCmdId?: string;
  ts: number;
}
