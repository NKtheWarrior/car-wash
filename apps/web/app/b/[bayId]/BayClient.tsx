"use client";

import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api } from "../../../lib/api";
import { formatClock, formatDuration, formatPaise } from "../../../lib/format";
import type { BayLanding, CheckoutResult, CheckoutStatus, Plan } from "../../../lib/types";

type Phase = "loading" | "landing" | "paying" | "error";

export function BayClient({ bayId, token }: { bayId: string; token: string }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("loading");
  const [landing, setLanding] = useState<BayLanding | null>(null);
  const [checkout, setCheckout] = useState<CheckoutResult | null>(null);
  const [error, setError] = useState<string>("");
  const [busyWaiting, setBusyWaiting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api<BayLanding>(`/b/${bayId}?t=${encodeURIComponent(token)}`);
      if (data.state === "in_session") {
        router.replace(`/session/${data.session.id}`);
        return;
      }
      setLanding(data);
      setPhase("landing");
    } catch (e) {
      setError((e as Error).message);
      setPhase("error");
    }
  }, [bayId, token, router]);

  useEffect(() => {
    void load();
  }, [load]);

  // While the bay is busy, re-check periodically — the slot opens to everyone
  // when the current session ends (first to pay wins).
  useEffect(() => {
    if (landing?.state === "busy") {
      setBusyWaiting(true);
      const t = setInterval(() => void load(), 5000);
      return () => clearInterval(t);
    }
    setBusyWaiting(false);
  }, [landing, load]);

  // Poll checkout status once we're paying.
  useEffect(() => {
    if (phase !== "paying" || !checkout) return;
    pollRef.current = setInterval(async () => {
      try {
        const s = await api<CheckoutStatus>(`/checkout/${checkout.checkoutId}`);
        if (s.state === "matched" && s.sessionId) {
          router.replace(`/session/${s.sessionId}`);
        } else if (s.state === "expired" || s.state === "cancelled") {
          setError("This checkout expired. Please start again.");
          setPhase("landing");
          setCheckout(null);
        }
      } catch {
        /* keep polling */
      }
    }, 2000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [phase, checkout, router]);

  async function selectPlan(plan: Plan) {
    setError("");
    try {
      const result = await api<CheckoutResult>(`/b/${bayId}/checkout`, {
        method: "POST",
        body: JSON.stringify({ planId: plan.id }),
      });
      setCheckout(result);
      setPhase("paying");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function simulatePayment() {
    if (!checkout) return;
    try {
      await api(`/dev/observe`, {
        method: "POST",
        body: JSON.stringify({ checkoutId: checkout.checkoutId }),
      });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (phase === "loading") {
    return (
      <div className="card center">
        <span className="spinner" /> <p>Loading bay…</p>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="card">
        <h1>Something went wrong</h1>
        <p className="error">{error}</p>
        <button className="btn secondary" onClick={() => void load()}>
          Retry
        </button>
      </div>
    );
  }

  if (phase === "paying" && checkout) {
    return (
      <div className="card center">
        <h1>Scan to pay</h1>
        <p className="muted">Pay the exact amount with any UPI app.</p>
        <div className="amount">{formatPaise(checkout.amountPaise)}</div>
        <div className="qr">
          <QRCodeSVG value={checkout.upiLink} size={208} />
        </div>
        <a className="btn" href={checkout.upiLink}>
          Open UPI app
        </a>
        <p className="muted" style={{ marginTop: 16 }}>
          <span className="spinner" /> Waiting for payment…
        </p>
        {error && <p className="error">{error}</p>}
        <div className="dev">
          <small>⚠ Dev only</small>
          <button className="btn secondary" style={{ marginTop: 8 }} onClick={() => void simulatePayment()}>
            Simulate payment
          </button>
        </div>
      </div>
    );
  }

  // phase === "landing"
  if (!landing) return null;

  if (landing.state === "not_found") {
    return (
      <div className="card">
        <h1>Bay not found</h1>
        <p>Please check the QR code and try again.</p>
      </div>
    );
  }

  if (landing.state === "out_of_service") {
    return (
      <div className="card center">
        <span className="badge out">Out of service</span>
        <h1 style={{ marginTop: 12 }}>This bay is unavailable</h1>
        <p>Reason: {landing.reason}. Please try another bay or come back shortly.</p>
      </div>
    );
  }

  if (landing.state === "invalid_token") {
    return (
      <div className="card center">
        <h1>Please rescan</h1>
        <p>This QR code has expired. Scan the fresh code on the bay screen to continue.</p>
        <button className="btn secondary" onClick={() => void load()}>
          I rescanned — retry
        </button>
      </div>
    );
  }

  if (landing.state === "busy") {
    return (
      <div className="card center">
        <span className="badge running">Bay in use</span>
        <h1 style={{ marginTop: 12 }}>Someone is washing right now</h1>
        {landing.remainingSec != null ? (
          <p>
            About <strong>{formatClock(landing.remainingSec)}</strong> left. This page will refresh
            when the bay is free.
          </p>
        ) : (
          <p>This page will refresh when the bay is free.</p>
        )}
        {busyWaiting && (
          <p className="muted">
            <span className="spinner" /> Watching for an open slot…
          </p>
        )}
      </div>
    );
  }

  // in_session is handled by a redirect in load(); anything else -> nothing to show.
  if (landing.state !== "ready") return null;

  // ready
  return (
    <div>
      <div className="card">
        <h1>{landing.bay.name}</h1>
        <p className="muted">Choose a wash.</p>
      </div>
      <div className="card">
        <h2>Bikes</h2>
        {landing.plans
          .filter((p) => p.vehicleType === "bike")
          .map((p) => (
            <PlanButton key={p.id} plan={p} onClick={() => void selectPlan(p)} />
          ))}
        <h2 style={{ marginTop: 16 }}>Cars</h2>
        {landing.plans
          .filter((p) => p.vehicleType === "car")
          .map((p) => (
            <PlanButton key={p.id} plan={p} onClick={() => void selectPlan(p)} />
          ))}
        {error && <p className="error">{error}</p>}
      </div>
      <Link className="btn secondary" href={`/issue?bayId=${encodeURIComponent(bayId)}`}>
        Report an issue
      </Link>
    </div>
  );
}

function PlanButton({ plan, onClick }: { plan: Plan; onClick: () => void }) {
  return (
    <button className="plan" onClick={onClick}>
      <span>
        {plan.name.split("·")[0].trim()}
        <br />
        <span className="muted" style={{ fontSize: "0.85rem" }}>
          {formatDuration(plan.durationSec)}
        </span>
      </span>
      <span className="price">{formatPaise(plan.pricePaise)}</span>
    </button>
  );
}
