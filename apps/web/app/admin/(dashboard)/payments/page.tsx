"use client";

import { useCallback, useState } from "react";
import { adminApi } from "../../../../lib/admin";
import { formatPaise } from "../../../../lib/format";
import { useAutoRefresh } from "../../_lib/useAutoRefresh";

interface Payment {
  id: string;
  amountPaise: number;
  upiRef: string;
  state: string;
  createdAt: string;
  checkoutId: string | null;
}
interface Checkout {
  id: string;
  amountPaise: number;
  plan: { name: string };
  bay: { name: string };
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [checkouts, setCheckouts] = useState<Checkout[]>([]);
  const refresh = useCallback(() => {
    void adminApi<Payment[]>("/admin/payments").then(setPayments);
    void adminApi<Checkout[]>("/admin/checkouts").then(setCheckouts);
  }, []);
  useAutoRefresh(refresh, [], ["payment"]);

  async function confirm(p: Payment) {
    const checkoutId = p.checkoutId ?? prompt("Checkout id to link:", checkouts[0]?.id ?? "");
    if (!checkoutId) return;
    await adminApi(`/admin/payments/${p.id}/confirm`, { method: "POST", body: JSON.stringify({ checkoutId }) });
    refresh();
  }
  async function reject(p: Payment) {
    await adminApi(`/admin/payments/${p.id}/reject`, { method: "POST" });
    refresh();
  }

  return (
    <div className="cw-card">
      <div className="cw-card__head">
        <h2 className="cw-h2">payments</h2>
        <span className="cw-eyebrow">{payments.length} records</span>
      </div>

      {checkouts.length > 0 && (
        <div className="cw-actions" style={{ marginBottom: 18 }}>
          <span className="cw-eyebrow" style={{ alignSelf: "center" }}>
            awaiting
          </span>
          {checkouts.map((c) => (
            <span className="cw-chip" key={c.id}>
              {c.bay.name} · {formatPaise(c.amountPaise)}
            </span>
          ))}
        </div>
      )}

      <table className="cw-table">
        <thead>
          <tr>
            <th>Amount</th>
            <th>Ref</th>
            <th>State</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {payments.map((p) => (
            <tr key={p.id}>
              <td className="cw-num">{formatPaise(p.amountPaise)}</td>
              <td className="cw-mono cw-muted">{p.upiRef}</td>
              <td>
                <span className={`cw-badge ${p.state === "pending" ? "pending" : p.state === "confirmed" ? "ok" : "out"}`}>
                  {p.state}
                </span>
              </td>
              <td style={{ textAlign: "right" }}>
                {p.state === "pending" && (
                  <div className="cw-actions" style={{ justifyContent: "flex-end" }}>
                    <button className="cw-btn cw-btn--primary cw-btn--sm" onClick={() => void confirm(p)}>
                      confirm
                    </button>
                    <button className="cw-btn cw-btn--danger cw-btn--sm" onClick={() => void reject(p)}>
                      reject
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {payments.length === 0 && <div className="cw-empty">{"// no payments yet"}</div>}
    </div>
  );
}
