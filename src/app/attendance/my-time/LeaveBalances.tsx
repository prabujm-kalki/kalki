"use client";

import React from "react";
import { Leaf, Clock, AlertCircle } from "lucide-react";

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
  annualAllocation?: string | null;
  carryForwardExpiryMonths?: number | null;
};

export function LeaveBalances({ balances }: { balances: Balance[] }) {
  if (balances.length === 0) {
    return (
      <div className="att-card" style={{ textAlign: "center", padding: "1.5rem", borderRadius: "12px" }}>
        <p className="muted" style={{ fontSize: "0.9rem", margin: 0, color: "var(--att-text-muted)" }}>
          No leave balances found.
        </p>
      </div>
    );
  }

  // Current year for expiry calculation
  const currentYear = new Date().getFullYear();

  return (
    <div className="leave-balances-grid">
      {balances.map((b) => {
        const isUncapped = b.allowZeroBalance || b.isPaid === false;
        const accrued = parseFloat(b.accrued || "0");
        const carried = parseFloat(b.carriedForward || "0");
        const allotted = accrued + carried;
        const consumed = parseFloat(b.taken || "0");
        const available = parseFloat(b.closingBalance || "0");
        const annualQuota = b.annualAllocation ? parseFloat(b.annualAllocation) : null;
        
        // Progress bar calculation
        const percentAvailable = allotted > 0 ? Math.max(0, Math.min(100, (available / allotted) * 100)) : 0;
        const barColor = percentAvailable > 20 ? "var(--att-accent)" : "#ef4444";

        // Expiry calculation for carried-over days
        const hasExpiry = Boolean(carried > 0 && b.carryForwardExpiryMonths && b.carryForwardExpiryMonths > 0);
        let expiryDateLabel = "";
        if (hasExpiry && b.carryForwardExpiryMonths) {
          // Expiry month in current calendar year (e.g. 3 months = March 31st)
          const expiryDate = new Date(currentYear, b.carryForwardExpiryMonths, 0); // Last day of expiry month
          expiryDateLabel = expiryDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        }

        return (
          <div key={b.id} className="att-card leave-balance-card" style={{ display: "flex", flexDirection: "column", gap: "1rem", borderRadius: "12px" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div className="leave-balance-icon" style={{ 
                width: "42px", height: "42px", 
                borderRadius: "50%", 
                background: isUncapped ? "rgba(100, 116, 139, 0.12)" : "rgba(59, 130, 246, 0.1)", 
                color: isUncapped ? "#475569" : "var(--att-accent)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0
              }}>
                <Leaf size={20} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "4px", flexWrap: "wrap" }}>
                  <h3 className="leave-balance-name" style={{ margin: 0, fontSize: "1rem", fontWeight: 600, color: "var(--att-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {b.leaveTypeName}
                  </h3>
                  {isUncapped && (
                    <span style={{ fontSize: "0.6rem", padding: "1px 5px", borderRadius: "4px", background: "#f1f5f9", color: "#475569", fontWeight: 600 }}>
                      LOP
                    </span>
                  )}
                </div>
                <span className="leave-balance-sub" style={{ fontSize: "0.75rem", color: "var(--att-text-muted)" }}>Balance overview</span>
              </div>
            </div>

            {/* Available Display & Progress Bar */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.4rem" }}>
                {isUncapped ? (
                  <span className="leave-balance-num" style={{ fontWeight: 700, fontSize: "1.25rem", color: "#0f172a" }}>
                    {consumed.toFixed(1)} <span className="leave-balance-sub" style={{ fontSize: "0.75rem", color: "var(--att-text-muted)", fontWeight: 400 }}>availed</span>
                  </span>
                ) : (
                  <span className="leave-balance-num" style={{ fontWeight: 700, fontSize: "1.35rem", color: "var(--att-text)" }}>
                    {available.toFixed(1)} <span className="leave-balance-sub" style={{ fontSize: "0.8rem", color: "var(--att-text-muted)", fontWeight: 400 }}>days left</span>
                  </span>
                )}
              </div>
              
              <div style={{ width: "100%", height: "5px", background: "var(--att-border)", borderRadius: "99px", overflow: "hidden" }}>
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

            {/* 4-Tile Detailed Breakdown (Hidden on small mobile cards to keep view compact) */}
            <div className="leave-breakdown" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginTop: "0.15rem" }}>
              <div style={{ padding: "0.5rem 0.65rem", background: "var(--att-bg-hover)", borderRadius: "6px" }}>
                <div style={{ fontSize: "0.65rem", textTransform: "uppercase", fontWeight: 600, color: "var(--att-text-muted)", marginBottom: "0.15rem" }}>
                  Earned
                </div>
                <div style={{ fontSize: "0.95rem", fontWeight: 600, color: isUncapped ? "#64748b" : "inherit" }}>
                  {isUncapped ? "—" : `${accrued.toFixed(1)} d`}
                </div>
              </div>

              <div style={{ padding: "0.5rem 0.65rem", background: "var(--att-bg-hover)", borderRadius: "6px" }}>
                <div style={{ fontSize: "0.65rem", textTransform: "uppercase", fontWeight: 600, color: "var(--att-text-muted)", marginBottom: "0.15rem" }}>
                  Carried
                </div>
                <div style={{ fontSize: "0.95rem", fontWeight: 600, color: carried > 0 ? "var(--att-accent)" : "#64748b" }}>
                  {isUncapped ? "—" : `${carried.toFixed(1)} d`}
                </div>
              </div>

              <div style={{ padding: "0.5rem 0.65rem", background: "var(--att-bg-hover)", borderRadius: "6px" }}>
                <div style={{ fontSize: "0.65rem", textTransform: "uppercase", fontWeight: 600, color: "var(--att-text-muted)", marginBottom: "0.15rem" }}>
                  Taken
                </div>
                <div style={{ fontSize: "0.95rem", fontWeight: 600, color: consumed > 0 ? "#ef4444" : "inherit" }}>
                  {consumed.toFixed(1)} d
                </div>
              </div>

              <div style={{ padding: "0.5rem 0.65rem", background: "var(--att-bg-hover)", borderRadius: "6px" }}>
                <div style={{ fontSize: "0.65rem", textTransform: "uppercase", fontWeight: 600, color: "var(--att-text-muted)", marginBottom: "0.15rem" }}>
                  Quota
                </div>
                <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "#64748b" }}>
                  {isUncapped ? "Uncapped" : (annualQuota !== null ? `${annualQuota.toFixed(0)} d/yr` : "—")}
                </div>
              </div>
            </div>

            {/* Carry-Forward Expiry Warning Pill */}
            {hasExpiry && (
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.4rem 0.6rem",
                borderRadius: "6px",
                background: "#fffbeb",
                border: "1px solid #fde68a",
                color: "#92400e",
                fontSize: "0.72rem",
                fontWeight: 500
              }}>
                <Clock size={12} style={{ flexShrink: 0, color: "#d97706" }} />
                <span>
                  <strong>{carried.toFixed(1)}d</strong> expire {expiryDateLabel}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
