export interface Plan {
  id: string;
  name: string;
  vehicleType: "bike" | "car";
  durationSec: number;
  pricePaise: number;
}

export type SessionState = "pending" | "running" | "paused" | "ended";

export interface SessionView {
  id: string;
  bayId: string;
  planId: string;
  state: SessionState;
  remainingSec: number;
  pauseUsedSec: number;
  controllable?: boolean;
}

export type BayLanding =
  | { state: "not_found" }
  | { state: "out_of_service"; reason: string }
  | { state: "busy"; remainingSec: number | null }
  | { state: "invalid_token" }
  | { state: "in_session"; session: SessionView }
  | { state: "ready"; bay: { id: string; name: string }; plans: Plan[] };

export interface CheckoutResult {
  checkoutId: string;
  amountPaise: number;
  upiLink: string;
  expiresAt: number;
}

export interface CheckoutStatus {
  id: string;
  state: "awaiting" | "matched" | "pending" | "expired" | "cancelled";
  amountPaise: number;
  sessionId: string | null;
  session: SessionView | null;
}
