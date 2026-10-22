"use client";

import { useState } from "react";
import { adminApi } from "../../../../lib/admin";
import { formatPaise } from "../../../../lib/format";
import { useAutoRefresh } from "../../_lib/useAutoRefresh";

interface Stats {
  earnings: { today: number; week: number; month: number };
  earningsByPlan: { name: string; paise: number; count: number }[];
  usage: {
    sessionCount: number;
    avgDurationSec: number;
    peakHours: number[];
    popularPlan: { name: string; count: number } | null;
  };
  health: { baysOnline: number; baysTotal: number; motorRuntimeHours: number; outages24h: number };
}

export default function InsightsPage() {
  const [s, setStats] = useState<Stats | null>(null);
  useAutoRefresh(() => void adminApi<Stats>("/admin/stats").then(setStats), []);

  if (!s) {
    return (
      <div className="cw-card">
        <div className="cw-empty">{"// loading insights…"}</div>
      </div>
    );
  }

  const peak = s.usage.peakHours.indexOf(Math.max(...s.usage.peakHours));
  const maxPlanPaise = Math.max(1, ...s.earningsByPlan.map((e) => e.paise));

  return (
    <>
      <div className="cw-grid cols-3">
        <div className="cw-card">
          <div className="cw-stat">
            <span className="cw-stat__label">earnings today</span>
            <span className="cw-stat__num cw-coral">{formatPaise(s.earnings.today)}</span>
          </div>
        </div>
        <div className="cw-card">
          <div className="cw-stat">
            <span className="cw-stat__label">this week</span>
            <span className="cw-stat__num cw-sage">{formatPaise(s.earnings.week)}</span>
          </div>
        </div>
        <div className="cw-card">
          <div className="cw-stat">
            <span className="cw-stat__label">this month</span>
            <span className="cw-stat__num cw-lavender">{formatPaise(s.earnings.month)}</span>
          </div>
        </div>
      </div>

      <div className="cw-grid cols-2" style={{ marginTop: 18 }}>
        <div className="cw-card">
          <div className="cw-card__head">
            <h2 className="cw-h2">earnings by plan</h2>
          </div>
          {s.earningsByPlan.map((e) => (
            <div key={e.name} style={{ marginBottom: 14 }}>
              <div className="cw-kv" style={{ padding: "0 0 6px", borderBottom: "none" }}>
                <span>{e.name}</span>
                <span className="cw-kv__v">
                  {formatPaise(e.paise)} <span className="cw-dim">· {e.count}</span>
                </span>
              </div>
              <div style={{ height: 6, background: "var(--chip)", borderRadius: 999, overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${(e.paise / maxPlanPaise) * 100}%`,
                    background: "var(--coral)",
                    borderRadius: 999,
                  }}
                />
              </div>
            </div>
          ))}
          {s.earningsByPlan.length === 0 && <div className="cw-empty">{"// no earnings yet"}</div>}
        </div>

        <div className="cw-card">
          <div className="cw-card__head">
            <h2 className="cw-h2">usage</h2>
          </div>
          <div className="cw-kv">
            <span className="cw-muted">washes</span>
            <span className="cw-kv__v">{s.usage.sessionCount}</span>
          </div>
          <div className="cw-kv">
            <span className="cw-muted">avg duration</span>
            <span className="cw-kv__v">{Math.round(s.usage.avgDurationSec / 60)} min</span>
          </div>
          <div className="cw-kv">
            <span className="cw-muted">most popular</span>
            <span className="cw-kv__v">{s.usage.popularPlan?.name ?? "—"}</span>
          </div>
          <div className="cw-kv">
            <span className="cw-muted">peak hour</span>
            <span className="cw-kv__v">{s.usage.sessionCount ? `${peak}:00` : "—"}</span>
          </div>
        </div>
      </div>

      <div className="cw-card" style={{ marginTop: 18 }}>
        <div className="cw-card__head">
          <h2 className="cw-h2">health</h2>
        </div>
        <div className="cw-grid cols-3">
          <div className="cw-stat">
            <span className="cw-stat__label">bays online</span>
            <span className="cw-stat__num cw-sage">
              {s.health.baysOnline}
              <span className="cw-dim" style={{ fontSize: 20 }}>
                /{s.health.baysTotal}
              </span>
            </span>
          </div>
          <div className="cw-stat">
            <span className="cw-stat__label">motor runtime</span>
            <span className="cw-stat__num">
              {s.health.motorRuntimeHours}
              <span className="cw-dim" style={{ fontSize: 20 }}>
                h
              </span>
            </span>
          </div>
          <div className="cw-stat">
            <span className="cw-stat__label">outages (24h)</span>
            <span className={`cw-stat__num ${s.health.outages24h > 0 ? "cw-coral" : ""}`}>{s.health.outages24h}</span>
          </div>
        </div>
      </div>
    </>
  );
}
