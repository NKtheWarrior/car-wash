// Customer control is tied to a session cookie (no login). Reopening the
// browser restores control via this cookie (PRD §Customer flow, edge case 9).

import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";

export const COOKIE_NAME = "cw_sid";
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export function getCookieId(req: Request): string | undefined {
  return req.cookies?.[COOKIE_NAME];
}

export function getOrCreateCookieId(req: Request, res: Response): string {
  const existing = getCookieId(req);
  if (existing) return existing;
  const id = randomUUID();
  res.cookie(COOKIE_NAME, id, {
    httpOnly: true,
    sameSite: "lax",
    // Served over HTTPS in production (web + api share the same registrable
    // domain, so a Lax cookie is still sent on cross-subdomain requests).
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR_MS,
  });
  return id;
}
