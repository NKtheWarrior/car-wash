"use client";

import { useCallback, useEffect, useState } from "react";
import { adminApi } from "../../../../lib/admin";

interface Station {
  id: string;
  name: string;
  ownerVpa: string;
  payeeName: string;
}

export default function SettingsPage() {
  return (
    <>
      <PayoutCard />
      <SettingsCard />
    </>
  );
}

// ---- Payout (UPI VPA) --------------------------------------------------------

function PayoutCard() {
  const [station, setStation] = useState<Station | null>(null);
  const [vpa, setVpa] = useState("");
  const [payee, setPayee] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void adminApi<Station>("/admin/station").then((s) => {
      setStation(s);
      setVpa(s.ownerVpa);
      setPayee(s.payeeName);
    });
  }, []);

  const dirty = station != null && (vpa.trim() !== station.ownerVpa || payee.trim() !== station.payeeName);

  async function save() {
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const s = await adminApi<Station>("/admin/station", {
        method: "PUT",
        body: JSON.stringify({ ownerVpa: vpa.trim(), payeeName: payee.trim() }),
      });
      setStation(s);
      setVpa(s.ownerVpa);
      setPayee(s.payeeName);
      setSaved(true);
    } catch (e) {
      const msg = (e as Error).message;
      setError(msg === "invalid_vpa" ? "That doesn't look like a valid UPI id (e.g. name@okhdfcbank)." : msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="cw-card">
      <div className="cw-card__head">
        <h2 className="cw-h2">payout account</h2>
        <span className="cw-eyebrow">where payments land</span>
      </div>

      <p className="cw-note" style={{ marginBottom: 16 }}>
        every customer&apos;s UPI QR pays into this account. make sure the VPA is yours — this is what
        the pay screen charges.
      </p>

      <div className="cw-form">
        <div>
          <label className="cw-label">upi id (vpa)</label>
          <input
            className="cw-input"
            value={vpa}
            onChange={(e) => setVpa(e.target.value)}
            placeholder={`{vpa: "owner@okhdfcbank"}`}
            autoCapitalize="none"
            spellCheck={false}
          />
        </div>
        <div>
          <label className="cw-label">payee name</label>
          <input
            className="cw-input"
            value={payee}
            onChange={(e) => setPayee(e.target.value)}
            placeholder={`{name: "My Car Wash"}`}
          />
        </div>

        {error && <p className="cw-error">{error}</p>}
        {saved && !dirty && (
          <p className="cw-note" style={{ color: "var(--sage)" }}>
            saved ✓ — new checkouts will use this account.
          </p>
        )}

        <button
          className="cw-btn cw-btn--primary"
          style={{ alignSelf: "flex-start" }}
          onClick={() => void save()}
          disabled={busy || !dirty || !vpa.trim() || !payee.trim()}
        >
          {busy ? <span className="cw-spinner" /> : "save payout account"}
        </button>
      </div>
    </div>
  );
}

// ---- Generic key/value settings ----------------------------------------------

function SettingsCard() {
  const [values, setValues] = useState<Record<string, string>>({});
  const refresh = useCallback(
    () => void adminApi<{ values: Record<string, string> }>("/admin/settings").then((d) => setValues(d.values)),
    [],
  );
  useEffect(() => void refresh(), [refresh]);

  async function save(key: string, value: string) {
    await adminApi("/admin/settings", { method: "PUT", body: JSON.stringify({ key, value }) });
  }

  return (
    <div className="cw-card">
      <div className="cw-card__head">
        <h2 className="cw-h2">settings</h2>
        <span className="cw-eyebrow">applies within ~15s</span>
      </div>

      {Object.entries(values).map(([key, value]) => (
        <div className="cw-field" key={key}>
          <label>{key}</label>
          <input className="cw-input" defaultValue={value} onBlur={(e) => void save(key, e.target.value)} />
        </div>
      ))}

      {Object.keys(values).length === 0 && <div className="cw-empty">{"// no settings"}</div>}

      <p className="cw-note" style={{ marginTop: 16 }}>
        edit a value and click away to save.
      </p>
    </div>
  );
}
