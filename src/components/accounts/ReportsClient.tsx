"use client";

import React, { useState, useEffect } from "react";
import { BarChart3, Download, Filter, FileSpreadsheet } from "lucide-react";
import { useSessionView } from "@/components/AppShell";
import { fetchFinancialStatements } from "@/app/finance/report-actions";
import { fetchLocations } from "@/app/finance/actions";

export function ReportsClient() {
  const { selected } = useSessionView();
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    locationId: "ALL",
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  const [activeReport, setActiveReport] = useState<"PL" | "BS" | "TB">("PL");

  const loadReport = () => {
    if (!selected) return;
    setLoading(true);
    fetchFinancialStatements(selected.organizationId, filters.locationId, filters.startDate + "T00:00:00Z", filters.endDate + "T23:59:59Z")
      .then(res => {
        if (res.success) setReportData(res.data);
        else setError(res.error);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (!selected) return;
    fetchLocations(selected.organizationId).then(res => {
      if (res.success) setLocations(res.data as any[]);
    });
  }, [selected]);

  useEffect(() => {
    loadReport();
  }, [selected, filters]);

  if (!selected) return <div className="p-8 text-center">Please select an organization context.</div>;

  return (
    <div className="kalki-main-content">
      <div className="kalki-page-header" style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 className="kalki-page-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <BarChart3 size={24} style={{ color: "var(--kalki-primary)" }} />
            Financial Statements
          </h1>
          <p className="kalki-page-description">Real-time P&L, Balance Sheet, and Trial Balance generation.</p>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <select 
            value={filters.locationId} 
            onChange={e => setFilters({...filters, locationId: e.target.value})}
            className="kalki-select"
            style={{ height: "36px" }}
          >
            <option value="ALL">All Branches (Consolidated)</option>
            {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <input 
            type="date" 
            value={filters.startDate} 
            onChange={e => setFilters({...filters, startDate: e.target.value})}
            className="kalki-input"
            style={{ height: "36px" }}
          />
          <span style={{ fontSize: "14px", color: "var(--kalki-text-secondary)", fontWeight: 500 }}>to</span>
          <input 
            type="date" 
            value={filters.endDate} 
            onChange={e => setFilters({...filters, endDate: e.target.value})}
            className="kalki-input"
            style={{ height: "36px" }}
          />
          <button className="kalki-button" style={{ height: "36px", background: "var(--kalki-text-primary)", color: "white", border: "none", display: "flex", alignItems: "center", gap: "8px" }}>
            <Download size={16} /> Export
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: "16px", borderBottom: "1px solid var(--kalki-border)", marginBottom: "24px" }}>
        <button
          onClick={() => setActiveReport("PL")}
          style={{ 
            display: "flex", alignItems: "center", gap: "8px", padding: "12px 16px", 
            borderBottom: activeReport === "PL" ? "2px solid var(--kalki-primary)" : "2px solid transparent",
            color: activeReport === "PL" ? "var(--kalki-primary)" : "var(--kalki-text-secondary)",
            background: "none", borderTop: "none", borderLeft: "none", borderRight: "none",
            fontWeight: activeReport === "PL" ? 600 : 500, cursor: "pointer", fontSize: "14px"
          }}
        >
          Profit & Loss
        </button>
        <button
          onClick={() => setActiveReport("BS")}
          style={{ 
            display: "flex", alignItems: "center", gap: "8px", padding: "12px 16px", 
            borderBottom: activeReport === "BS" ? "2px solid var(--kalki-primary)" : "2px solid transparent",
            color: activeReport === "BS" ? "var(--kalki-primary)" : "var(--kalki-text-secondary)",
            background: "none", borderTop: "none", borderLeft: "none", borderRight: "none",
            fontWeight: activeReport === "BS" ? 600 : 500, cursor: "pointer", fontSize: "14px"
          }}
        >
          Balance Sheet
        </button>
        <button
          onClick={() => setActiveReport("TB")}
          style={{ 
            display: "flex", alignItems: "center", gap: "8px", padding: "12px 16px", 
            borderBottom: activeReport === "TB" ? "2px solid var(--kalki-primary)" : "2px solid transparent",
            color: activeReport === "TB" ? "var(--kalki-primary)" : "var(--kalki-text-secondary)",
            background: "none", borderTop: "none", borderLeft: "none", borderRight: "none",
            fontWeight: activeReport === "TB" ? 600 : 500, cursor: "pointer", fontSize: "14px"
          }}
        >
          Trial Balance
        </button>
      </div>

      {error && <div style={{ color: "var(--kalki-danger)", padding: "16px", background: "#fff5f5", border: "1px solid var(--kalki-danger)", borderRadius: "var(--kalki-radius)", marginBottom: "24px" }}>{error}</div>}

      <div className="kalki-section" style={{ minHeight: "600px" }}>
        <div className="kalki-section-content" style={{ padding: "48px 32px" }}>
          {loading || !reportData ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "300px", color: "var(--kalki-text-secondary)", fontSize: "16px" }}>Generating report...</div>
          ) : (
            <>
              <div style={{ textAlign: "center", marginBottom: "48px", borderBottom: "1px solid var(--kalki-border)", paddingBottom: "32px" }}>
                <h2 style={{ fontSize: "20px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--kalki-text-primary)", margin: "0 0 8px 0" }}>
                  {activeReport === "PL" ? "Statement of Profit & Loss" : activeReport === "BS" ? "Balance Sheet" : "Trial Balance"}
                </h2>
                <p style={{ fontSize: "14px", color: "var(--kalki-text-secondary)", margin: 0 }}>
                  For the period {filters.startDate} to {filters.endDate} | {filters.locationId === "ALL" ? "Consolidated" : "Branch Specific"}
                </p>
              </div>

              {activeReport === "PL" && (
                <div style={{ maxWidth: "800px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "48px" }}>
                  {/* REVENUE */}
                  <div>
                    <h3 style={{ fontSize: "14px", fontWeight: "bold", color: "var(--kalki-text-primary)", borderBottom: "2px solid var(--kalki-text-primary)", marginBottom: "16px", paddingBottom: "4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Revenue</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginLeft: "16px" }}>
                      {reportData.pl.revenue.map((acc: any) => (
                        <div key={acc.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", color: "var(--kalki-text-secondary)", padding: "4px 8px", borderRadius: "4px" }}>
                          <span>{acc.name} <span style={{ fontSize: "12px", color: "var(--kalki-border)", marginLeft: "8px" }}>{acc.code}</span></span>
                          <span>{acc.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "16px", paddingTop: "12px", borderTop: "1px solid var(--kalki-border)", fontWeight: "bold", color: "var(--kalki-text-primary)", fontSize: "14px" }}>
                      <span>Total Revenue</span>
                      <span>₹{reportData.pl.totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  {/* EXPENSES */}
                  <div>
                    <h3 style={{ fontSize: "14px", fontWeight: "bold", color: "var(--kalki-text-primary)", borderBottom: "2px solid var(--kalki-text-primary)", marginBottom: "16px", paddingBottom: "4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Expenses</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginLeft: "16px" }}>
                      {reportData.pl.expense.map((acc: any) => (
                        <div key={acc.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", color: "var(--kalki-text-secondary)", padding: "4px 8px", borderRadius: "4px" }}>
                          <span>{acc.name} <span style={{ fontSize: "12px", color: "var(--kalki-border)", marginLeft: "8px" }}>{acc.code}</span></span>
                          <span>{acc.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "16px", paddingTop: "12px", borderTop: "1px solid var(--kalki-border)", fontWeight: "bold", color: "var(--kalki-text-primary)", fontSize: "14px" }}>
                      <span>Total Expenses</span>
                      <span>₹{reportData.pl.totalExpense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  {/* NET PROFIT */}
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "16px 24px", borderTop: "4px solid var(--kalki-text-primary)", borderBottom: "4px solid var(--kalki-text-primary)", fontWeight: 900, fontSize: "18px", color: "var(--kalki-text-primary)", background: "#f8fafc", borderRadius: "6px" }}>
                    <span>Net Profit (Loss)</span>
                    <span style={{ color: reportData.pl.netProfit >= 0 ? "#15803d" : "#b91c1c" }}>
                      ₹{reportData.pl.netProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}

              {activeReport === "BS" && (
                <div style={{ maxWidth: "1000px", margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "64px" }}>
                  {/* ASSETS */}
                  <div>
                    <h3 style={{ fontSize: "14px", fontWeight: "bold", color: "var(--kalki-text-primary)", borderBottom: "2px solid var(--kalki-text-primary)", marginBottom: "24px", paddingBottom: "4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Assets</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginLeft: "8px" }}>
                      {reportData.bs.assets.map((acc: any) => (
                        <div key={acc.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", color: "var(--kalki-text-secondary)" }}>
                          <span>{acc.name}</span>
                          <span>{acc.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "32px", paddingTop: "12px", borderTop: "2px solid var(--kalki-text-primary)", fontWeight: "bold", color: "var(--kalki-text-primary)" }}>
                      <span>Total Assets</span>
                      <span>₹{reportData.bs.totalAssets.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  {/* LIABILITIES & EQUITY */}
                  <div>
                    <h3 style={{ fontSize: "14px", fontWeight: "bold", color: "var(--kalki-text-primary)", borderBottom: "2px solid var(--kalki-text-primary)", marginBottom: "24px", paddingBottom: "4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Liabilities & Equity</h3>
                    
                    <div style={{ fontSize: "12px", fontWeight: "bold", color: "var(--kalki-text-secondary)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px", background: "#f1f5f9", padding: "4px 8px" }}>Liabilities</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginLeft: "8px", marginBottom: "32px" }}>
                      {reportData.bs.liabilities.map((acc: any) => (
                        <div key={acc.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", color: "var(--kalki-text-secondary)" }}>
                          <span>{acc.name}</span>
                          <span>{acc.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                      ))}
                    </div>

                    <div style={{ fontSize: "12px", fontWeight: "bold", color: "var(--kalki-text-secondary)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px", background: "#f1f5f9", padding: "4px 8px" }}>Equity</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginLeft: "8px" }}>
                      {reportData.bs.equity.map((acc: any) => (
                        <div key={acc.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", color: "var(--kalki-text-secondary)" }}>
                          <span>{acc.name}</span>
                          <span>{acc.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                      ))}
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", color: "var(--kalki-primary)", fontWeight: 500, padding: "4px 0" }}>
                        <span>Retained Earnings (Current Period)</span>
                        <span>{reportData.pl.netProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "32px", paddingTop: "12px", borderTop: "2px solid var(--kalki-text-primary)", fontWeight: "bold", color: "var(--kalki-text-primary)" }}>
                      <span>Total Liabilities & Equity</span>
                      <span>₹{reportData.bs.totalEquity.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              )}

              {activeReport === "TB" && (
                <div style={{ maxWidth: "900px", margin: "0 auto" }}>
                  <table style={{ width: "100%", textAlign: "left", fontSize: "14px", borderCollapse: "collapse" }}>
                    <thead style={{ borderBottom: "2px solid var(--kalki-text-primary)" }}>
                      <tr>
                        <th style={{ padding: "12px 8px", fontWeight: "bold", color: "var(--kalki-text-primary)" }}>Account Code</th>
                        <th style={{ padding: "12px 8px", fontWeight: "bold", color: "var(--kalki-text-primary)" }}>Account Name</th>
                        <th style={{ padding: "12px 8px", fontWeight: "bold", color: "var(--kalki-text-primary)", textAlign: "right", width: "150px" }}>Debit (₹)</th>
                        <th style={{ padding: "12px 8px", fontWeight: "bold", color: "var(--kalki-text-primary)", textAlign: "right", width: "150px" }}>Credit (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.trialBalance.map((acc: any) => (
                        <tr key={acc.id} style={{ borderBottom: "1px solid var(--kalki-border)" }}>
                          <td style={{ padding: "12px 8px", color: "var(--kalki-text-secondary)", fontFamily: "monospace" }}>{acc.code}</td>
                          <td style={{ padding: "12px 8px", color: "var(--kalki-text-primary)" }}>{acc.name}</td>
                          <td style={{ padding: "12px 8px", textAlign: "right", color: "var(--kalki-text-secondary)" }}>{acc.debitAmount > 0 ? acc.debitAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}</td>
                          <td style={{ padding: "12px 8px", textAlign: "right", color: "var(--kalki-text-secondary)" }}>{acc.creditAmount > 0 ? acc.creditAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot style={{ borderTop: "2px solid var(--kalki-text-primary)", fontWeight: "bold", background: "#f8fafc" }}>
                      <tr>
                        <td colSpan={2} style={{ padding: "16px 8px", textAlign: "right" }}>Totals:</td>
                        <td style={{ padding: "16px 8px", textAlign: "right", color: "var(--kalki-text-primary)" }}>
                          {reportData.trialBalance.reduce((s: number, a: any) => s + a.debitAmount, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: "16px 8px", textAlign: "right", color: "var(--kalki-text-primary)" }}>
                          {reportData.trialBalance.reduce((s: number, a: any) => s + a.creditAmount, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
