"use client";

import { useEffect, useState } from "react";
import { useSessionView } from "@/components/AppShell";

export default function PaymentsClient() {
  const { session, selected } = useSessionView();
  const [vendors, setVendors] = useState<any[]>([]);
  const [selectedVendor, setSelectedVendor] = useState("");
  
  const [invoices, setInvoices] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);

  // Form
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [paymentMode, setPaymentMode] = useState("BANK_TRANSFER");
  const [pending, setPending] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);

  useEffect(() => {
    if (selected) {
      fetch(`/api/vendors?organizationId=${selected.organizationId}&locationId=${selected.locationId}`)
        .then(r => r.json())
        .then(data => setVendors(Array.isArray(data.items) ? data.items : []))
        .catch(console.error);
    }
  }, [selected]);

  function loadVendorData() {
    if (!selected || !selectedVendor) return;
    fetch(`/api/finance/invoices?organizationId=${selected.organizationId}&locationId=${selected.locationId}&vendorId=${selectedVendor}`)
      .then(r => r.json())
      .then(data => setInvoices(Array.isArray(data) ? data : []));
    
    fetch(`/api/finance/ledger?organizationId=${selected.organizationId}&locationId=${selected.locationId}&vendorId=${selectedVendor}`)
      .then(r => r.json())
      .then(data => setLedger(Array.isArray(data) ? data : []));
  }

  useEffect(() => {
    loadVendorData();
  }, [selected, selectedVendor]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!attachment) {
      alert("Payment evidence attachment is mandatory.");
      return;
    }
    
    setPending(true);
    
    try {
      const formData = new FormData();
      formData.append('file', attachment);
      
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!uploadRes.ok) throw new Error("File upload failed");
      const uploadData = await uploadRes.json();
      const attachmentUrl = uploadData.urls['file'];

      // Auto-allocate logic for simplicity (FIFO against unpaid invoices)
      const unpaidInvoices = invoices.filter(inv => inv.status !== "PAID");
      const allocations = [];
      let remainingAmount = parseFloat(amount);
      
      for (const inv of unpaidInvoices) {
        if (remainingAmount <= 0) break;
        const invTotal = parseFloat(inv.totalAmount);
        const allocated = Math.min(invTotal, remainingAmount);
        allocations.push({ invoiceId: inv.id, amount: allocated });
        remainingAmount -= allocated;
      }

      const res = await fetch("/api/finance/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: selected?.organizationId,
          locationId: selected?.locationId,
          vendorId: selectedVendor,
          amount: parseFloat(amount),
          paymentDate: new Date(paymentDate).toISOString(),
          paymentMode,
          allocations,
          attachmentUrl,
          recordedByEmployeeId: session.user.id
        })
      });
      if (res.ok) {
        setAmount("");
        setPaymentDate("");
        setAttachment(null);
        loadVendorData();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to record payment");
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to record payment");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="kalki-main-content">
      <div className="kalki-page-header">
        <div style={{ flex: 1 }}>
          <h1 className="kalki-page-title">Vendor Payments</h1>
          <p className="kalki-page-description">Record payments and view vendor ledger balances securely against your unified chart of accounts.</p>
        </div>
        <div className="kalki-action-bar">
          <select 
            className="kalki-select"
            style={{ width: "300px" }}
            value={selectedVendor} 
            onChange={e => setSelectedVendor(e.target.value)}
          >
            <option value="">Select a Vendor...</option>
            {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
      </div>

      {selectedVendor ? (
        <div className="kalki-form-layout">
          <div className="kalki-form-main">
            <div className="kalki-section">
              <div className="kalki-section-header">
                <h2 className="kalki-section-title">Statement of Account (Ledger)</h2>
              </div>
              <div className="kalki-section-content" style={{ padding: 0 }}>
                {ledger.length === 0 ? (
                  <div style={{ padding: "2rem", textAlign: "center", color: "var(--kalki-text-muted)" }}>
                    No transactions found for this vendor.
                  </div>
                ) : (
                  <div className="kalki-table-container">
                    <table className="kalki-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Event</th>
                          <th>Amount</th>
                          <th style={{ textAlign: "right" }}>Running Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ledger.map(entry => (
                          <tr key={entry.id}>
                            <td>{new Date(entry.recordedAt).toLocaleDateString()}</td>
                            <td>
                               <span style={{
                                 display: "inline-block",
                                 padding: "2px 8px",
                                 borderRadius: "12px",
                                 fontSize: "0.75rem",
                                 fontWeight: 600,
                                 backgroundColor: entry.eventType === "PAYMENT" ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                                 color: entry.eventType === "PAYMENT" ? "var(--kalki-success)" : "var(--kalki-danger)"
                               }}>
                                 {entry.eventType}
                               </span>
                            </td>
                            <td style={{ color: entry.eventType === "PAYMENT" ? "var(--kalki-success)" : "var(--kalki-danger)", fontWeight: 500 }}>
                              {entry.amountChange}
                            </td>
                            <td style={{ fontWeight: 600, textAlign: "right" }}>₹ {entry.balanceAfter}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="kalki-form-secondary">
            <div className="kalki-section">
              <div className="kalki-section-header">
                <h2 className="kalki-section-title">Record New Payment</h2>
              </div>
              <div className="kalki-section-content">
                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div className="kalki-field">
                    <label className="kalki-label kalki-required">Payment Amount (₹)</label>
                    <input 
                      type="number" 
                      className="kalki-input"
                      step="0.01" 
                      min="0" 
                      required 
                      value={amount} 
                      onChange={e => setAmount(e.target.value)} 
                    />
                    <span style={{ fontSize: "0.75rem", color: "var(--kalki-text-muted)", marginTop: "4px" }}>
                      Automatically allocated (FIFO) to unpaid invoices.
                    </span>
                  </div>
                  <div className="kalki-field">
                    <label className="kalki-label kalki-required">Payment Date</label>
                    <input 
                      type="date" 
                      className="kalki-input"
                      required 
                      value={paymentDate} 
                      onChange={e => setPaymentDate(e.target.value)} 
                    />
                  </div>
                  <div className="kalki-field">
                    <label className="kalki-label kalki-required">Payment Mode</label>
                    <select 
                      className="kalki-select"
                      value={paymentMode} 
                      onChange={e => setPaymentMode(e.target.value)}
                    >
                      <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                      <option value="CASH">Cash</option>
                      <option value="UPI">UPI</option>
                      <option value="CHEQUE">Cheque</option>
                    </select>
                  </div>
                  <div className="kalki-field">
                    <label className="kalki-label kalki-required">Payment Evidence (Proof)</label>
                    <input 
                      type="file" 
                      className="kalki-input"
                      required 
                      accept="image/*,.pdf"
                      onChange={e => setAttachment(e.target.files?.[0] || null)} 
                    />
                    <span style={{ fontSize: "0.75rem", color: "var(--kalki-text-muted)", marginTop: "4px" }}>
                      Please upload screenshot/receipt to resolve future disputes.
                    </span>
                  </div>
                  <button type="submit" className="kalki-button kalki-button--primary" disabled={pending} style={{ marginTop: "1rem" }}>
                    {pending ? "Recording..." : "Record Payment"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ padding: "4rem 2rem", textAlign: "center", color: "var(--kalki-text-muted)", background: "var(--kalki-bg-secondary)", borderRadius: "var(--kalki-radius-lg)", border: "1px dashed var(--kalki-border)" }}>
          <p>Please select a vendor from the top right to view their ledger and record payments.</p>
        </div>
      )}
    </div>
  );
}
