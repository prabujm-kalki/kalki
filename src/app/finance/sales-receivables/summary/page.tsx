"use client";

import { useEffect, useState } from "react";
import { useSessionView } from "@/components/AppShell";
import { fetchReceivablesSummary } from "@/app/finance/receivables-actions";
import { PieChart, TrendingUp, TrendingDown, DollarSign, AlertCircle } from "lucide-react";

export default function SalesReceivablesSummaryPage() {
  const { selected } = useSessionView();
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selected) {
      setLoading(true);
      fetchReceivablesSummary(selected.organizationId)
        .then(res => {
          if (res.success) setSummary(res.data);
        })
        .finally(() => setLoading(false));
    }
  }, [selected]);

  return (
    <div className="kalki-main-content">
      <div className="kalki-page-header">
        <h1 className="kalki-page-title">Sales & Receivables Summary</h1>
        <p className="kalki-page-description">High-level view of Accounts Receivable performance and health.</p>
      </div>

      {loading || !summary ? (
        <div style={{ textAlign: "center", padding: "64px", color: "#94a3b8" }}>Loading metrics...</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px", marginTop: "24px" }}>
          
          {/* Top KPI Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "24px" }}>
            
            <div className="kalki-section" style={{ padding: "24px", display: "flex", alignItems: "center", gap: "16px", borderLeft: "4px solid #3b82f6" }}>
              <div style={{ backgroundColor: "#eff6ff", padding: "16px", borderRadius: "50%", color: "#3b82f6" }}>
                <DollarSign size={24} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: "13px", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Total Outstanding AR</p>
                <h2 style={{ margin: 0, fontSize: "28px", color: "#0f172a", fontWeight: 700 }}>₹{summary.totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h2>
              </div>
            </div>

            <div className="kalki-section" style={{ padding: "24px", display: "flex", alignItems: "center", gap: "16px", borderLeft: "4px solid #10b981" }}>
              <div style={{ backgroundColor: "#ecfdf5", padding: "16px", borderRadius: "50%", color: "#10b981" }}>
                <TrendingUp size={24} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: "13px", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Collected This Month</p>
                <h2 style={{ margin: 0, fontSize: "28px", color: "#0f172a", fontWeight: 700 }}>₹{summary.collectedThisMonth.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h2>
              </div>
            </div>

            <div className="kalki-section" style={{ padding: "24px", display: "flex", alignItems: "center", gap: "16px", borderLeft: "4px solid #f59e0b" }}>
              <div style={{ backgroundColor: "#fef3c7", padding: "16px", borderRadius: "50%", color: "#f59e0b" }}>
                <TrendingDown size={24} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: "13px", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Invoiced This Month</p>
                <h2 style={{ margin: 0, fontSize: "28px", color: "#0f172a", fontWeight: 700 }}>₹{summary.invoicedThisMonth.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h2>
              </div>
            </div>
            
          </div>

          {/* Secondary Metrics */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px" }}>
            <div className="kalki-section" style={{ padding: "32px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
               <h3 style={{ fontSize: "16px", marginBottom: "24px", display: "flex", alignItems: "center", gap: "8px" }}>
                 <PieChart size={18} className="text-gray-500" />
                 Receivables Health Breakdown
               </h3>
               <div style={{ display: "flex", alignItems: "center", gap: "32px" }}>
                  <div style={{ flex: 1 }}>
                     <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "14px" }}>
                       <span style={{ fontWeight: 500, color: "#334155" }}>Current (Not Due)</span>
                       <span style={{ fontWeight: 600 }}>₹{summary.currentAR.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                     </div>
                     <div style={{ height: "12px", width: "100%", backgroundColor: "#f1f5f9", borderRadius: "6px", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${Math.min(100, (summary.currentAR / (summary.totalOutstanding || 1)) * 100)}%`, backgroundColor: "#3b82f6" }}></div>
                     </div>
                  </div>
               </div>
               <div style={{ display: "flex", alignItems: "center", gap: "32px", marginTop: "24px" }}>
                  <div style={{ flex: 1 }}>
                     <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "14px" }}>
                       <span style={{ fontWeight: 500, color: "#ef4444", display: "flex", alignItems: "center", gap: "6px" }}>
                         <AlertCircle size={14} /> Overdue
                       </span>
                       <span style={{ fontWeight: 600, color: "#ef4444" }}>₹{summary.overdueAR.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                     </div>
                     <div style={{ height: "12px", width: "100%", backgroundColor: "#f1f5f9", borderRadius: "6px", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${Math.min(100, (summary.overdueAR / (summary.totalOutstanding || 1)) * 100)}%`, backgroundColor: "#ef4444" }}></div>
                     </div>
                  </div>
               </div>
            </div>

            <div className="kalki-section" style={{ padding: "24px", backgroundColor: "#f8fafc" }}>
               <h3 style={{ fontSize: "14px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "16px" }}>Quick Actions</h3>
               <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                 <a href="/finance/sales-receivables/invoices" className="kalki-button" style={{ textAlign: "center", display: "block", textDecoration: "none", backgroundColor: "#fff", border: "1px solid #cbd5e1", color: "#0f172a" }}>Create Customer Invoice</a>
                 <a href="/finance/sales-receivables/receipts" className="kalki-button kalki-button--primary" style={{ textAlign: "center", display: "block", textDecoration: "none" }}>Log Customer Payment</a>
                 <a href="/finance/sales-receivables/ageing" className="kalki-button" style={{ textAlign: "center", display: "block", textDecoration: "none", backgroundColor: "#fff", border: "1px solid #cbd5e1", color: "#0f172a" }}>View Ageing Report</a>
               </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
