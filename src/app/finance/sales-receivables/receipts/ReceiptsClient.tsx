"use client";

import React, { useState, useEffect } from "react";
import { useSessionView } from "@/components/AppShell";
import { processReceipt, fetchReceipts, fetchOpenInvoices } from "@/app/finance/receivables-actions";
import { Plus, Search, FileText } from "lucide-react";
import { useSearchParams } from "next/navigation";
import SearchFilterBar from "@/components/sales/SearchFilterBar";
import Pagination from "@/components/sales/Pagination";

export function ReceiptsClient() {
  const { selected } = useSessionView();
  const searchParams = useSearchParams();
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [receipts, setReceipts] = useState<any[]>([]);
  
  // Customer selection
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");

  // Invoice Allocation
  const [openInvoices, setOpenInvoices] = useState<any[]>([]);
  const [allocations, setAllocations] = useState<Record<string, number>>({});

  const [newReceipt, setNewReceipt] = useState({
    amount: "",
    paymentMethod: "BANK_TRANSFER",
    referenceNumber: "",
    notes: ""
  });

  const loadReceipts = async () => {
    if (!selected) return;
    setLoading(true);
    
    const q = searchParams.get('q') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    let finalStartDate = startDate;
    let finalEndDate = endDate;
    if (!finalStartDate || !finalEndDate) {
      const dEnd = new Date();
      const dStart = new Date();
      dStart.setDate(dEnd.getDate() - 15);
      finalStartDate = finalStartDate || dStart.toISOString().split('T')[0];
      finalEndDate = finalEndDate || dEnd.toISOString().split('T')[0];
    }

    const res = await fetchReceipts(selected.organizationId, q, page, 10, finalStartDate, finalEndDate);
    if (res.success) {
      setReceipts(res.data);
      setTotal(res.total || 0);
    }
    
    // Fetch customers for the dropdown
    fetch(`/api/customers?organizationId=${selected.organizationId}&locationId=${selected.locationId}`)
      .then(r => r.json())
      .then(data => setCustomers(Array.isArray(data.items) ? data.items : []))
      .catch(console.error);
      
    setLoading(false);
  };

  useEffect(() => {
    loadReceipts();
  }, [selected, searchParams]);

  // When customer changes, fetch open invoices
  useEffect(() => {
    if (selectedCustomerId) {
      fetchOpenInvoices(selectedCustomerId).then(res => {
        if (res.success) {
          setOpenInvoices(res.data);
          setAllocations({});
        }
      });
    } else {
      setOpenInvoices([]);
      setAllocations({});
    }
  }, [selectedCustomerId]);

  const handleAllocationChange = (invoiceId: string, value: string) => {
    const num = parseFloat(value);
    setAllocations(prev => ({
      ...prev,
      [invoiceId]: isNaN(num) ? 0 : num
    }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !selectedCustomerId) return;
    
    const totalReceiptAmount = Number(newReceipt.amount);
    if (totalReceiptAmount <= 0) {
      alert("Receipt amount must be greater than 0");
      return;
    }

    const allocs = Object.entries(allocations)
      .filter(([_, amt]) => amt > 0)
      .map(([invoiceId, amountApplied]) => ({ invoiceId, amountApplied }));
      
    const totalAllocated = allocs.reduce((sum, a) => sum + a.amountApplied, 0);
    
    if (totalAllocated > totalReceiptAmount) {
      alert(`Cannot allocate more than the receipt amount (Allocated: ₹${totalAllocated}, Receipt: ₹${totalReceiptAmount})`);
      return;
    }

    setAdding(true);
    const res = await processReceipt({
      organizationId: selected.organizationId,
      locationId: selected.locationId,
      customerId: selectedCustomerId,
      amount: totalReceiptAmount,
      paymentMethod: newReceipt.paymentMethod,
      referenceNumber: newReceipt.referenceNumber,
      notes: newReceipt.notes,
      allocations: allocs
    });

    if (res.success) {
      setShowModal(false);
      setNewReceipt({ amount: "", paymentMethod: "BANK_TRANSFER", referenceNumber: "", notes: "" });
      setSelectedCustomerId("");
      loadReceipts();
    } else {
      alert("Failed: " + res.error);
    }
    setAdding(false);
  };

  const totalAllocated = Object.values(allocations).reduce((sum, val) => sum + (val || 0), 0);
  const unallocated = Number(newReceipt.amount || 0) - totalAllocated;

  return (
    <div className="kalki-main-content">
      <div className="kalki-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="kalki-page-title">Customer Receipts</h1>
          <p className="kalki-page-description">Log incoming customer payments and allocate them against open invoices.</p>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <SearchFilterBar showDateFilter={true} />
          <button className="kalki-button kalki-button--primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> Log Receipt
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '64px', color: '#94a3b8' }}>Loading receipts...</div>
      ) : receipts.length === 0 ? (
        <div className="kalki-section" style={{ marginTop: '24px', textAlign: 'center', padding: '64px', color: '#64748b' }}>
          <FileText size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
          <p>No receipts logged yet for this location.</p>
          <p style={{ fontSize: '13px', marginTop: '8px' }}>Log a receipt to auto-clear Accounts Receivable.</p>
        </div>
      ) : (
        <div className="kalki-section" style={{ padding: 0, overflow: 'hidden', marginTop: '24px' }}>
          <table className="kalki-table">
            <thead>
              <tr>
                <th>Receipt #</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Payment Method</th>
                <th>Reference</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {receipts.map(r => (
                <tr key={r.id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 500, color: '#4338ca' }}>{r.receiptNumber}</td>
                  <td>{new Date(r.receiptDate).toLocaleDateString()}</td>
                  <td style={{ fontWeight: 600 }}>{r.customerName || r.customerId}</td>
                  <td>
                    <span className="kalki-badge" style={{ backgroundColor: '#f1f5f9', color: '#475569' }}>
                      {r.paymentMethod}
                    </span>
                  </td>
                  <td>{r.referenceNumber || "-"}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: '#16a34a' }}>
                    ₹{Number(r.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination totalPages={Math.ceil(total / 10)} currentPage={parseInt(searchParams.get("page") || "1", 10)} />
        </div>
      )}

      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            backgroundColor: '#fff', borderRadius: '12px', width: '700px', maxWidth: '90vw', maxHeight: '90vh',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden', display: 'flex', flexDirection: 'column'
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', margin: 0 }}>Log & Allocate Receipt</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', color: '#64748b', cursor: 'pointer' }}>&times;</button>
            </div>
            <div style={{ padding: '24px', overflowY: 'auto' }}>
              <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Customer <span style={{ color: '#ef4444' }}>*</span></label>
                    <select 
                      required 
                      value={selectedCustomerId}
                      onChange={e => setSelectedCustomerId(e.target.value)}
                      className="kalki-select"
                      style={{ width: '100%' }}
                    >
                      <option value="">Select a customer...</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Amount Received (₹) <span style={{ color: '#ef4444' }}>*</span></label>
                    <input 
                      required type="number" step="0.01" min="0.01"
                      value={newReceipt.amount}
                      onChange={e => setNewReceipt({...newReceipt, amount: e.target.value})}
                      className="kalki-input"
                      style={{ width: '100%' }}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Payment Method <span style={{ color: '#ef4444' }}>*</span></label>
                    <select 
                      value={newReceipt.paymentMethod}
                      onChange={e => setNewReceipt({...newReceipt, paymentMethod: e.target.value})}
                      className="kalki-select"
                      style={{ width: '100%' }}
                    >
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                      <option value="CASH">Cash</option>
                      <option value="CARD">Credit/Debit Card</option>
                      <option value="CHEQUE">Cheque</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Reference Number</label>
                    <input 
                      type="text" 
                      value={newReceipt.referenceNumber}
                      onChange={e => setNewReceipt({...newReceipt, referenceNumber: e.target.value})}
                      className="kalki-input"
                      style={{ width: '100%' }}
                      placeholder="e.g. Txn ID or Cheque No."
                    />
                  </div>
                </div>

                {/* Allocation Section */}
                {selectedCustomerId && openInvoices.length > 0 && (
                  <div style={{ marginTop: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h3 style={{ fontSize: '14px', fontWeight: 600 }}>Allocate to Open Invoices</h3>
                      <div style={{ fontSize: '13px' }}>
                        <span style={{ color: '#64748b' }}>Unallocated: </span>
                        <span style={{ fontWeight: 600, color: unallocated < 0 ? '#ef4444' : '#10b981' }}>₹{unallocated.toFixed(2)}</span>
                      </div>
                    </div>
                    <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #cbd5e1', textAlign: 'left' }}>
                          <th style={{ padding: '8px 4px' }}>Invoice #</th>
                          <th style={{ padding: '8px 4px' }}>Date</th>
                          <th style={{ padding: '8px 4px', textAlign: 'right' }}>Total Amt</th>
                          <th style={{ padding: '8px 4px', textAlign: 'right', width: '120px' }}>Apply (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {openInvoices.map(inv => (
                          <tr key={inv.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '8px 4px' }}>{inv.invoiceNumber}</td>
                            <td style={{ padding: '8px 4px' }}>{new Date(inv.invoiceDate).toLocaleDateString()}</td>
                            <td style={{ padding: '8px 4px', textAlign: 'right' }}>₹{Number(inv.totalAmount).toFixed(2)}</td>
                            <td style={{ padding: '4px' }}>
                              <input 
                                type="number" step="0.01" min="0" max={Number(inv.totalAmount)}
                                className="kalki-input"
                                style={{ width: '100%', padding: '4px 8px', textAlign: 'right' }}
                                value={allocations[inv.id] || ""}
                                onChange={e => handleAllocationChange(inv.id, e.target.value)}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                
                {selectedCustomerId && openInvoices.length === 0 && (
                  <div style={{ marginTop: '16px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', color: '#64748b', fontSize: '13px', textAlign: 'center' }}>
                    No open invoices found for this customer. Payment will be held as unallocated credit.
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                  <button type="button" onClick={() => setShowModal(false)} className="kalki-button kalki-button--secondary">
                    Cancel
                  </button>
                  <button type="submit" disabled={adding || unallocated < 0} className="kalki-button kalki-button--primary">
                    {adding ? "Processing..." : "Process Receipt & Post Ledger"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
