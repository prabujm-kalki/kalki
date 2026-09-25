"use client";

import { Leaf, Info } from "lucide-react";

type Balance = {
  id: string;
  leaveTypeId: string;
  leaveTypeName: string;
  accrued: string;
  taken: string;
  carriedForward: string;
  closingBalance: string;
};

export function LeaveBalances({ balances }: { balances: Balance[] }) {
  if (balances.length === 0) {
    return (
      <div className="att-card" style={{ textAlign: "center", padding: "2rem" }}>
        <p className="muted">No leave balances found.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.5rem", marginBottom: "2.5rem" }}>
      {balances.map((b) => {
        const allotted = parseFloat(b.accrued) + parseFloat(b.carriedForward);
        const consumed = parseFloat(b.taken);
        const available = parseFloat(b.closingBalance);
        
        // Progress bar calculation
        const percentAvailable = allotted > 0 ? Math.max(0, Math.min(100, (available / allotted) * 100)) : 0;
        const barColor = percentAvailable > 20 ? "var(--att-accent)" : "#ef4444";

        return (
          <div key={b.id} className="att-card" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{ 
                width: "48px", height: "48px", 
                borderRadius: "50%", 
                background: "rgba(59, 130, 246, 0.1)", 
                color: "var(--att-accent)",
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                <Leaf size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600, color: "var(--att-primary)" }}>{b.leaveTypeName}</h3>
                <span style={{ fontSize: "0.85rem", color: "var(--att-text-muted)" }}>Balance overview</span>
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.5rem" }}>
                <span style={{ fontWeight: 600, fontSize: "1.5rem", color: "var(--att-text)" }}>{available} <span style={{ fontSize: "0.9rem", color: "var(--att-text-muted)", fontWeight: 400 }}>days available</span></span>
              </div>
              
              <div style={{ width: "100%", height: "6px", background: "var(--att-border)", borderRadius: "99px", overflow: "hidden" }}>
                <div style={{ width: `${percentAvailable}%`, height: "100%", background: barColor, borderRadius: "99px", transition: "width 0.5s ease" }} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "0.25rem" }}>
              <div style={{ padding: "0.75rem", background: "var(--att-bg-hover)", borderRadius: "8px" }}>
                <div style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 600, color: "var(--att-text-muted)", marginBottom: "0.25rem" }}>Allotted</div>
                <div style={{ fontSize: "1.1rem", fontWeight: 600 }}>{allotted}</div>
              </div>
              <div style={{ padding: "0.75rem", background: "var(--att-bg-hover)", borderRadius: "8px" }}>
                <div style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 600, color: "var(--att-text-muted)", marginBottom: "0.25rem" }}>Consumed</div>
                <div style={{ fontSize: "1.1rem", fontWeight: 600 }}>{consumed}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
