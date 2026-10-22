// SSE endpoints for live browser updates. The customer bay stream is public;
// the admin stream is authenticated via a token query param (EventSource can't
// set Authorization headers).

import { Router } from "express";
import jwt from "jsonwebtoken";
import { env } from "../env.js";
import { addAdminClient, addBayClient } from "../lib/sse.js";

export const streamRouter: Router = Router();

streamRouter.get("/b/:bayId/stream", (req, res) => {
  addBayClient(req.params.bayId, res);
});

streamRouter.get("/admin/stream", (req, res) => {
  const token = typeof req.query.token === "string" ? req.query.token : "";
  try {
    jwt.verify(token, env.JWT_SECRET);
  } catch {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  addAdminClient(res);
});
