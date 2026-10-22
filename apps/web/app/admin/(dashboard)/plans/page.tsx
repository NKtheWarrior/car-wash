"use client";

import { useCallback, useEffect, useState } from "react";
import { adminApi } from "../../../../lib/admin";

interface Plan {
  id: string;
  name: string;
  vehicleType: "bike" | "car";
  durationSec: number;
  pricePaise: number;
  active: boolean;
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const refresh = useCallback(() => void adminApi<Plan[]>("/admin/plans").then(setPlans), []);
  useEffect(() => void refresh(), [refresh]);

  async function updatePrice(p: Plan, rupees: string) {
    const pricePaise = Math.round(parseFloat(rupees) * 100);
    if (!Number.isFinite(pricePaise)) return;
    await adminApi(`/admin/plans/${p.id}`, { method: "PUT", body: JSON.stringify({ pricePaise }) });
    refresh();
  }
  async function toggle(p: Plan) {
    await adminApi(`/admin/plans/${p.id}`, { method: "PUT", body: JSON.stringify({ active: !p.active }) });
    refresh();
  }

  return (
    <div className="cw-card">
      <div className="cw-card__head">
        <h2 className="cw-h2">plans &amp; prices</h2>
        <span className="cw-eyebrow">edit price · click away to save</span>
      </div>

      <table className="cw-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Vehicle</th>
            <th>Duration</th>
            <th>Price ₹</th>
            <th>Active</th>
          </tr>
        </thead>
        <tbody>
          {plans.map((p) => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td className="cw-muted cw-mono">{p.vehicleType}</td>
              <td className="cw-num cw-muted">{Math.round(p.durationSec / 60)} min</td>
              <td>
                <input
                  className="cw-input cw-input--inline"
                  defaultValue={(p.pricePaise / 100).toFixed(2)}
                  onBlur={(e) => void updatePrice(p, e.target.value)}
                />
              </td>
              <td>
                <button
                  className={`cw-btn cw-btn--sm ${p.active ? "cw-btn--primary" : "cw-btn--ghost"}`}
                  onClick={() => void toggle(p)}
                >
                  {p.active ? "on" : "off"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {plans.length === 0 && <div className="cw-empty">{"// no plans configured"}</div>}
    </div>
  );
}
