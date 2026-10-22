"use client";

import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { adminApi } from "../../../../lib/admin";
import { formatClock } from "../../../../lib/format";
import { useAutoRefresh } from "../../_lib/useAutoRefresh";

interface BayLive {
  id: string;
  name: string;
  status: string;
  online: boolean;
  scanUrl: string | null;
  mains: boolean | null;
  session: { id: string; planName: string; state: string; remainingSec: number } | null;
}

export default function LivePage() {
  const [bays, setBays] = useState<BayLive[]>([]);
  useAutoRefresh(() => void adminApi<BayLive[]>("/admin/bays").then(setBays), [], ["status", "session", "token"]);

  async function stop(id: string) {
    if (!confirm("Remotely stop this bay's session?")) return;
    await adminApi(`/admin/bays/${id}/stop`, { method: "POST" });
  }

  if (bays.length === 0) {
    return (
      <div className="cw-card">
        <div className="cw-empty">{"// no bays registered"}</div>
      </div>
    );
  }

  return (
    <div className="cw-grid cols-2">
      {bays.map((b) => (
        <div className="cw-card" key={b.id}>
          <div className="cw-card__head">
            <h2 className="cw-h2">{b.name}</h2>
            <span className={`cw-badge ${b.online ? (b.status === "ready" ? "ready" : "running") : "out"}`}>
              {b.online ? b.status : "offline"}
            </span>
          </div>

          {b.session ? (
            <p className="cw-lead">
              {b.session.planName} — <span className="cw-mist">{b.session.state}</span> ·{" "}
              <span className="cw-mono">{formatClock(b.session.remainingSec)}</span> left
            </p>
          ) : (
            <p className="cw-muted">
              no active session · mains {b.mains ? <span className="cw-sage">on</span> : "—"}
            </p>
          )}

          <div className="cw-actions" style={{ marginTop: 16 }}>
            {b.scanUrl && (
              <a className="cw-btn cw-btn--outline cw-btn--sm" href={b.scanUrl} target="_blank" rel="noreferrer">
                open scan url
              </a>
            )}
            {b.session && (
              <button className="cw-btn cw-btn--danger cw-btn--sm" onClick={() => void stop(b.id)}>
                remote stop
              </button>
            )}
          </div>

          {b.scanUrl && (
            <div style={{ marginTop: 18 }}>
              <div className="cw-qr">
                <QRCodeSVG value={b.scanUrl} size={132} />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
