"use client";

import { useEffect, useState } from "react";
import { useSessionView } from "@/components/AppShell";

export default function SupplierInvoicesPage() {
  const { session, selected } = useSessionView();
  const [vendors, setVendors] = useState<any[]>([]);
  const [selectedVendor, setSelectedVendor] = useState("");
  const [invoices, setInvoices] = useState<any[]>([]);

  // Form
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (selected) {
      fetch(`/api/vendors?organizationId=${selected.organizationId}&locationId=${selected.locationId}`)
        .then(r => r.json())
        .then(setVendors)
        .catch(console.error);
    }
  }, [selected]);

  useEffect(() => {
    if (selected && selectedVendor) {
      fetch(`/api/finance/invoices?organizationId=${selected.organizationId}&locationId=${selected.locationId}&vendorId=${selectedVendor}`)
        .then(r => r.json())
        .then(data => setInvoices(Array.isArray(data) ? data : []))
        .catch(console.error);
    } else {
      setInvoices([]);
    }
  }, [selected, selectedVendor]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const res = await fetch("/api/finance/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: selected?.organizationId,
          locationId: selected?.locationId,
          vendorId: selectedVendor,
          invoiceNumber,
          invoiceDate: new Date(invoiceDate).toISOString(),
          totalAmount: parseFloat(totalAmount),
          recordedByEmployeeId: session.user.id
        })
      });
      if (res.ok) {
        setInvoiceNumber("");
        setInvoiceDate("");
        setTotalAmount("");
        // Refresh
        fetch(`/api/finance/invoices?organizationId=${selected?.organizationId}&locationId=${selected?.locationId}&vendorId=${selectedVendor}`)
          .then(r => r.json())
          .then(data => setInvoices(Array.isArray(data) ? data : []));
      } else {
        const err = await res.json();
        alert(err.error || "Failed to record invoice");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="stack">
      <div className="panel">
        <div className="panel-header">
          <h2>Supplier Invoices</h2>
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
              <h3>Record New Invoice</h3>
              <form onSubmit={handleSubmit} className="stack" style={{ background: "var(--bg-color)", padding: "1.5rem", borderRadius: "8px" }}>
                <div className="field">
                  <label>Invoice Number</label>
                  <input required value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} />
                </div>
                <div className="field">
                  <label>Invoice Date</label>
                  <input type="date" required value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} />
                </div>
                <div className="field">
                  <label>Total Amount (₹)</label>
                  <input type="number" step="0.01" min="0" required value={totalAmount} onChange={e => setTotalAmount(e.target.value)} />
                </div>
                <button className="action-button" disabled={pending}>
                  {pending ? "Recording..." : "Record Invoice"}
                </button>
              </form>
            </div>

            <div className="stack">
              <h3>Recent Invoices</h3>
              {invoices.length === 0 ? <p className="muted">No invoices found for this vendor.</p> : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Inv #</th>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map(inv => (
                      <tr key={inv.id}>
                        <td>{inv.invoiceNumber}</td>
                        <td>{new Date(inv.invoiceDate).toLocaleDateString()}</td>
                        <td>₹ {parseFloat(inv.totalAmount).toFixed(2)}</td>
                        <td><span className="pill" data-state={inv.status}>{inv.status}</span></td>
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
