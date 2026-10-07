"use client";

import React, { useState, useEffect } from "react";
import { useSessionView } from "@/components/AppShell";
import { fetchCustomerBalances } from "@/app/finance/receivables-actions";
import { Search, UserCheck } from "lucide-react";

export function CustomerBalancesClient() {
  const { selected } = useSessionView();
  const [loading, setLoading] = useState(false);
  const [balances, setBalances] = useState<any[]>([]);

  const loadBalances = async () => {
    if (!selected) return;
    setLoading(true);
    const res = await fetchCustomerBalances(selected.organizationId);
    if (res.success) {
      setBalances(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadBalances();
  }, [selected]);

  return (
    <div className="kalki-main-content">
      <div className="kalki-page-header">
        <div>
          <h1 className="kalki-page-title">Customer Balances</h1>
          <p className="kalki-page-description">Real-time balances calculated dynamically from Invoices, Receipts, and Credit Notes.</p>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '64px', color: '#94a3b8' }}>Loading balances...</div>
      ) : balances.length === 0 ? (
        <div className="kalki-section" style={{ marginTop: '24px', textAlign: 'center', padding: '64px', color: '#64748b' }}>
          <UserCheck size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
          <p>No customer balances found.</p>
          <p style={{ fontSize: '13px', marginTop: '8px' }}>Create an invoice to generate a balance.</p>
        </div>
      ) : (
        <div className="kalki-section" style={{ padding: 0, overflow: 'hidden', marginTop: '24px' }}>
          <table className="kalki-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th style={{ textAlign: 'right' }}>Total Invoiced</th>
                <th style={{ textAlign: 'right' }}>Total Receipts</th>
                <th style={{ textAlign: 'right' }}>Credit Notes</th>
                <th style={{ textAlign: 'right' }}>Outstanding Balance</th>
                <th style={{ textAlign: 'center', width: '100px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {balances.map(b => (
                <tr key={b.customerId}>
                  <td style={{ fontWeight: 600, color: '#0f172a' }}>{b.customerName || b.customerId}</td>
                  <td style={{ textAlign: 'right' }}>₹{Number(b.totalInvoiced).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td style={{ textAlign: 'right', color: '#16a34a' }}>₹{Number(b.totalReceipts).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td style={{ textAlign: 'right', color: '#dc2626' }}>₹{Number(b.totalCreditNotes).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: Number(b.currentBalance) > 0 ? '#b91c1c' : '#15803d' }}>
                    ₹{Number(b.currentBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button 
                      className="kalki-button" 
                      style={{ padding: "4px 12px", fontSize: "12px", backgroundColor: "#f1f5f9", color: "#334155", border: "1px solid #cbd5e1" }}
                      onClick={() => {
                        // In a production env, this would call an API or use jspdf to generate the statement.
                        alert(`Generating Statement of Account PDF for ${b.customerName || b.customerId}...`);
                      }}
                    >
                      Export PDF
                    </button>
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
