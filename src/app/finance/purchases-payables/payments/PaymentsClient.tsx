"use client";

import { useEffect, useState } from "react";
import { useSessionView } from "@/components/AppShell";
import { fetchBankAccounts } from "@/app/finance/banking-actions";
import { AlertCircle, ShieldAlert, CheckCircle2 } from "lucide-react";

export default function PaymentsClient() {
  const { session, selected } = useSessionView();
  const [vendors, setVendors] = useState<any[]>([]);
  const [selectedVendor, setSelectedVendor] = useState("");
  
  const [invoices, setInvoices] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);

  // Accounts state
  const [accountsList, setAccountsList] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");

  // Form
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [paymentMode, setPaymentMode] = useState("CASH");
  const [pending, setPending] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);

  useEffect(() => {
    if (selected) {
      fetch(`/api/vendors?organizationId=${selected.organizationId}&locationId=${selected.locationId}`)
        .then(r => r.json())
        .then(data => setVendors(Array.isArray(data.items) ? data.items : []))
        .catch(console.error);

      // Load branch cash and bank accounts with real-time balances
      fetchBankAccounts(selected.organizationId, selected.locationId)
        .then(res => {
          if (res.success && res.data) {
            setAccountsList(res.data);
            // Default to Cash Till Drawer (1110) if present, or first cash account
            const defaultCash = res.data.find((a: any) => a.code === "1110" || a.name.toLowerCase().includes("cash in hand") || a.name.toLowerCase().includes("till"))
              || res.data.find((a: any) => a.code === "1120" || a.name.toLowerCase().includes("petty cash"))
              || res.data[0];
            if (defaultCash) {
              setSelectedAccountId(defaultCash.id);
            }
          }
        })
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

    // Refresh account balances
    if (selected) {
      fetchBankAccounts(selected.organizationId, selected.locationId)
        .then(res => {
          if (res.success && res.data) {
            setAccountsList(res.data);
          }
        })
        .catch(console.error);
    }
  }

  // When payment mode changes, adapt the default account
  const handlePaymentModeChange = (mode: string) => {
    setPaymentMode(mode);
    if (mode === "CASH") {
      const cashAcc = accountsList.find((a: any) => a.code === "1110" || a.name.toLowerCase().includes("cash in hand") || a.name.toLowerCase().includes("till"))
        || accountsList.find((a: any) => a.code === "1120" || a.name.toLowerCase().includes("petty"));
      if (cashAcc) setSelectedAccountId(cashAcc.id);
    } else {
      const bankAcc = accountsList.find((a: any) => a.code === "1130" || a.name.toLowerCase().includes("bank") || a.name.toLowerCase().includes("current"));
      if (bankAcc) setSelectedAccountId(bankAcc.id);
    }
  };

  const selectedAccount = accountsList.find((a: any) => a.id === selectedAccountId);
  const currentAvailableBalance = selectedAccount ? Number(selectedAccount.balance || 0) : 0;
  const numAmount = parseFloat(amount || "0");
  const isInsufficient = (paymentMode === "CASH" || Boolean(selectedAccountId)) && numAmount > 0 && numAmount > currentAvailableBalance;

  useEffect(() => {
    loadVendorData();
  }, [selected, selectedVendor]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!attachment) {
      alert("Payment evidence attachment is mandatory.");
      return;
    }

    if (isInsufficient) {
      alert(`Strict Payment Block: Available balance in ${selectedAccount?.name || 'cash drawer'} is ₹${currentAvailableBalance.toFixed(2)}, which is less than ₹${numAmount.toFixed(2)}. Cash payments that exceed drawer balance are prohibited.`);
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
          sourceAccountId: selectedAccountId || undefined,
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
                      onChange={e => handlePaymentModeChange(e.target.value)}
                    >
                      <option value="CASH">Cash (Front Till / Petty Float)</option>
                      <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                      <option value="UPI">UPI</option>
                      <option value="CHEQUE">Cheque</option>
                    </select>
                  </div>

                  {/* Disbursal Source Account Selector */}
                  <div className="kalki-field">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                      <label className="kalki-label kalki-required" style={{ margin: 0 }}>
                        {paymentMode === "CASH" ? "Cash Drawer / Till Account" : "Source Bank Account"}
                      </label>
                      {selectedAccount && (
                        <span style={{ 
                          fontSize: "0.75rem", 
                          fontWeight: 600, 
                          color: currentAvailableBalance < 0 ? "var(--kalki-danger)" : currentAvailableBalance < numAmount ? "var(--kalki-danger)" : "var(--kalki-success)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px"
                        }}>
                          {currentAvailableBalance < numAmount && <AlertCircle size={12} />}
                          Available: ₹{currentAvailableBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      )}
                    </div>
                    <select
                      className="kalki-select"
                      value={selectedAccountId}
                      onChange={e => setSelectedAccountId(e.target.value)}
                      required
                    >
                      <option value="">Select account...</option>
                      {accountsList
                        .filter(a => {
                          if (paymentMode === "CASH") {
                            return a.code === "1110" || a.code === "1120" || a.name.toLowerCase().includes("cash") || a.name.toLowerCase().includes("petty");
                          }
                          return a.code === "1130" || a.name.toLowerCase().includes("bank") || a.name.toLowerCase().includes("current") || !a.name.toLowerCase().includes("cash");
                        })
                        .map(acc => (
                          <option key={acc.id} value={acc.id}>
                            {acc.name} ({acc.code}) — Balance: ₹{Number(acc.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </option>
                        ))}
                    </select>
                    {paymentMode === "CASH" && (
                      <span style={{ fontSize: "0.72rem", color: "var(--kalki-text-muted)", marginTop: "3px" }}>
                        Select <strong>Cash in Hand (1110)</strong> for front sales drawer (Cash RA) or <strong>Petty Cash (1120)</strong> for fixed float.
                      </span>
                    )}
                  </div>

                  {/* Strict Block Warning Banner */}
                  {isInsufficient && (
                    <div style={{
                      padding: "10px 14px",
                      borderRadius: "var(--kalki-radius)",
                      backgroundColor: "rgba(239, 68, 68, 0.1)",
                      border: "1px solid var(--kalki-danger)",
                      color: "var(--kalki-danger)",
                      fontSize: "0.8rem",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "8px",
                      lineHeight: 1.4
                    }}>
                      <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: "2px" }} />
                      <div>
                        <strong>Strict Payment Block:</strong> Cashier drawer does not hold sufficient cash.
                        <div style={{ marginTop: "2px", fontSize: "0.75rem" }}>
                          Available: <strong>₹{currentAvailableBalance.toFixed(2)}</strong> | Required: <strong>₹{numAmount.toFixed(2)}</strong>.
                          Disbursement is strictly blocked to avoid cash shortage.
                        </div>
                      </div>
                    </div>
                  )}

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
                  <button 
                    type="submit" 
                    className="kalki-button kalki-button--primary" 
                    disabled={pending || isInsufficient} 
                    style={{ 
                      marginTop: "1rem",
                      opacity: isInsufficient ? 0.5 : 1,
                      cursor: isInsufficient ? "not-allowed" : "pointer"
                    }}
                  >
                    {pending ? "Recording..." : isInsufficient ? "Blocked: Insufficient Cash" : "Record Payment"}
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
