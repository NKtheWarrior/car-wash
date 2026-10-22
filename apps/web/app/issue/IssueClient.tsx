"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "../../lib/api";

export function IssueClient({ bayId, sessionId }: { bayId?: string; sessionId?: string }) {
  const router = useRouter();
  const [kind, setKind] = useState("payment");
  const [description, setDescription] = useState("");
  const [contact, setContact] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!description.trim()) {
      setError("Please describe the problem.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await api("/issue", {
        method: "POST",
        body: JSON.stringify({ kind, description, contact: contact || undefined, bayId, sessionId }),
      });
      setDone(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="card center">
        <span className="badge ready">Sent</span>
        <h1 style={{ marginTop: 12 }}>Thanks — we got it</h1>
        <p>The owner has been notified and will look into it.</p>
        <button className="btn" style={{ marginTop: 12 }} onClick={() => router.back()}>
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="card">
      <h1>Report an issue</h1>
      <p className="muted">Tell us what went wrong and the owner will look into it.</p>

      <label>Type</label>
      <select value={kind} onChange={(e) => setKind(e.target.value)}>
        <option value="payment">Payment problem</option>
        <option value="refund">Refund request</option>
        <option value="service">Bay / service problem</option>
        <option value="other">Other</option>
      </select>

      <label>What happened?</label>
      <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />

      <label>Contact (optional)</label>
      <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Phone or UPI id" />

      {error && <p className="error">{error}</p>}

      <div className="row" style={{ marginTop: 16 }}>
        <button className="btn secondary" onClick={() => router.back()} disabled={submitting}>
          Cancel
        </button>
        <button className="btn" onClick={() => void submit()} disabled={submitting}>
          {submitting ? <span className="spinner" /> : "Send"}
        </button>
      </div>
    </div>
  );
}
