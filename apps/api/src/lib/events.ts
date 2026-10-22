// Helper to record a domain Event (audit trail + source for owner insights).

import { Prisma, prisma } from "@car-wash/db";
import { publishBay } from "./sse.js";

export async function recordEvent(
  type: string,
  opts: { bayId?: string; data?: Record<string, unknown> } = {},
): Promise<void> {
  await prisma.event.create({
    data: {
      type,
      bayId: opts.bayId,
      data: (opts.data ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
  if (opts.bayId) publishBay(opts.bayId, "event", { type, ...opts.data });
}
