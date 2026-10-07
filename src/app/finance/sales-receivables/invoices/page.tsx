"use client";

import { useEffect, useState } from "react";
import { useSessionView } from "@/components/AppShell";
import { submitSalesInvoice } from "@/app/finance/receivables-actions";

export default function CustomerInvoicesPage() {
  const { session, selected } = useSessionView();
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [invoices, setInvoices] = useState<any[]>([]);

  // Form
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [subtotal, setSubtotal] = useState("");
  const [taxAmount, setTaxAmount] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selected) {
      // In a real app we'd have an API to fetch customers. Assuming /api/customers exists or using a generic fetch.
      // For now, if there is no /api/customers, we might need to rely on a server action to fetch customers.
      // Assuming /api/customers exists as we had /api/vendors.
      fetch(`/api/customers?organizationId=${selected.organizationId}&locationId=${selected.locationId}`)
        .then(r => r.json())
        .then(data => setCustomers(Array.isArray(data.items) ? data.items : (Array.isArray(data) ? data : [])))
        .catch(console.error);
    }
  }, [selected]);

  // Optionally fetch existing invoices for the customer here...
  // Since we haven't built a fetchSalesInvoices action yet, we'll just show the newly created ones in state.

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await submitSalesInvoice({
        organizationId: selected?.organizationId,
        locationId: selected?.locationId,
        customerId: selectedCustomer,
        invoiceNumber,
        subtotal: parseFloat(subtotal || "0"),
        taxAmount: parseFloat(taxAmount || "0"),
        totalAmount: parseFloat(totalAmount),
        dueDate: new Date(dueDate)
      });
      
      if (res.success) {
        // Add to local state for display
        setInvoices(prev => [{
          id: res.data.id,
          invoiceNumber,
          invoiceDate: new Date().toISOString(),
          totalAmount: parseFloat(totalAmount),
          status: 'open'
        }, ...prev]);
        
        // Reset form
        setInvoiceNumber("");
        setSubtotal("");
        setTaxAmount("");
        setTotalAmount("");
      } else {
        setError(res.error || "Failed to record invoice");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="kalki-main-content">
      <div className="kalki-page-header">
        <h1 className="kalki-page-title">Customer Invoices</h1>
        <p className="kalki-page-description">Record B2B Sales Invoices (Accounts Receivable)</p>
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
            <h3 style={{ fontSize: "16px", marginBottom: "20px" }}>Record New Invoice</h3>
            
            {error && <div style={{ padding: "12px", background: "#fee2e2", color: "#dc2626", borderRadius: "8px", marginBottom: "16px" }}>{error}</div>}
            
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label className="kalki-label">Invoice Number</label>
                <input className="kalki-input" required value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} />
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label className="kalki-label">Invoice Date</label>
                  <input className="kalki-input" type="date" required value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} />
                </div>
                <div>
                  <label className="kalki-label">Due Date</label>
                  <input className="kalki-input" type="date" required value={dueDate} onChange={e => setDueDate(e.target.value)} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label className="kalki-label">Subtotal (₹)</label>
                  <input className="kalki-input" type="number" step="0.01" min="0" required value={subtotal} onChange={e => setSubtotal(e.target.value)} />
                </div>
                <div>
                  <label className="kalki-label">Tax Amount (₹)</label>
                  <input className="kalki-input" type="number" step="0.01" min="0" required value={taxAmount} onChange={e => setTaxAmount(e.target.value)} />
                </div>
              </div>

              <div>
                <label className="kalki-label">Total Amount (₹)</label>
                <input className="kalki-input" type="number" step="0.01" min="0" required value={totalAmount} onChange={e => setTotalAmount(e.target.value)} />
              </div>
              
              <button className="kalki-button" disabled={pending} style={{ marginTop: "8px" }}>
                {pending ? "Recording..." : "Record Invoice"}
              </button>
            </form>
          </div>

          <div className="kalki-section" style={{ padding: "24px" }}>
            <h3 style={{ fontSize: "16px", marginBottom: "20px" }}>Recently Recorded</h3>
            {invoices.length === 0 ? <p style={{ color: "#64748b", fontSize: "14px" }}>No invoices recorded in this session.</p> : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e2e8f0", textAlign: "left", color: "#64748b" }}>
                    <th style={{ padding: "8px 4px" }}>Inv #</th>
                    <th style={{ padding: "8px 4px" }}>Date</th>
                    <th style={{ padding: "8px 4px" }}>Amount</th>
                    <th style={{ padding: "8px 4px" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => (
                    <tr key={inv.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "12px 4px", fontWeight: 500 }}>{inv.invoiceNumber}</td>
                      <td style={{ padding: "12px 4px" }}>{new Date(inv.invoiceDate).toLocaleDateString()}</td>
                      <td style={{ padding: "12px 4px", fontWeight: 600 }}>₹ {parseFloat(inv.totalAmount).toFixed(2)}</td>
                      <td style={{ padding: "12px 4px" }}>
                        <span style={{ background: "#eff6ff", color: "#3b82f6", padding: "2px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: 600 }}>
                          {inv.status}
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
