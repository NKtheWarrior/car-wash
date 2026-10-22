"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api, API_URL } from "../../../lib/api";
import { formatClock } from "../../../lib/format";
import type { SessionView } from "../../../lib/types";

function issueHref(bayId: string, sessionId: string) {
  return `/issue?bayId=${encodeURIComponent(bayId)}&sessionId=${encodeURIComponent(sessionId)}`;
}

export function SessionClient({ id }: { id: string }) {
  const [session, setSession] = useState<SessionView | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const stateRef = useRef<string>("");

  // Initial load.
  useEffect(() => {
    api<SessionView>(`/session/${id}`)
      .then((s) => {
        setSession(s);
        setRemaining(s.remainingSec);
        stateRef.current = s.state;
      })
      .catch((e) => setError((e as Error).message));
  }, [id]);

  // Live updates via SSE on the bay channel.
  useEffect(() => {
    if (!session?.bayId) return;
    const es = new EventSource(`${API_URL}/b/${session.bayId}/stream`);
    es.addEventListener("session", (ev) => {
      const data = JSON.parse((ev as MessageEvent).data);
      if (data.sessionId !== id) return;
      setSession((prev) => (prev ? { ...prev, state: data.state, remainingSec: data.remainingSec } : prev));
      setRemaining(data.remainingSec);
      stateRef.current = data.state;
    });
    return () => es.close();
  }, [session?.bayId, id]);

  // Local 1s countdown while running (smooths the gap between SSE updates).
  useEffect(() => {
    const t = setInterval(() => {
      if (stateRef.current === "running") setRemaining((r) => Math.max(0, r - 1));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  async function control(action: "pause" | "resume") {
    setWorking(true);
    setError("");
    try {
      const s = await api<SessionView>(`/session/${id}/${action}`, { method: "POST" });
      setSession((prev) => (prev ? { ...prev, ...s } : s));
      setRemaining(s.remainingSec);
      stateRef.current = s.state;
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setWorking(false);
    }
  }

  if (error && !session) {
    return (
      <div className="card">
        <h1>Session not found</h1>
        <p className="error">{error}</p>
      </div>
    );
  }
  if (!session) {
    return (
      <div className="card center">
        <span className="spinner" /> <p>Loading session…</p>
      </div>
    );
  }

  if (session.state === "ended") {
    return (
      <div className="card center">
        <span className="badge ended">Finished</span>
        <h1 style={{ marginTop: 12 }}>Wash complete 🎉</h1>
        <p>Thanks! Drive safe. Scan again for another wash.</p>
        <Link className="btn secondary" style={{ marginTop: 12 }} href={issueHref(session.bayId, session.id)}>
          Report an issue
        </Link>
      </div>
    );
  }

  const paused = session.state === "paused";
  return (
    <div>
      <div className="card center">
        <span className={`badge ${paused ? "paused" : "running"}`}>
          {paused ? "Paused" : "Washing"}
        </span>
        <div className="countdown">{formatClock(remaining)}</div>
        <p className="muted">{paused ? "Timer paused" : "Time remaining"}</p>

        {session.controllable ? (
          <div className="row" style={{ marginTop: 8 }}>
            {paused ? (
              <button className="btn success" onClick={() => void control("resume")} disabled={working}>
                {working ? <span className="spinner" /> : "Resume"}
              </button>
            ) : (
              <button className="btn secondary" onClick={() => void control("pause")} disabled={working}>
                {working ? <span className="spinner" /> : "Pause"}
              </button>
            )}
          </div>
        ) : (
          <p className="muted">Open this page on the phone you paid with to control the wash.</p>
        )}
        {error && <p className="error">{error}</p>}
      </div>
      <Link className="btn secondary" href={issueHref(session.bayId, session.id)}>
        Report an issue
      </Link>
    </div>
  );
}
