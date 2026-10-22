// Owner login (JWT). Used by the web admin and the Android dashboard.

import { prisma } from "@car-wash/db";
import { loginSchema } from "@car-wash/shared";
import bcrypt from "bcryptjs";
import { Router } from "express";
import { requireAuth, signToken, type AuthedRequest } from "../lib/auth.js";

export const authRouter: Router = Router();

authRouter.post("/auth/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body" });
    return;
  }
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    res.status(401).json({ error: "invalid_credentials" });
    return;
  }
  res.json({ token: signToken(user.id), email: user.email });
});

authRouter.get("/auth/me", requireAuth, async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json({ id: user.id, email: user.email });
});
