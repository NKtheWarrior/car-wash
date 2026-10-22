// Zod schemas for API request bodies, shared so the API validates and clients
// can reuse the inferred types.

import { z } from "zod";

/** Customer starts a checkout for a plan on a bay. */
export const createCheckoutSchema = z.object({
  planId: z.string().min(1),
});
export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>;

/**
 * A payment observation posted by the Android listener (and by the dev mock).
 * This is the signed body; the signature + timestamp travel in headers.
 */
export const observationSchema = z.object({
  amountPaise: z.number().int().positive(),
  upiRef: z.string().min(1),
  senderVpa: z.string().optional(),
  observedAt: z.string().datetime(),
  rawText: z.string().optional(),
  packageName: z.string().min(1),
});
export type ObservationInput = z.infer<typeof observationSchema>;

/** Listener heartbeat body (signed). */
export const listenerHeartbeatSchema = z.object({
  ts: z.number().int(),
});
export type ListenerHeartbeatInput = z.infer<typeof listenerHeartbeatSchema>;

/** Android claims a one-time pairing code issued by the admin. */
export const pairingClaimSchema = z.object({
  pairingCode: z.string().min(1),
  deviceName: z.string().min(1),
  role: z.enum(["listener", "dashboard"]).default("listener"),
});
export type PairingClaimInput = z.infer<typeof pairingClaimSchema>;

/** Customer reports a problem. */
export const issueSchema = z.object({
  kind: z.string().min(1),
  description: z.string().min(1).max(2000),
  contact: z.string().max(200).optional(),
  sessionId: z.string().optional(),
  bayId: z.string().optional(),
});
export type IssueInput = z.infer<typeof issueSchema>;

/** Owner login. */
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

/** Admin: create/update a plan. */
export const planInputSchema = z.object({
  name: z.string().min(1),
  vehicleType: z.enum(["bike", "car"]),
  durationSec: z.number().int().positive(),
  pricePaise: z.number().int().positive(),
  active: z.boolean().default(true),
});
export type PlanInput = z.infer<typeof planInputSchema>;

/** Admin: update a single setting. */
export const settingUpdateSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
});
export type SettingUpdateInput = z.infer<typeof settingUpdateSchema>;

/** A UPI VPA, e.g. "owner@okhdfcbank". Lenient on the handle, strict on shape. */
export const vpaSchema = z
  .string()
  .trim()
  .regex(/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z][a-zA-Z0-9.\-_]{1,63}$/, "invalid_vpa");

/** Admin: set the payout account the customer UPI link pays into. */
export const stationPayoutSchema = z.object({
  ownerVpa: vpaSchema,
  payeeName: z.string().trim().min(1).max(100),
});
export type StationPayoutInput = z.infer<typeof stationPayoutSchema>;
