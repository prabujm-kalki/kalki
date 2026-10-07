"use client";

import React, { useState, useEffect } from "react";
import { Network, ArrowRight, Activity, TrendingUp, TrendingDown } from "lucide-react";
import { useSessionView } from "@/components/AppShell";
import { fetchInterBranchBalances } from "@/app/finance/inter-branch-actions";

export function InterBranchClient() {
  const { selected } = useSessionView();
  const [loading, setLoading] = useState(false);
  const [positions, setPositions] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    fetchInterBranchBalances(selected.organizationId).then(res => {
      if (res.success) setPositions(res.data as any[]);
      else setError(res.error);
      setLoading(false);
    });
  }, [selected]);

  if (!selected) return <div className="p-8 text-center">Please select an organization context.</div>;

  const totalOwed = positions.filter(p => p.netPosition > 0).reduce((sum, p) => sum + p.netPosition, 0);

  return (
    <div className="kalki-main-content">
      <div className="kalki-page-header" style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 className="kalki-page-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Network size={24} style={{ color: "var(--kalki-primary)" }} />
            Inter-Branch Clearing
          </h1>
          <p className="kalki-page-description">Visualize and settle funds owed between restaurant locations.</p>
        </div>
        <button className="kalki-button kalki-button--primary" style={{ height: "36px" }}>
          <ArrowRight size={16} style={{ marginRight: "8px" }} /> Settle Balances
        </button>
      </div>

      {error && <div style={{ color: "var(--kalki-danger)", marginBottom: "16px" }}>{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px", marginBottom: "32px" }}>
        <div className="kalki-section" style={{ position: "relative", margin: 0 }}>
          <div className="kalki-section-content">
            <div style={{ position: "absolute", top: "16px", right: "16px", opacity: 0.1 }}>
              <Activity size={64} color="var(--kalki-primary)" />
            </div>
            <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--kalki-text-secondary)", textTransform: "uppercase", marginBottom: "8px", margin: 0 }}>Total System Imbalance</p>
            <h3 style={{ fontSize: "28px", fontWeight: "bold", margin: "4px 0 16px 0", color: "var(--kalki-text-primary)" }}>₹{totalOwed.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
            <div style={{ fontSize: "12px", color: "var(--kalki-text-secondary)" }}>
              Total funds floating between branches
            </div>
          </div>
        </div>
      </div>

      <div className="kalki-section">
        <div className="kalki-section-header">
          <div className="kalki-section-title">
            Branch Net Positions
          </div>
        </div>
        <div className="kalki-table-container">
          <table className="kalki-table">
            <thead>
              <tr>
                <th>Branch</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Net Position (₹)</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={3} style={{ textAlign: "center", padding: "32px", color: "var(--kalki-text-secondary)" }}>Loading branch positions...</td></tr>
              ) : positions.length === 0 ? (
                <tr><td colSpan={3} style={{ textAlign: "center", padding: "32px", color: "var(--kalki-text-secondary)" }}>No data found.</td></tr>
              ) : positions.map(pos => (
                <tr key={pos.location.id}>
                  <td style={{ fontWeight: 500, color: "var(--kalki-text-primary)" }}>{pos.location.name}</td>
                  <td>
                    {Math.abs(pos.netPosition) < 0.01 ? (
                      <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: "999px", background: "#f1f5f9", color: "var(--kalki-text-secondary)", fontSize: "12px", fontWeight: 600 }}>Balanced</span>
                    ) : pos.netPosition > 0 ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "2px 8px", borderRadius: "999px", background: "#dcfce7", color: "#16a34a", fontSize: "12px", fontWeight: 600 }}>
                        <TrendingUp size={12} /> Creditor (Owed Money)
                      </span>
                    ) : (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "2px 8px", borderRadius: "999px", background: "#fee2e2", color: "var(--kalki-danger)", fontSize: "12px", fontWeight: 600 }}>
                        <TrendingDown size={12} /> Debtor (Owes Money)
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: "right", fontWeight: "bold", color: Math.abs(pos.netPosition) < 0.01 ? "var(--kalki-text-primary)" : pos.netPosition > 0 ? "#16a34a" : "var(--kalki-danger)" }}>
                    {pos.netPosition > 0 ? '+' : ''}{pos.netPosition.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
