"use client";

import React, { useState, useEffect } from "react";
import { useSessionView } from "@/components/AppShell";
import { fetchAgeingReport } from "@/app/finance/receivables-actions";
import { Search, CalendarClock } from "lucide-react";

export function AgeingClient() {
  const { selected } = useSessionView();
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<any[]>([]);

  const loadReport = async () => {
    if (!selected) return;
    setLoading(true);
    const res = await fetchAgeingReport(selected.organizationId);
    if (res.success) {
      setReport(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadReport();
  }, [selected]);

  return (
    <div className="kalki-main-content">
      <div className="kalki-page-header">
        <div>
          <h1 className="kalki-page-title">Receivables Ageing</h1>
          <p className="kalki-page-description">Track outstanding invoices grouped by how far past due they are.</p>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '64px', color: '#94a3b8' }}>Loading report...</div>
      ) : report.length === 0 ? (
        <div className="kalki-section" style={{ marginTop: '24px', textAlign: 'center', padding: '64px', color: '#64748b' }}>
          <CalendarClock size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
          <p>No outstanding invoices found.</p>
          <p style={{ fontSize: '13px', marginTop: '8px' }}>Your ageing report is clean!</p>
        </div>
      ) : (
        <div className="kalki-section" style={{ padding: 0, overflow: 'hidden', marginTop: '24px' }}>
          <table className="kalki-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th style={{ textAlign: 'right' }}>Current (0-30 Days)</th>
                <th style={{ textAlign: 'right' }}>31-60 Days</th>
                <th style={{ textAlign: 'right' }}>61-90 Days</th>
                <th style={{ textAlign: 'right' }}>90+ Days (Critical)</th>
              </tr>
            </thead>
            <tbody>
              {report.map(r => (
                <tr key={r.customerId}>
                  <td style={{ fontWeight: 600, color: '#0f172a' }}>{r.customerName || r.customerId}</td>
                  <td style={{ textAlign: 'right', color: '#334155' }}>₹{Number(r.current).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td style={{ textAlign: 'right', color: '#ca8a04' }}>₹{Number(r.days31to60).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td style={{ textAlign: 'right', color: '#ea580c' }}>₹{Number(r.days61to90).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>
                    ₹{Number(r.over90).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
