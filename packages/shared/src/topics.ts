// MQTT topic layout. Each bay lives on its own topics so a bay may only use
// its own (PRD §Security). Only the API publishes to `cmd`; devices publish to
// `status`.

export const topics = {
  /** API -> device: motor commands. */
  cmd: (bayId: string) => `wash/${bayId}/cmd`,
  /** device -> API: status snapshots and heartbeats. */
  status: (bayId: string) => `wash/${bayId}/status`,
  /** API -> device (retained): current QR token + scan URL to render. */
  token: (bayId: string) => `wash/${bayId}/token`,
  /** Wildcard the API subscribes to for all bays' status. */
  allStatus: () => `wash/+/status`,
} as const;

/** Extract the bayId from a `wash/{bayId}/status` topic, or null if it doesn't match. */
export function bayIdFromStatusTopic(topic: string): string | null {
  const m = /^wash\/([^/]+)\/status$/.exec(topic);
  return m ? m[1]! : null;
}
