"use client";

import { useEffect, useState } from "react";
import { useSessionView } from "@/components/AppShell";
import { submitCreditNote } from "@/app/finance/receivables-actions";

export default function CreditNotesPage() {
  const { session, selected } = useSessionView();
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [creditNotes, setCreditNotes] = useState<any[]>([]);

  // Form
  const [creditNoteNumber, setCreditNoteNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selected) {
      fetch(`/api/customers?organizationId=${selected.organizationId}&locationId=${selected.locationId}`)
        .then(r => r.json())
        .then(data => setCustomers(Array.isArray(data.items) ? data.items : (Array.isArray(data) ? data : [])))
        .catch(console.error);
    }
  }, [selected]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await submitCreditNote({
        organizationId: selected?.organizationId,
        locationId: selected?.locationId,
        customerId: selectedCustomer,
        creditNoteNumber,
        amount: parseFloat(amount),
        reason
      });
      
      if (res.success) {
        setCreditNotes(prev => [{
          id: res.data.id,
          creditNoteNumber,
          issueDate: new Date().toISOString(),
          amount: parseFloat(amount),
          status: 'issued',
          reason
        }, ...prev]);
        
        setCreditNoteNumber("");
        setAmount("");
        setReason("");
      } else {
        setError(res.error || "Failed to issue credit note");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="kalki-main-content">
      <div className="kalki-page-header">
        <h1 className="kalki-page-title">Credit Notes & Refunds</h1>
        <p className="kalki-page-description">Issue refunds or sales returns (Reduces Accounts Receivable)</p>
      </div>

      <div className="kalki-section" style={{ padding: "24px", marginBottom: "24px" }}>
        <h2 style={{ fontSize: "16px", marginBottom: "16px" }}>Select Customer</h2>
        <select 
          className="kalki-select"
          style={{ maxWidth: "400px" }}
          value={selectedCustomer} 
          onChange={e => setSelectedCustomer(e.target.value)}
        >
          <option value="">Select a Customer...</option>
          {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {selectedCustomer && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
          <div className="kalki-section" style={{ padding: "24px" }}>
            <h3 style={{ fontSize: "16px", marginBottom: "20px" }}>Issue Credit Note</h3>
            
            {error && <div style={{ padding: "12px", background: "#fee2e2", color: "#dc2626", borderRadius: "8px", marginBottom: "16px" }}>{error}</div>}
            
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label className="kalki-label">Credit Note Number</label>
                <input className="kalki-input" required value={creditNoteNumber} onChange={e => setCreditNoteNumber(e.target.value)} />
              </div>
              
              <div>
                <label className="kalki-label">Amount (₹)</label>
                <input className="kalki-input" type="number" step="0.01" min="0" required value={amount} onChange={e => setAmount(e.target.value)} />
              </div>

              <div>
                <label className="kalki-label">Reason</label>
                <textarea className="kalki-input" required value={reason} onChange={e => setReason(e.target.value)} rows={3} />
              </div>
              
              <button className="kalki-button" disabled={pending} style={{ marginTop: "8px" }}>
                {pending ? "Issuing..." : "Issue Credit Note"}
              </button>
            </form>
          </div>

          <div className="kalki-section" style={{ padding: "24px" }}>
            <h3 style={{ fontSize: "16px", marginBottom: "20px" }}>Recently Issued</h3>
            {creditNotes.length === 0 ? <p style={{ color: "#64748b", fontSize: "14px" }}>No credit notes issued in this session.</p> : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e2e8f0", textAlign: "left", color: "#64748b" }}>
                    <th style={{ padding: "8px 4px" }}>CN #</th>
                    <th style={{ padding: "8px 4px" }}>Date</th>
                    <th style={{ padding: "8px 4px" }}>Amount</th>
                    <th style={{ padding: "8px 4px" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {creditNotes.map(cn => (
                    <tr key={cn.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "12px 4px", fontWeight: 500 }}>{cn.creditNoteNumber}</td>
                      <td style={{ padding: "12px 4px" }}>{new Date(cn.issueDate).toLocaleDateString()}</td>
                      <td style={{ padding: "12px 4px", fontWeight: 600 }}>₹ {parseFloat(cn.amount).toFixed(2)}</td>
                      <td style={{ padding: "12px 4px" }}>
                        <span style={{ background: "#fef3c7", color: "#d97706", padding: "2px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: 600 }}>
                          {cn.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
