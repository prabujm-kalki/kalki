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
  isPaid?: boolean;
  allowZeroBalance?: boolean;
};

export function LeaveBalances({ balances }: { balances: Balance[] }) {
  if (balances.length === 0) {
    return (
      <div className="att-card" style={{ textAlign: "center", padding: "1rem" }}>
        <p className="muted" style={{ fontSize: "0.85rem", margin: 0 }}>No leave balances found.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.5rem", marginBottom: "2.5rem" }}>
      {balances.map((b) => {
        const isUncapped = b.allowZeroBalance || b.isPaid === false;
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
                background: isUncapped ? "rgba(100, 116, 139, 0.12)" : "rgba(59, 130, 246, 0.1)", 
                color: isUncapped ? "#475569" : "var(--att-accent)",
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                <Leaf size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600, color: "var(--att-primary)" }}>{b.leaveTypeName}</h3>
                  {isUncapped && (
                    <span style={{ fontSize: "0.65rem", padding: "1px 6px", borderRadius: "4px", background: "#f1f5f9", color: "#475569", fontWeight: 600 }}>
                      UNPAID / LOP
                    </span>
                  )}
                </div>
                <span style={{ fontSize: "0.85rem", color: "var(--att-text-muted)" }}>Balance overview</span>
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.5rem" }}>
                {isUncapped ? (
                  <span style={{ fontWeight: 600, fontSize: "1.35rem", color: "#0f172a" }}>
                    {consumed} <span style={{ fontSize: "0.85rem", color: "var(--att-text-muted)", fontWeight: 400 }}>days availed (As Approved)</span>
                  </span>
                ) : (
                  <span style={{ fontWeight: 600, fontSize: "1.5rem", color: "var(--att-text)" }}>
                    {available} <span style={{ fontSize: "0.9rem", color: "var(--att-text-muted)", fontWeight: 400 }}>days available</span>
                  </span>
                )}
              </div>
              
              <div style={{ width: "100%", height: "6px", background: "var(--att-border)", borderRadius: "99px", overflow: "hidden" }}>
                <div 
                  style={{ 
                    width: isUncapped ? "100%" : `${percentAvailable}%`, 
                    height: "100%", 
                    background: isUncapped ? "#94a3b8" : barColor, 
                    borderRadius: "99px", 
                    transition: "width 0.5s ease" 
                  }} 
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "0.25rem" }}>
              <div style={{ padding: "0.75rem", background: "var(--att-bg-hover)", borderRadius: "8px" }}>
                <div style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 600, color: "var(--att-text-muted)", marginBottom: "0.25rem" }}>Allotted</div>
                <div style={{ fontSize: "1.1rem", fontWeight: 600, color: isUncapped ? "#64748b" : "inherit" }}>
                  {isUncapped ? "Uncapped" : allotted}
                </div>
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
