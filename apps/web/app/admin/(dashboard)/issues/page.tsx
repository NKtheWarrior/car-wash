"use client";

import { useCallback, useState } from "react";
import { adminApi } from "../../../../lib/admin";
import { useAutoRefresh } from "../../_lib/useAutoRefresh";

interface Issue {
  id: string;
  kind: string;
  description: string;
  contact: string | null;
  status: string;
  createdAt: string;
}

export default function IssuesPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const refresh = useCallback(() => void adminApi<Issue[]>("/admin/issues").then(setIssues), []);
  useAutoRefresh(refresh, []);

  async function resolve(id: string) {
    await adminApi(`/admin/issues/${id}/resolve`, { method: "POST" });
    refresh();
  }

  const open = issues.filter((i) => i.status === "open").length;

  return (
    <div className="cw-card">
      <div className="cw-card__head">
        <h2 className="cw-h2">
          issues <span className="cw-coral">{open}</span> open
        </h2>
        <span className="cw-eyebrow">{issues.length} total</span>
      </div>

      {issues.map((i) => (
        <div className="cw-list-item" key={i.id}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span className="cw-mono cw-coral" style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                {i.kind}
              </span>
              <span className={`cw-badge ${i.status === "open" ? "pending" : "ok"}`}>{i.status}</span>
            </div>
            <div style={{ color: "var(--text)", fontSize: 14 }}>{i.description}</div>
            <div className="cw-note" style={{ marginTop: 4 }}>
              {i.contact ?? "no contact"}
            </div>
          </div>
          {i.status === "open" && (
            <button className="cw-btn cw-btn--outline cw-btn--sm" onClick={() => void resolve(i.id)}>
              resolve
            </button>
          )}
        </div>
      ))}

      {issues.length === 0 && <div className="cw-empty">{"// no issues reported"}</div>}
    </div>
  );
}
