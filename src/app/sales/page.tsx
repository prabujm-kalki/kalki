"use client";

import { useSessionView } from "@/components/AppShell";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function SalesDashboard() {
  const { selected: scope } = useSessionView();
  const [stats, setStats] = useState({ totalAmount: 0, totalBills: 0 });

  useEffect(() => {
    if (!scope?.locationId) return;

    fetch("/api/sales/stats?locationId=" + scope.locationId)
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch((err) => console.error(err));
  }, [scope]);

  if (!scope) {
    return (
      <div className="stack" style={{ padding: "2rem" }}>
        <p>Please select an Organization and Location from the top toolbar to view sales.</p>
      </div>
    );
  }

  return (
    <div className="stack" style={{ padding: "2rem" }}>
      <header className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h2>Sales Foundation</h2>
          <p className="muted">
            Import, normalize, and monitor authoritative sales data.
          </p>
        </div>
        <Link href="/sales/import" className="btn btn-primary">
          Import TMBill Excel
        </Link>
      </header>

      <section className="grid-2">
        <div className="card stack">
          <h4>Total Accepted Sales</h4>
          <h2 style={{ color: "var(--success-color)", fontSize: "2rem" }}>
            ₹ {stats.totalAmount.toLocaleString()}
          </h2>
          <p className="muted">Normalized value across all branches</p>
        </div>

        <div className="card stack">
          <h4>Total Bills Imported</h4>
          <h2 style={{ fontSize: "2rem" }}>
            {stats.totalBills.toLocaleString()}
          </h2>
          <p className="muted">Total normalized and deduplicated bills</p>
        </div>
      </section>

      <div className="card stack">
        <h3>Why this matters?</h3>
        <p>
          The Kalki BOS architecture relies on a "Single Source of Truth" for
          Sales. Once imported here, this normalized transaction data safely
          flows downstream into:
        </p>
        <ul style={{ marginLeft: "1.5rem", marginTop: "0.5rem" }} className="stack">
          <li><strong>CRM:</strong> Identifying customer purchase histories and segments.</li>
          <li><strong>Inventory:</strong> Deducing consumption based on BOM/Recipes.</li>
          <li><strong>Performance:</strong> Calculating Captain & Staff incentives based on line-items.</li>
        </ul>
      </div>
    </div>
  );
}
