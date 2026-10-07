"use client";

import React, { useState, useEffect } from "react";
import { Landmark, ArrowRightLeft, IndianRupee, AlertCircle } from "lucide-react";
import { useSessionView } from "@/components/AppShell";
import { fetchBankAccounts, processContraTransfer } from "@/app/finance/banking-actions";
import { fetchLocations } from "@/app/finance/actions";

export function BankingClient() {
  const { selected } = useSessionView();
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Transfer State
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transfer, setTransfer] = useState({ fromAccountId: "", toAccountId: "", amount: "", narration: "" });
  const [submitting, setSubmitting] = useState(false);

  const loadAccounts = () => {
    if (!selected) return;
    const locId = selectedLocationId || selected.locationId;
    setLoading(true);
    fetchBankAccounts(selected.organizationId, locId).then(res => {
      if (res.success) setAccounts(res.data as any[]);
      else setError(res.error);
      setLoading(false);
    });
  };

  useEffect(() => {
    if (!selected) return;
    fetchLocations(selected.organizationId).then(res => {
      if (res.success) {
        setLocations(res.data as any[]);
        setSelectedLocationId(selected.locationId);
      }
    });
  }, [selected]);

  useEffect(() => {
    if (selectedLocationId) loadAccounts();
  }, [selectedLocationId]);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    if (transfer.fromAccountId === transfer.toAccountId) {
      alert("Source and Destination accounts must be different.");
      return;
    }
    const amt = parseFloat(transfer.amount);
    if (amt <= 0) {
      alert("Amount must be greater than zero.");
      return;
    }
    
    setSubmitting(true);
    const res = await processContraTransfer({
      organizationId: selected.organizationId,
      locationId: selectedLocationId,
      fromAccountId: transfer.fromAccountId,
      toAccountId: transfer.toAccountId,
      amount: amt,
      narration: transfer.narration
    });

    if (res.success) {
      setShowTransferModal(false);
      setTransfer({ fromAccountId: "", toAccountId: "", amount: "", narration: "" });
      loadAccounts();
    } else {
      alert("Failed to process transfer: " + res.error);
    }
    setSubmitting(false);
  };

  if (!selected) return <div className="p-8 text-center">Please select an organization context.</div>;

  return (
    <div className="kalki-main-content">
      <div className="kalki-page-header" style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 className="kalki-page-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Landmark size={24} style={{ color: "var(--kalki-primary)" }} />
            Bank & Cash Operations
          </h1>
          <p className="kalki-page-description">Manage vaults, petty cash, and internal bank transfers (Contra).</p>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <select 
            value={selectedLocationId} 
            onChange={e => setSelectedLocationId(e.target.value)}
            className="kalki-select"
            style={{ width: "220px", height: "36px" }}
          >
            {locations.map(l => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
          <button onClick={() => setShowTransferModal(true)} className="kalki-button kalki-button--primary" style={{ height: "36px" }}>
            <ArrowRightLeft size={16} style={{ marginRight: "8px" }} /> Record Transfer
          </button>
        </div>
      </div>

      {error && <div style={{ color: "var(--kalki-danger)", marginBottom: "16px" }}>{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "24px", marginBottom: "32px" }}>
        {loading ? (
          <div style={{ gridColumn: "1 / -1", padding: "48px", textAlign: "center", color: "var(--kalki-text-secondary)" }}>Loading accounts...</div>
        ) : accounts.length === 0 ? (
          <div className="kalki-section" style={{ gridColumn: "1 / -1", background: "#f8fafc" }}>
            <div className="kalki-section-content" style={{ textAlign: "center", padding: "32px", color: "var(--kalki-text-secondary)" }}>
              No Cash/Bank accounts found. Please set them up in the Chart of Accounts under the "Cash & Cash Equivalents" group.
            </div>
          </div>
        ) : accounts.map(acc => (
          <div key={acc.id} className="kalki-section" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", margin: 0 }}>
            <div className="kalki-section-content" style={{ paddingBottom: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <h3 style={{ fontWeight: 600, color: "var(--kalki-text-primary)", margin: 0 }}>{acc.name}</h3>
                <span style={{ fontSize: "12px", fontFamily: "monospace", color: "var(--kalki-text-secondary)" }}>{acc.code}</span>
              </div>
              {acc.description && <p style={{ fontSize: "13px", color: "var(--kalki-text-secondary)", margin: 0 }}>{acc.description}</p>}
            </div>
            <div style={{ padding: "16px 20px", marginTop: "16px", borderTop: "1px solid var(--kalki-border)", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <span style={{ fontSize: "13px", color: "var(--kalki-text-secondary)" }}>Live Balance</span>
              <span style={{ fontSize: "24px", fontWeight: "bold", color: acc.balance < 0 ? "var(--kalki-danger)" : "#16a34a" }}>
                ₹{acc.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        ))}
      </div>

      {showTransferModal && (
        <div className="kalki-modal-overlay">
          <div className="kalki-modal">
            <div className="kalki-modal-header">
              <h2 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <ArrowRightLeft size={20} style={{ color: "var(--kalki-primary)" }} /> Contra Transfer
              </h2>
              <button onClick={() => setShowTransferModal(false)} className="kalki-modal-close">&times;</button>
            </div>
            <form onSubmit={handleTransfer}>
              <div className="kalki-modal-content">
                <div className="kalki-field">
                  <label className="kalki-label">Transfer From (Credit)</label>
                  <select required value={transfer.fromAccountId} onChange={e => setTransfer({...transfer, fromAccountId: e.target.value})} className="kalki-select">
                    <option value="">Select source account...</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name} (₹{a.balance.toLocaleString()})</option>)}
                  </select>
                </div>
                <div className="kalki-field">
                  <label className="kalki-label">Transfer To (Debit)</label>
                  <select required value={transfer.toAccountId} onChange={e => setTransfer({...transfer, toAccountId: e.target.value})} className="kalki-select">
                    <option value="">Select destination account...</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name} (₹{a.balance.toLocaleString()})</option>)}
                  </select>
                </div>
                <div className="kalki-field">
                  <label className="kalki-label">Amount (₹)</label>
                  <input required type="number" min="0.01" step="0.01" value={transfer.amount} onChange={e => setTransfer({...transfer, amount: e.target.value})} className="kalki-input" placeholder="0.00" />
                </div>
                <div className="kalki-field">
                  <label className="kalki-label">Narration</label>
                  <input required type="text" value={transfer.narration} onChange={e => setTransfer({...transfer, narration: e.target.value})} className="kalki-input" placeholder="e.g. Cash deposited to bank" />
                </div>
              </div>
              <div className="kalki-modal-footer">
                <button type="button" onClick={() => setShowTransferModal(false)} className="kalki-button kalki-button--secondary">Cancel</button>
                <button type="submit" disabled={submitting} className="kalki-button kalki-button--primary">
                  {submitting ? "Processing..." : "Transfer Funds"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
