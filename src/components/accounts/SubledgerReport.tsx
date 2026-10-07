"use client";

import React, { useState, useEffect } from "react";
import { useSessionView } from "@/components/AppShell";
import { fetchSubledgerReport } from "@/app/finance/dashboard-actions";
import { FileText, ArrowLeft } from "lucide-react";

export function SubledgerReport({ 
  controlAccountType, 
  title,
  periodFilter,
  onClose 
}: { 
  controlAccountType: string;
  title: string;
  periodFilter?: { startDate?: string; endDate?: string };
  onClose: () => void;
}) {
  const { selected } = useSessionView();
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    fetchSubledgerReport(selected.organizationId, selected.locationId || "ALL", controlAccountType, periodFilter)
      .then(res => {
        if (res.success) setEntries(res.data);
      })
      .finally(() => setLoading(false));
  }, [selected, controlAccountType, periodFilter]);

  const formatCurrency = (val: number | string) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(num || 0);
  };

  // Calculate Running Balance
  let runningBalance = 0;
  const enrichedEntries = [...entries].reverse().map(entry => {
    const debit = parseFloat(entry.debit);
    const credit = parseFloat(entry.credit);
    // For AR (Receivables): Normal balance is Debit (Dr - Cr)
    // For AP (Payables): Normal balance is Credit (Cr - Dr)
    if (controlAccountType === "CUSTOMER_RECEIVABLE") {
      runningBalance += (debit - credit);
    } else {
      runningBalance += (credit - debit);
    }
    return { ...entry, runningBalance };
  }).reverse(); // Reverse back for UI (newest first)

  return (
    <div style={{ padding: "24px", background: "#fff", minHeight: "100%", animation: "fadeIn 0.3s ease-out" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
        <button 
          onClick={onClose}
          className="kalki-button"
          style={{ background: "#f1f5f9", border: "none", padding: "8px", borderRadius: "8px", cursor: "pointer", color: "#475569" }}
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: "24px", color: "#0f172a", fontWeight: "bold" }}>{title} Subledger</h1>
          <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "14px" }}>
            Double-entry view for exact accounting trace
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px", color: "#94a3b8" }}>Loading subledger entries...</div>
      ) : (
        <div style={{ border: "1px solid #e2e8f0", borderRadius: "12px", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                <th style={{ padding: "12px 16px", textAlign: "left", color: "#475569", fontWeight: 600 }}>Date</th>
                <th style={{ padding: "12px 16px", textAlign: "left", color: "#475569", fontWeight: 600 }}>JV Number</th>
                <th style={{ padding: "12px 16px", textAlign: "left", color: "#475569", fontWeight: 600 }}>Narration</th>
                <th style={{ padding: "12px 16px", textAlign: "right", color: "#475569", fontWeight: 600 }}>Debit (Dr)</th>
                <th style={{ padding: "12px 16px", textAlign: "right", color: "#475569", fontWeight: 600 }}>Credit (Cr)</th>
                <th style={{ padding: "12px 16px", textAlign: "right", color: "#0f172a", fontWeight: "bold" }}>Balance</th>
              </tr>
            </thead>
            <tbody>
              {enrichedEntries.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "32px", textAlign: "center", color: "#94a3b8" }}>No ledger entries found for this period.</td>
                </tr>
              ) : (
                enrichedEntries.map((entry) => (
                  <tr key={entry.id} style={{ borderBottom: "1px solid #f1f5f9" }} className="hover:bg-slate-50 transition-colors">
                    <td style={{ padding: "12px 16px", color: "#334155" }}>
                      {new Date(entry.entryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ padding: "12px 16px", fontFamily: "monospace", color: "#3b82f6" }}>{entry.entryNumber}</td>
                    <td style={{ padding: "12px 16px", color: "#334155" }}>{entry.narration}</td>
                    <td style={{ padding: "12px 16px", textAlign: "right", fontFamily: "monospace", color: "#0f172a" }}>
                      {parseFloat(entry.debit) > 0 ? formatCurrency(entry.debit) : "-"}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right", fontFamily: "monospace", color: "#0f172a" }}>
                      {parseFloat(entry.credit) > 0 ? formatCurrency(entry.credit) : "-"}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right", fontFamily: "monospace", fontWeight: 600, color: "#0f172a", background: "#f8fafc" }}>
                      {formatCurrency(entry.runningBalance)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
