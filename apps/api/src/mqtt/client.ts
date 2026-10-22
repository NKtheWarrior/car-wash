// MQTT client — the ONLY component that talks to the broker (PRD §Security).
// Publishes motor commands to each bay and consumes status/heartbeat messages.

import { prisma, BayStatus } from "@car-wash/db";
import {
  bayIdFromStatusTopic,
  topics,
  type Command,
  type StatusMessage,
} from "@car-wash/shared";
import mqtt, { type MqttClient } from "mqtt";
import { env } from "../env.js";
import { recordEvent } from "../lib/events.js";
import { publishBay } from "../lib/sse.js";

let client: MqttClient | null = null;

export function getMqtt(): MqttClient {
  if (!client) throw new Error("MQTT not initialised");
  return client;
}

export function initMqtt(): MqttClient {
  client = mqtt.connect(env.MQTT_URL, {
    username: env.MQTT_USERNAME,
    password: env.MQTT_PASSWORD,
    reconnectPeriod: 2000,
    clientId: `carwash-api-${Math.random().toString(16).slice(2, 8)}`,
  });

  client.on("connect", () => {
    console.log(`📡 MQTT connected to ${env.MQTT_URL}`);
    client!.subscribe(topics.allStatus(), { qos: 1 }, (err) => {
      if (err) console.error("MQTT subscribe failed", err);
    });
  });

  client.on("error", (err) => console.error("MQTT error", err.message));
  client.on("reconnect", () => console.log("📡 MQTT reconnecting…"));

  client.on("message", (topic, payload) => {
    const bayId = bayIdFromStatusTopic(topic);
    if (!bayId) return;
    void handleStatus(bayId, payload.toString());
  });

  return client;
}

async function handleStatus(bayId: string, raw: string): Promise<void> {
  let msg: StatusMessage;
  try {
    msg = JSON.parse(raw) as StatusMessage;
  } catch {
    console.warn(`Bad status payload on ${bayId}:`, raw);
    return;
  }

  const bay = await prisma.bay.findUnique({ where: { id: bayId } });
  if (!bay) {
    console.warn(`Status for unknown bay ${bayId}`);
    return;
  }

  const wasOffline = !bay.online;
  const prevStatus = bay.status;
  const nextStatus = msg.screen as BayStatus;

  await prisma.bay.update({
    where: { id: bayId },
    data: {
      online: true,
      lastHeartbeatAt: new Date(),
      status: nextStatus,
    },
  });

  await prisma.reading.create({
    data: {
      bayId,
      motorOn: msg.motorOn,
      mains: msg.mains,
      batteryMv: msg.batteryMv ?? null,
      wifiRssi: msg.wifiRssi ?? null,
      remainingSec: msg.remainingSec ?? null,
    },
  });

  if (wasOffline) await recordEvent("bay_online", { bayId });
  if (prevStatus !== nextStatus)
    await recordEvent("bay_status_changed", { bayId, data: { from: prevStatus, to: nextStatus } });

  publishBay(bayId, "status", {
    bayId,
    status: nextStatus,
    online: true,
    motorOn: msg.motorOn,
    mains: msg.mains,
    remainingSec: msg.remainingSec,
    batteryMv: msg.batteryMv,
  });
}

export function publishCommand(bayId: string, command: Command): void {
  getMqtt().publish(topics.cmd(bayId), JSON.stringify(command), { qos: 1 });
}

/** Retained token payload the bay screen renders as the rotating QR. */
export function publishToken(
  bayId: string,
  data: { token: string; url: string; expiresAt: number },
): void {
  getMqtt().publish(topics.token(bayId), JSON.stringify(data), { qos: 1, retain: true });
}
