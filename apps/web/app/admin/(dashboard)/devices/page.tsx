"use client";

import { QRCodeSVG } from "qrcode.react";
import { useCallback, useState } from "react";
import { adminApi } from "../../../../lib/admin";
import { useAutoRefresh } from "../../_lib/useAutoRefresh";

interface Device {
  id: string;
  name: string;
  role: string;
  revoked: boolean;
  lastHeartbeatAt: string | null;
}

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [pairing, setPairing] = useState<unknown | null>(null);
  const refresh = useCallback(() => void adminApi<Device[]>("/admin/devices").then(setDevices), []);
  useAutoRefresh(refresh, [], ["listener"]);

  async function pair() {
    const res = await adminApi<{ pairing: unknown }>("/admin/pairing", {
      method: "POST",
      body: JSON.stringify({ name: "Listener phone" }),
    });
    setPairing(res.pairing);
    refresh();
  }
  async function revoke(id: string) {
    await adminApi(`/admin/devices/${id}/revoke`, { method: "POST" });
    refresh();
  }

  return (
    <div className="cw-card">
      <div className="cw-card__head">
        <h2 className="cw-h2">paired phones</h2>
        <button className="cw-btn cw-btn--primary cw-btn--sm" onClick={() => void pair()}>
          pair a new phone
        </button>
      </div>

      {pairing != null && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "8px 0 20px" }}>
          <p className="cw-note">scan this with the owner app to pair</p>
          <div className="cw-qr">
            <QRCodeSVG value={JSON.stringify(pairing)} size={190} />
          </div>
          <span className="cw-chip" style={{ maxWidth: 420 }}>
            {JSON.stringify(pairing)}
          </span>
        </div>
      )}

      <table className="cw-table" style={{ marginTop: 6 }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Role</th>
            <th>Heartbeat</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {devices.map((d) => (
            <tr key={d.id}>
              <td>{d.name}</td>
              <td className="cw-muted cw-mono">{d.role}</td>
              <td className="cw-num cw-muted">
                {d.lastHeartbeatAt ? new Date(d.lastHeartbeatAt).toLocaleTimeString() : "—"}
              </td>
              <td style={{ textAlign: "right" }}>
                {!d.revoked ? (
                  <button className="cw-btn cw-btn--danger cw-btn--sm" onClick={() => void revoke(d.id)}>
                    revoke
                  </button>
                ) : (
                  <span className="cw-badge out">revoked</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {devices.length === 0 && <div className="cw-empty">{"// no devices paired"}</div>}
    </div>
  );
}
