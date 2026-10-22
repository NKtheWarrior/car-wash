import bcrypt from "bcryptjs";
import { prisma, VehicleType } from "./index.js";
import { DEFAULT_SETTINGS } from "./settings.js";

// Deterministic ids so the demo bay URL is stable and seeding is idempotent.
const STATION_ID = "demo-station";
const BAY_ID = "demo-bay";

const PLANS: Array<{
  id: string;
  name: string;
  vehicleType: VehicleType;
  durationSec: number;
  pricePaise: number;
}> = [
  { id: "plan-bike-10", name: "Bike wash · 10 min", vehicleType: "bike", durationSec: 10 * 60, pricePaise: 3000 },
  { id: "plan-bike-20", name: "Bike wash · 20 min", vehicleType: "bike", durationSec: 20 * 60, pricePaise: 5000 },
  { id: "plan-bike-30", name: "Bike wash · 30 min", vehicleType: "bike", durationSec: 30 * 60, pricePaise: 7000 },
  { id: "plan-car-10", name: "Car wash · 10 min", vehicleType: "car", durationSec: 10 * 60, pricePaise: 5000 },
  { id: "plan-car-20", name: "Car wash · 20 min", vehicleType: "car", durationSec: 20 * 60, pricePaise: 8000 },
  { id: "plan-car-30", name: "Car wash · 30 min", vehicleType: "car", durationSec: 30 * 60, pricePaise: 11000 },
];

async function main() {
  const ownerEmail = process.env.OWNER_EMAIL ?? "owner@carwash.local";
  const ownerPassword = process.env.OWNER_PASSWORD ?? "changeme123";

  // Owner login (JWT).
  const passwordHash = await bcrypt.hash(ownerPassword, 10);
  await prisma.user.upsert({
    where: { email: ownerEmail },
    update: {},
    create: { email: ownerEmail, passwordHash },
  });

  // Station.
  await prisma.station.upsert({
    where: { id: STATION_ID },
    update: {},
    create: {
      id: STATION_ID,
      name: "Demo Car Wash",
      ownerVpa: process.env.OWNER_VPA ?? "owner@upi",
      payeeName: process.env.OWNER_PAYEE_NAME ?? "Demo Car Wash",
    },
  });

  // Bay — starts out of service until the ESP32 connects and reports ready.
  await prisma.bay.upsert({
    where: { id: BAY_ID },
    update: {},
    create: {
      id: BAY_ID,
      stationId: STATION_ID,
      name: "Bay 1",
      mqttUser: "bay-demo",
      mqttPass: "bay-demo-secret",
    },
  });

  // Plans.
  for (const p of PLANS) {
    await prisma.plan.upsert({
      where: { id: p.id },
      update: {
        name: p.name,
        vehicleType: p.vehicleType,
        durationSec: p.durationSec,
        pricePaise: p.pricePaise,
      },
      create: { ...p, stationId: STATION_ID },
    });
  }

  // Settings (PRD defaults). Idempotent per (station, key).
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await prisma.setting.upsert({
      where: { stationId_key: { stationId: STATION_ID, key } },
      update: {},
      create: { stationId: STATION_ID, key, value },
    });
  }

  const webUrl = process.env.WEB_PUBLIC_URL ?? "http://localhost:3000";
  console.log("✅ Seed complete.");
  console.log(`   Owner login: ${ownerEmail} / ${ownerPassword}`);
  console.log(`   Bay scan URL (token added by the API): ${webUrl}/b/${BAY_ID}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
