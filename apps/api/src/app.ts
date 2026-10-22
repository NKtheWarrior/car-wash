import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { env } from "./env.js";
import { adminRouter } from "./routes/admin.js";
import { authRouter } from "./routes/auth.js";
import { customerRouter } from "./routes/customer.js";
import { devRouter } from "./routes/dev.js";
import { listenerRouter } from "./routes/listener.js";
import { streamRouter } from "./routes/stream.js";

// Express Request augmented with the raw body, needed to verify HMAC signatures
// on listener requests (sign the exact bytes, not a re-serialized object).
export interface RawBodyRequest extends Request {
  rawBody?: string;
}

export function createApp(): express.Express {
  const app = express();

  // Allow the configured web origin plus any localhost/LAN origin, so the demo
  // works from a phone on the same Wi-Fi even when the PC's DHCP IP changes.
  // (Fine for a local demo; tighten to a fixed allow-list for production.)
  const isLanOrigin = (o: string) =>
    /^https?:\/\/(localhost|127\.0\.0\.1|10\.\d+|192\.168\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+)(:\d+)?$/.test(o);

  app.use(
    cors({
      origin(origin, cb) {
        // No Origin header = same-origin / curl / native app → allow.
        if (!origin || origin === env.WEB_PUBLIC_URL || isLanOrigin(origin)) {
          cb(null, true);
        } else {
          cb(new Error(`CORS blocked: ${origin}`));
        }
      },
      credentials: true,
    }),
  );
  app.use(cookieParser());
  app.use(
    express.json({
      verify: (req, _res, buf) => {
        (req as RawBodyRequest).rawBody = buf.toString("utf8");
      },
    }),
  );

  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.use(authRouter);
  app.use(customerRouter);
  app.use(listenerRouter);
  app.use(adminRouter);
  app.use(streamRouter);
  if (env.ENABLE_DEV_ROUTES) {
    app.use(devRouter);
    console.log("⚠️  Dev routes enabled (ENABLE_DEV_ROUTES=true)");
  }

  // Fallback error handler.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Unhandled error:", err);
    if (!res.headersSent) res.status(500).json({ error: "internal_error" });
  });

  return app;
}
