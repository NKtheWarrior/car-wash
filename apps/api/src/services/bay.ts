// Bay readiness + offline detection. A bay is "ready" only when it is online
// and reporting the ready screen; payments are blocked otherwise (PRD §Bay
// device behaviour, edge cases 11/18).

import { prisma, type Bay, BayStatus, SETTING_KEYS } from "@car-wash/db";
import { recordEvent } from "../lib/events.js";
import { publishBay } from "../lib/sse.js";
import { getNumber } from "../lib/settings.js";

export function isBayReady(bay: Pick<Bay, "online" | "status">): boolean {
  return bay.online && bay.status === BayStatus.ready;
}

/** Marks bays offline when their heartbeat goes stale. */
export function startOfflineWatchdog(tickMs = 5000): NodeJS.Timeout {
  const tick = async () => {
    const bays = await prisma.bay.findMany({ where: { online: true } });
    const now = Date.now();
    for (const bay of bays) {
      const thresholdSec = getNumber(bay.stationId, SETTING_KEYS.bayOfflineThresholdSec, 30);
      const last = bay.lastHeartbeatAt?.getTime() ?? 0;
      if (now - last > thresholdSec * 1000) {
        await prisma.bay.update({
          where: { id: bay.id },
          data: { online: false, status: BayStatus.out_of_service },
        });
        await recordEvent("bay_offline", { bayId: bay.id });
        publishBay(bay.id, "status", {
          bayId: bay.id,
          status: BayStatus.out_of_service,
          online: false,
          outOfServiceReason: "offline",
        });
      }
    }
  };
  return setInterval(() => void tick(), tickMs);
}
