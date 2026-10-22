"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import "../admin.css";
import { fontVars } from "../_lib/fonts";
import { API_URL } from "../../../lib/api";
import { setToken } from "../../../lib/admin";

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("owner@carwash.local");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "login_failed");
      setToken(data.token);
      router.replace("/admin");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`cw-admin cw-admin--auth ${fontVars}`}>
      <form className="cw-auth-card" onSubmit={submit}>
        <span className="cw-eyebrow">~/carwash · owner console</span>
        <h1 className="cw-h1">
          sign <span className="cw-coral">in</span>
          <span className="cw-cursor">_</span>
        </h1>
        <p className="cw-lead" style={{ marginBottom: 24 }}>
          authenticate to manage bays, payments and devices.
        </p>

        <div className="cw-form">
          <div>
            <label className="cw-label">email</label>
            <input
              className="cw-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder={`{email: "owner@..."}`}
            />
          </div>
          <div>
            <label className="cw-label">password</label>
            <input
              className="cw-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder={`{password: "••••"}`}
            />
          </div>

          {error && <p className="cw-error">{error}</p>}

          <button className="cw-btn cw-btn--primary cw-btn--block" disabled={busy} style={{ marginTop: 6 }}>
            {busy ? <span className="cw-spinner" /> : "sign in"}
          </button>
        </div>
      </form>
    </div>
  );
}
