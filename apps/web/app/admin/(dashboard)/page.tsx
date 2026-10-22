"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { adminApi } from "../../../lib/admin";
import { formatClock, formatPaise } from "../../../lib/format";
import { useAutoRefresh } from "../_lib/useAutoRefresh";

interface BayLive {
  id: string;
  name: string;
  status: string;
  online: boolean;
  session: { planName: string; state: string; remainingSec: number } | null;
}
interface Payment {
  id: string;
  amountPaise: number;
  upiRef: string;
  state: string;
}
interface Issue {
  id: string;
  kind: string;
  description: string;
  status: string;
}
interface Stats {
  earnings: { today: number };
  usage: { sessionCount: number };
  health: { baysOnline: number; baysTotal: number };
}

export default function OverviewPage() {
  const [bays, setBays] = useState<BayLive[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);

  const refresh = useCallback(() => {
    void adminApi<BayLive[]>("/admin/bays").then(setBays);
    void adminApi<Payment[]>("/admin/payments").then(setPayments);
    void adminApi<Issue[]>("/admin/issues").then(setIssues);
    void adminApi<Stats>("/admin/stats").then(setStats);
  }, []);
  useAutoRefresh(refresh, [], ["status", "session", "payment"]);

  const pendingPayments = payments.filter((p) => p.state === "pending");
  const openIssues = issues.filter((i) => i.status === "open");
  const baysOnline = bays.filter((b) => b.online).length;
  const activeSessions = bays.filter((b) => b.session);

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <h1 className="cw-h1">
          good day, <span className="cw-coral">owner</span>
        </h1>
        <p className="cw-lead">a quick read on everything happening across your bays.</p>
      </div>

      <div className="cw-grid cols-4">
        <Metric
          href="/admin/insights"
          label="earnings today"
          value={stats ? formatPaise(stats.earnings.today) : "—"}
          tint="cw-coral"
        />
        <Metric
          href="/admin/live"
          label="bays online"
          value={`${baysOnline}/${bays.length}`}
          tint="cw-sage"
        />
        <Metric
          href="/admin/payments"
          label="pending payments"
          value={String(pendingPayments.length)}
          tint={pendingPayments.length ? "cw-coral" : ""}
        />
        <Metric
          href="/admin/issues"
          label="open issues"
          value={String(openIssues.length)}
          tint={openIssues.length ? "cw-coral" : ""}
        />
      </div>

      <div className="cw-grid cols-2" style={{ marginTop: 18 }}>
        <div className="cw-card">
          <div className="cw-card__head">
            <h2 className="cw-h2">live bays</h2>
            <Link className="cw-btn cw-btn--ghost cw-btn--sm" href="/admin/live">
              view all
            </Link>
          </div>
          {bays.map((b) => (
            <div className="cw-kv" key={b.id}>
              <span>
                {b.name}
                {b.session && (
                  <span className="cw-muted">
                    {" "}
                    · {b.session.planName} {formatClock(b.session.remainingSec)}
                  </span>
                )}
              </span>
              <span className={`cw-badge ${b.online ? (b.status === "ready" ? "ready" : "running") : "out"}`}>
                {b.online ? b.status : "offline"}
              </span>
            </div>
          ))}
          {bays.length === 0 && <div className="cw-empty">{"// no bays"}</div>}
        </div>

        <div className="cw-card">
          <div className="cw-card__head">
            <h2 className="cw-h2">needs attention</h2>
            <span className="cw-eyebrow">{pendingPayments.length + openIssues.length} items</span>
          </div>

          {pendingPayments.slice(0, 4).map((p) => (
            <div className="cw-kv" key={p.id}>
              <span>
                <span className="cw-mono cw-coral" style={{ fontSize: 11, textTransform: "uppercase" }}>
                  payment
                </span>{" "}
                {p.upiRef}
              </span>
              <span className="cw-kv__v">{formatPaise(p.amountPaise)}</span>
            </div>
          ))}
          {openIssues.slice(0, 4).map((i) => (
            <div className="cw-kv" key={i.id}>
              <span>
                <span className="cw-mono cw-coral" style={{ fontSize: 11, textTransform: "uppercase" }}>
                  issue
                </span>{" "}
                {i.kind}
              </span>
              <span className="cw-muted" style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {i.description}
              </span>
            </div>
          ))}

          {pendingPayments.length === 0 && openIssues.length === 0 && (
            <div className="cw-empty">{"// all clear ✓"}</div>
          )}

          <div className="cw-actions" style={{ marginTop: 16 }}>
            <Link className="cw-btn cw-btn--outline cw-btn--sm" href="/admin/payments">
              payments
            </Link>
            <Link className="cw-btn cw-btn--outline cw-btn--sm" href="/admin/issues">
              issues
            </Link>
          </div>
        </div>
      </div>

      <div className="cw-card" style={{ marginTop: 18 }}>
        <div className="cw-card__head">
          <h2 className="cw-h2">
            {activeSessions.length} <span className="cw-mist">active</span> washes
          </h2>
          <span className="cw-eyebrow">{stats ? `${stats.usage.sessionCount} total today` : ""}</span>
        </div>
        {activeSessions.length === 0 ? (
          <div className="cw-empty">{"// no washes running right now"}</div>
        ) : (
          <div className="cw-grid cols-3">
            {activeSessions.map((b) => (
              <div key={b.id} className="cw-stat">
                <span className="cw-stat__label">{b.name}</span>
                <span className="cw-stat__num cw-mist">{formatClock(b.session!.remainingSec)}</span>
                <span className="cw-stat__sub">
                  {b.session!.planName} · {b.session!.state}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function Metric({ href, label, value, tint }: { href: string; label: string; value: string; tint: string }) {
  return (
    <Link href={href} className="cw-card" style={{ textDecoration: "none", display: "block" }}>
      <div className="cw-stat">
        <span className="cw-stat__label">{label}</span>
        <span className={`cw-stat__num ${tint}`}>{value}</span>
      </div>
    </Link>
  );
}
