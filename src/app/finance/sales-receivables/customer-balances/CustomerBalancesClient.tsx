"use client";

import React, { useState, useEffect } from "react";
import { useSessionView } from "@/components/AppShell";
import { fetchCustomerBalances } from "@/app/finance/receivables-actions";
import { Search, UserCheck } from "lucide-react";
import { useSearchParams } from "next/navigation";
import SearchFilterBar from "@/components/sales/SearchFilterBar";
import Pagination from "@/components/sales/Pagination";

export function CustomerBalancesClient() {
  const { selected } = useSessionView();
  const [loading, setLoading] = useState(false);
  const [balances, setBalances] = useState<any[]>([]);
  const searchParams = useSearchParams();
  const [total, setTotal] = useState(0);

  const loadBalances = async () => {
    if (!selected) return;
    setLoading(true);
    const q = searchParams.get('q') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const res = await fetchCustomerBalances(selected.organizationId, q, page);
    if (res.success) {
      setBalances(res.data);
      setTotal(res.total || 0);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadBalances();
  }, [selected, searchParams]);

  return (
    <div className="kalki-main-content">
      <div className="kalki-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="kalki-page-title">Customer Balances</h1>
          <p className="kalki-page-description">Real-time balances calculated dynamically from Invoices, Receipts, and Credit Notes.</p>
        </div>
        <SearchFilterBar showDateFilter={false} />
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
        <div className="kalki-section" style={{ padding: 0, marginTop: '24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ overflow: 'auto', maxHeight: 'calc(100vh - 280px)' }}>
            <table className="kalki-table">
              <thead>
                <tr>
                  <th style={{ position: 'sticky', top: 0, backgroundColor: '#f8fafc', zIndex: 10 }}>Customer</th>
                  <th style={{ position: 'sticky', top: 0, backgroundColor: '#f8fafc', zIndex: 10, textAlign: 'right' }}>Total Invoiced</th>
                  <th style={{ position: 'sticky', top: 0, backgroundColor: '#f8fafc', zIndex: 10, textAlign: 'right' }}>Total Receipts</th>
                  <th style={{ position: 'sticky', top: 0, backgroundColor: '#f8fafc', zIndex: 10, textAlign: 'right' }}>Credit Notes</th>
                  <th style={{ position: 'sticky', top: 0, backgroundColor: '#f8fafc', zIndex: 10, textAlign: 'right' }}>Outstanding Balance</th>
                  <th style={{ position: 'sticky', top: 0, backgroundColor: '#f8fafc', zIndex: 10, textAlign: 'center', width: '100px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {balances.map(b => (
                  <tr key={b.customerId}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{b.customerName || b.customerId}</div>
                      {b.customerPhone && <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{b.customerPhone}</div>}
                    </td>
                    <td style={{ textAlign: 'right' }}>₹{Number(b.totalInvoiced).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td style={{ textAlign: 'right', color: '#16a34a' }}>₹{Number(b.totalReceipts).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td style={{ textAlign: 'right', color: '#dc2626' }}>₹{Number(b.totalCreditNotes).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: Number(b.currentBalance) > 0 ? '#b91c1c' : '#15803d' }}>
                      ₹{Number(b.currentBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button 
                        className="kalki-button" 
                        style={{ padding: "4px 12px", fontSize: "12px", backgroundColor: "#f1f5f9", color: "#334155", border: "1px solid #cbd5e1", cursor: "pointer" }}
                        onClick={() => {
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
          <Pagination totalPages={Math.ceil(total / 10)} currentPage={parseInt(searchParams.get("page") || "1", 10)} />
        </div>
      )}
    </div>
  );
}
