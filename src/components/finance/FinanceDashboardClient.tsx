"use client";

import React, { useState, useEffect } from "react";
import { Wallet, Landmark, TrendingUp, AlertCircle, FileText, ArrowUpRight, ArrowDownRight, RefreshCw, CheckCircle2 } from "lucide-react";
import { useSessionView } from "@/components/AppShell";
import { getDashboardData } from "@/app/finance/actions";

export function FinanceDashboardClient() {
  const { selected } = useSessionView();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = () => {
    if (!selected) return;
    setLoading(true);
    setError(null);
    getDashboardData(selected.organizationId, selected.locationId).then((res) => {
      if (res.success) {
        setData(res.data);
      } else {
        setError(res.error || "Failed to load dashboard data");
      }
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, [selected]);

  if (!selected) {
    return (
      <div className="kalki-main-content">
        <div className="kalki-section">
          <div className="kalki-section-content" style={{ textAlign: "center", padding: "40px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "bold", margin: "0 0 8px 0" }}>No Context Selected</h2>
            <p style={{ color: "var(--kalki-text-secondary)", margin: 0 }}>Please select a valid Location context from the top navigation bar to view the Finance Dashboard.</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="kalki-main-content">
        <div className="kalki-section">
          <div className="kalki-section-content" style={{ textAlign: "center", padding: "40px" }}>
            <AlertCircle size={48} style={{ color: "var(--kalki-danger)", margin: "0 auto 16px" }} />
            <h2 style={{ fontSize: "18px", fontWeight: "bold", margin: "0 0 8px 0" }}>Dashboard Error</h2>
            <p style={{ color: "var(--kalki-text-secondary)", margin: 0 }}>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="kalki-main-content">
        <div className="kalki-section">
          <div className="kalki-section-content" style={{ textAlign: "center", padding: "40px", color: "var(--kalki-text-secondary)" }}>
            <RefreshCw size={32} className="lucide-spin" style={{ margin: "0 auto 16px", animation: "spin 2s linear infinite" }} />
            <p>Loading ledger streams...</p>
          </div>
        </div>
      </div>
    );
  }

  const { pendingApprovals, cashBalance, payableBalance, revenueBalance, recentEntries } = data;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(val);
  };

  return (
    <div className="kalki-main-content">
      <div className="kalki-page-header" style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 className="kalki-page-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Landmark size={24} style={{ color: "var(--kalki-primary)" }} />
            Central Finance Ledger
          </h1>
          <p className="kalki-page-description">Real-time consolidated view of organizational finances.</p>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <button className="kalki-button kalki-button--secondary" onClick={() => window.location.reload()}>
            <RefreshCw size={16} style={{ marginRight: "8px" }} /> Sync Ledgers
          </button>
          <button className="kalki-button kalki-button--primary">
            <FileText size={16} style={{ marginRight: "8px" }} /> Export Tally Data
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        {/* Cash Position */}
        <div className="kalki-section" style={{ position: "relative" }}>
          <div className="kalki-section-content">
            <div style={{ position: "absolute", top: "16px", right: "16px", opacity: 0.1 }}>
              <Wallet size={64} color="var(--kalki-primary)" />
            </div>
            <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--kalki-text-secondary)", textTransform: "uppercase", marginBottom: "8px", margin: 0 }}>Net Cash / Bank</p>
            <h3 style={{ fontSize: "28px", fontWeight: "bold", margin: "4px 0 16px 0", color: "var(--kalki-text-primary)" }}>{formatCurrency(cashBalance)}</h3>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "12px", fontWeight: 500, color: "#16a34a", background: "#dcfce7", padding: "4px 8px", borderRadius: "4px" }}>
              <ArrowUpRight size={14} /> Positive Liquidity
            </div>
          </div>
        </div>

        {/* Total Payables */}
        <div className="kalki-section" style={{ position: "relative" }}>
          <div className="kalki-section-content">
            <div style={{ position: "absolute", top: "16px", right: "16px", opacity: 0.1 }}>
              <TrendingUp size={64} color="var(--kalki-danger)" />
            </div>
            <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--kalki-text-secondary)", textTransform: "uppercase", marginBottom: "8px", margin: 0 }}>Vendor Payables</p>
            <h3 style={{ fontSize: "28px", fontWeight: "bold", margin: "4px 0 16px 0", color: "var(--kalki-text-primary)" }}>{formatCurrency(payableBalance)}</h3>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "12px", fontWeight: 500, color: "var(--kalki-danger)", background: "#fee2e2", padding: "4px 8px", borderRadius: "4px" }}>
              <ArrowDownRight size={14} /> Total Liability
            </div>
          </div>
        </div>

        {/* Revenue */}
        <div className="kalki-section" style={{ position: "relative" }}>
          <div className="kalki-section-content">
            <div style={{ position: "absolute", top: "16px", right: "16px", opacity: 0.1 }}>
              <TrendingUp size={64} color="var(--kalki-primary)" />
            </div>
            <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--kalki-text-secondary)", textTransform: "uppercase", marginBottom: "8px", margin: 0 }}>Sales Revenue</p>
            <h3 style={{ fontSize: "28px", fontWeight: "bold", margin: "4px 0 16px 0", color: "var(--kalki-text-primary)" }}>{formatCurrency(revenueBalance)}</h3>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "12px", fontWeight: 500, color: "var(--kalki-primary)", background: "#dbeafe", padding: "4px 8px", borderRadius: "4px" }}>
              <ArrowUpRight size={14} /> Recognized Income
            </div>
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="kalki-section" style={{ position: "relative" }}>
          <div className="kalki-section-content">
            <div style={{ position: "absolute", top: "16px", right: "16px", opacity: 0.1 }}>
              <AlertCircle size={64} color="#f59e0b" />
            </div>
            <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--kalki-text-secondary)", textTransform: "uppercase", marginBottom: "8px", margin: 0 }}>Pending Approvals</p>
            <h3 style={{ fontSize: "28px", fontWeight: "bold", margin: "4px 0 16px 0", color: "var(--kalki-text-primary)" }}>{pendingApprovals}</h3>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "12px", fontWeight: 500, color: "#d97706", background: "#fef3c7", padding: "4px 8px", borderRadius: "4px" }}>
              Requires Maker/Checker
            </div>
          </div>
        </div>
      </div>

      <div className="kalki-section">
        <div className="kalki-section-header">
          <div className="kalki-section-title">
            <RefreshCw size={16} style={{ color: "var(--kalki-primary)" }} />
            Live Ledger Stream
          </div>
        </div>
        <div className="kalki-table-container">
          <table className="kalki-table">
            <thead>
              <tr>
                <th>Date & ID</th>
                <th>Module / Status</th>
                <th>Narration</th>
                <th style={{ textAlign: "right" }}>Debit (₹)</th>
                <th style={{ textAlign: "right" }}>Credit (₹)</th>
              </tr>
            </thead>
            <tbody>
              {recentEntries.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "32px", color: "var(--kalki-text-secondary)" }}>
                    <FileText size={48} style={{ opacity: 0.2, margin: "0 auto 12px" }} />
                    No ledger entries found.
                  </td>
                </tr>
              ) : (
                recentEntries.map((entry: any) => {
                  const totalDebit = entry.lines.filter((l:any) => l.isDebit).reduce((s:number, l:any) => s + parseFloat(l.amount), 0);
                  const totalCredit = entry.lines.filter((l:any) => !l.isDebit).reduce((s:number, l:any) => s + parseFloat(l.amount), 0);
                  
                  return (
                    <tr key={entry.id}>
                      <td>
                        <div style={{ fontWeight: 500, color: "var(--kalki-text-primary)" }}>
                          {new Date(entry.entryDate).toLocaleDateString('en-IN', {
                            day: '2-digit', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--kalki-text-secondary)", marginTop: "4px", fontFamily: "monospace" }} title={entry.id}>
                          {entry.id.substring(0, 13)}...
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "inline-block", padding: "2px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", background: "#f1f5f9", border: "1px solid var(--kalki-border)", color: "var(--kalki-text-secondary)" }}>
                          {entry.sourceModule}
                        </div>
                        <div style={{ marginTop: "8px", fontSize: "11px", fontWeight: 500, display: "flex", alignItems: "center", gap: "4px" }}>
                          {entry.status === 'POSTED' ? (
                            <span style={{ color: "#16a34a", display: "flex", alignItems: "center", gap: "4px" }}><CheckCircle2 size={12}/> POSTED</span>
                          ) : (
                            <span style={{ color: "#f59e0b", display: "flex", alignItems: "center", gap: "4px" }}><AlertCircle size={12}/> {entry.status}</span>
                          )}
                        </div>
                      </td>
                      <td style={{ maxWidth: "300px" }}>
                        <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "var(--kalki-text-primary)" }} title={entry.narration}>
                          {entry.narration}
                        </div>
                        <div style={{ marginTop: "4px", display: "flex", flexWrap: "wrap", gap: "4px" }}>
                          {entry.lines.map((l:any) => (
                            <span key={l.id} style={{ fontSize: "10px", background: "#f8fafc", padding: "2px 4px", borderRadius: "4px", color: "var(--kalki-text-secondary)", border: "1px solid var(--kalki-border)" }}>
                              {l.sourceReferenceId}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ textAlign: "right", fontFamily: "monospace", color: "var(--kalki-text-primary)" }}>
                        {formatCurrency(totalDebit)}
                      </td>
                      <td style={{ textAlign: "right", fontFamily: "monospace", color: "var(--kalki-text-primary)" }}>
                        {formatCurrency(totalCredit)}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
