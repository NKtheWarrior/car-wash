import { config } from "dotenv";
import { resolve } from "node:path";
import { z } from "zod";

// Load the single root .env (secrets live here; tunables live in the DB).
config({ path: resolve(process.cwd(), "../../.env") });
// Also honour a local .env if present (no-op if the root one already set vars).
config();

const envSchema = z.object({
  NODE_ENV: z.string().default("development"),
  API_PORT: z.coerce.number().default(4000),
  API_PUBLIC_URL: z.string().default("http://localhost:4000"),
  WEB_PUBLIC_URL: z.string().default("http://localhost:3000"),
  JWT_SECRET: z.string().min(1),
  MQTT_URL: z.string().default("mqtt://127.0.0.1:1883"),
  MQTT_USERNAME: z.string().optional(),
  MQTT_PASSWORD: z.string().optional(),
  ENABLE_DEV_ROUTES: z
    .string()
    .optional()
    .transform((v) => v === "true" || v === "1"),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("❌ Invalid environment:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isDev = env.NODE_ENV !== "production";
