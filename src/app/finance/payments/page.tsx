"use client";

import { useEffect, useState } from "react";
import { useSessionView } from "@/components/AppShell";

export default function PaymentsPage() {
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

  useEffect(() => {
    if (selected) {
      fetch(`/api/vendors?organizationId=${selected.organizationId}&locationId=${selected.locationId}`)
        .then(r => r.json())
        .then(setVendors)
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
    setPending(true);
    
    // Auto-allocate logic for simplicity (FIFO against unpaid invoices)
    const unpaidInvoices = invoices.filter(inv => inv.status !== "PAID");
    const allocations = [];
    let remainingAmount = parseFloat(amount);
    
    for (const inv of unpaidInvoices) {
      if (remainingAmount <= 0) break;
      // Note: for production we should track how much of each invoice is already paid
      // But for this demo we'll just allocate the remaining payment amount up to the invoice total
      const invTotal = parseFloat(inv.totalAmount);
      const allocated = Math.min(invTotal, remainingAmount);
      allocations.push({ invoiceId: inv.id, amount: allocated });
      remainingAmount -= allocated;
    }

    try {
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
          recordedByEmployeeId: session.user.id
        })
      });
      if (res.ok) {
        setAmount("");
        setPaymentDate("");
        loadVendorData();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to record payment");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="stack">
      <div className="panel">
        <div className="panel-header">
          <h2>Vendor Payments & Ledger</h2>
          <select 
            className="scope-select"
            value={selectedVendor} 
            onChange={e => setSelectedVendor(e.target.value)}
          >
            <option value="">Select a Vendor...</option>
            {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>

        {selectedVendor && (
          <div className="grid-2">
            <div className="stack">
              <h3>Record Payment</h3>
              <form onSubmit={handleSubmit} className="stack" style={{ background: "var(--bg-color)", padding: "1.5rem", borderRadius: "8px" }}>
                <div className="field">
                  <label>Payment Amount (₹)</label>
                  <input type="number" step="0.01" min="0" required value={amount} onChange={e => setAmount(e.target.value)} />
                  <span className="muted" style={{fontSize:"0.8rem"}}>This will be auto-allocated to oldest unpaid invoices</span>
                </div>
                <div className="field">
                  <label>Payment Date</label>
                  <input type="date" required value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
                </div>
                <div className="field">
                  <label>Payment Mode</label>
                  <select value={paymentMode} onChange={e => setPaymentMode(e.target.value)}>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
                <button className="action-button" disabled={pending}>
                  {pending ? "Recording..." : "Record Payment"}
                </button>
              </form>
            </div>

            <div className="stack">
              <h3>Statement of Account (Ledger)</h3>
              {ledger.length === 0 ? <p className="muted">No transactions found.</p> : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Event</th>
                      <th>Amount</th>
                      <th>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.map(entry => (
                      <tr key={entry.id}>
                        <td>{new Date(entry.recordedAt).toLocaleDateString()}</td>
                        <td>
                           <span className="pill" data-state={entry.eventType === "PAYMENT" ? "PAID" : "WARNING"}>
                             {entry.eventType}
                           </span>
                        </td>
                        <td style={{ color: entry.eventType === "PAYMENT" ? "var(--success)" : "var(--danger)" }}>
                          {entry.amountChange}
                        </td>
                        <td style={{fontWeight: 600}}>₹ {entry.balanceAfter}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
