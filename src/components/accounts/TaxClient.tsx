"use client";

import React, { useState, useEffect } from "react";
import { FileText, Download, TrendingUp, AlertCircle, Calendar } from "lucide-react";
import { useSessionView } from "@/components/AppShell";
import { fetchGSTSummary } from "@/app/finance/tax-actions";

export function TaxClient() {
  const { selected } = useSessionView();
  const [loading, setLoading] = useState(false);
  const [taxData, setTaxData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Month selection (default to current month)
  const [month, setMonth] = useState(new Date().toISOString().substring(0, 7));

  useEffect(() => {
    if (!selected) return;
    setLoading(true);

    const year = parseInt(month.split("-")[0]);
    const mth = parseInt(month.split("-")[1]) - 1;
    const startDate = new Date(year, mth, 1);
    const endDate = new Date(year, mth + 1, 0, 23, 59, 59);

    fetchGSTSummary(selected.organizationId, startDate, endDate).then(res => {
      if (res.success) setTaxData(res.data as any[]);
      else setError(res.error);
      setLoading(false);
    });
  }, [selected, month]);

  if (!selected) return <div className="p-8 text-center">Please select an organization context.</div>;

  const totalInput = taxData.reduce((s, t) => s + t.inputTax, 0);
  const totalOutput = taxData.reduce((s, t) => s + t.outputTax, 0);
  const totalPayable = taxData.reduce((s, t) => s + t.netTaxPayable, 0);

  return (
    <div className="kalki-main-content">
      <div className="kalki-page-header" style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 className="kalki-page-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <FileText size={24} style={{ color: "var(--kalki-primary)" }} />
            Tax & Compliance (GST)
          </h1>
          <p className="kalki-page-description">Automated GST calculation engine (GSTR-3B Summary).</p>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "white", border: "1px solid var(--kalki-border)", borderRadius: "var(--kalki-radius)", padding: "4px 12px", height: "36px" }}>
            <Calendar size={16} color="var(--kalki-text-secondary)" />
            <input 
              type="month" 
              value={month} 
              onChange={e => setMonth(e.target.value)} 
              style={{ border: "none", background: "transparent", fontSize: "14px", color: "var(--kalki-text-primary)", outline: "none" }} 
            />
          </div>
          <button className="kalki-button kalki-button--primary" style={{ height: "36px" }}>
            <Download size={16} style={{ marginRight: "8px" }} /> Export GSTR-3B
          </button>
        </div>
      </div>

      {error && (
        <div className="kalki-section" style={{ border: "1px solid var(--kalki-danger)", background: "#fff5f5", marginBottom: "24px" }}>
          <div className="kalki-section-content" style={{ display: "flex", gap: "12px", color: "var(--kalki-danger)", alignItems: "flex-start" }}>
            <AlertCircle size={20} style={{ flexShrink: 0, marginTop: "2px" }} />
            <div>
              <h3 style={{ margin: "0 0 4px 0", fontWeight: 600 }}>Database Error</h3>
              <p style={{ margin: 0, fontSize: "13px", wordBreak: "break-all" }}>{error}</p>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px", marginBottom: "32px" }}>
        <div className="kalki-section" style={{ position: "relative", margin: 0 }}>
          <div className="kalki-section-content">
            <div style={{ position: "absolute", top: "16px", right: "16px", opacity: 0.1 }}>
              <TrendingUp size={64} color="var(--kalki-danger)" />
            </div>
            <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--kalki-text-secondary)", textTransform: "uppercase", marginBottom: "8px", margin: 0 }}>Total Output Tax (Sales)</p>
            <h3 style={{ fontSize: "28px", fontWeight: "bold", margin: "4px 0 16px 0", color: "var(--kalki-text-primary)" }}>₹{totalOutput.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
            <div style={{ fontSize: "12px", color: "var(--kalki-text-secondary)" }}>
              GST collected from customers
            </div>
          </div>
        </div>

        <div className="kalki-section" style={{ position: "relative", margin: 0 }}>
          <div className="kalki-section-content">
            <div style={{ position: "absolute", top: "16px", right: "16px", opacity: 0.1 }}>
              <TrendingUp size={64} color="#16a34a" />
            </div>
            <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--kalki-text-secondary)", textTransform: "uppercase", marginBottom: "8px", margin: 0 }}>Total ITC (Purchases)</p>
            <h3 style={{ fontSize: "28px", fontWeight: "bold", margin: "4px 0 16px 0", color: "var(--kalki-text-primary)" }}>₹{totalInput.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
            <div style={{ fontSize: "12px", color: "var(--kalki-text-secondary)" }}>
              Input Tax Credit available
            </div>
          </div>
        </div>

        <div className="kalki-section" style={{ position: "relative", margin: 0, border: totalPayable > 0 ? "1px solid #fca5a5" : "1px solid #bbf7d0", background: totalPayable > 0 ? "#fef2f2" : "#f0fdf4" }}>
          <div className="kalki-section-content">
            <div style={{ position: "absolute", top: "16px", right: "16px", opacity: 0.2 }}>
              <AlertCircle size={64} color={totalPayable > 0 ? "var(--kalki-danger)" : "#16a34a"} />
            </div>
            <p style={{ fontSize: "12px", fontWeight: 600, color: totalPayable > 0 ? "#991b1b" : "#166534", textTransform: "uppercase", marginBottom: "8px", margin: 0 }}>Net Tax {totalPayable > 0 ? 'Payable' : 'Refund / Carry Forward'}</p>
            <h3 style={{ fontSize: "28px", fontWeight: "bold", margin: "4px 0 16px 0", color: totalPayable > 0 ? "#7f1d1d" : "#14532d" }}>₹{Math.abs(totalPayable).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
            <div style={{ fontSize: "12px", color: totalPayable > 0 ? "#991b1b" : "#166534" }}>
              Output Tax - ITC
            </div>
          </div>
        </div>
      </div>

      <div className="kalki-section">
        <div className="kalki-section-header">
          <div className="kalki-section-title">
            Branch-wise Breakdown
          </div>
        </div>
        <div className="kalki-table-container">
          <table className="kalki-table">
            <thead>
              <tr>
                <th>Branch</th>
                <th style={{ textAlign: "right" }}>Output Tax (₹)</th>
                <th style={{ textAlign: "right" }}>Input Tax Credit (₹)</th>
                <th style={{ textAlign: "right" }}>Net Tax (₹)</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} style={{ textAlign: "center", padding: "32px", color: "var(--kalki-text-secondary)" }}>Loading tax calculation...</td></tr>
              ) : taxData.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: "center", padding: "32px", color: "var(--kalki-text-secondary)" }}>No transactions found for this period.</td></tr>
              ) : taxData.map(td => (
                <tr key={td.location.id}>
                  <td style={{ fontWeight: 500, color: "var(--kalki-text-primary)" }}>{td.location.name}</td>
                  <td style={{ textAlign: "right", color: "var(--kalki-text-primary)" }}>{td.outputTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td style={{ textAlign: "right", color: "#16a34a" }}>{td.inputTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td style={{ textAlign: "right", fontWeight: "bold", color: td.netTaxPayable > 0 ? "var(--kalki-danger)" : "#16a34a" }}>
                    {td.netTaxPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
