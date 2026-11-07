"use client";

import React, { useState, useEffect } from "react";
import { Network, ArrowRight, ArrowRightLeft, Activity, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { useSessionView } from "@/components/AppShell";
import { fetchInterBranchBalances, executeInterBranchTransfer } from "@/app/finance/inter-branch-actions";
import { fetchLocations } from "@/app/finance/actions";
import { fetchBankAccounts } from "@/app/finance/banking-actions";

export function InterBranchClient() {
  const { selected } = useSessionView();
  const [loading, setLoading] = useState(false);
  const [positions, setPositions] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Transfer Modal State
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sourceLocId, setSourceLocId] = useState("");
  const [targetLocId, setTargetLocId] = useState("");
  const [sourceAccounts, setSourceAccounts] = useState<any[]>([]);
  const [targetAccounts, setTargetAccounts] = useState<any[]>([]);
  const [sourceAccountId, setSourceAccountId] = useState("");
  const [targetAccountId, setTargetAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [narration, setNarration] = useState("");
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  const loadData = () => {
    if (!selected) return;
    setLoading(true);
    setError(null);

    Promise.all([
      fetchInterBranchBalances(selected.organizationId),
      fetchLocations(selected.organizationId)
    ]).then(([balRes, locRes]) => {
      if (balRes.success) {
        setPositions(balRes.data as any[]);
      } else {
        setError(balRes.error || "Failed to load branch positions.");
      }

      if (locRes.success) {
        setLocations(locRes.data as any[]);
      }
      setLoading(false);
    }).catch(err => {
      setError(err?.message || "An unexpected error occurred.");
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, [selected]);

  // Load Source Branch Cash/Bank Accounts
  useEffect(() => {
    if (!selected || !sourceLocId) {
      setSourceAccounts([]);
      setSourceAccountId("");
      return;
    }
    setLoadingAccounts(true);
    fetchBankAccounts(selected.organizationId, sourceLocId).then(res => {
      if (res.success) {
        const accs = res.data as any[];
        setSourceAccounts(accs);
        if (accs.length > 0 && !sourceAccountId) {
          setSourceAccountId(accs[0].id);
        }
      }
      setLoadingAccounts(false);
    });
  }, [selected, sourceLocId]);

  // Load Target Branch Cash/Bank Accounts
  useEffect(() => {
    if (!selected || !targetLocId) {
      setTargetAccounts([]);
      setTargetAccountId("");
      return;
    }
    setLoadingAccounts(true);
    fetchBankAccounts(selected.organizationId, targetLocId).then(res => {
      if (res.success) {
        const accs = res.data as any[];
        setTargetAccounts(accs);
        if (accs.length > 0 && !targetAccountId) {
          setTargetAccountId(accs[0].id);
        }
      }
      setLoadingAccounts(false);
    });
  }, [selected, targetLocId]);

  const handleOpenTransferModal = (defaultSourceId?: string, defaultTargetId?: string) => {
    setError(null);
    setSuccess(null);
    const src = defaultSourceId || (locations[0]?.id !== defaultTargetId ? locations[0]?.id : locations[1]?.id) || "";
    const tgt = defaultTargetId || (locations.find(l => l.id !== src)?.id || "");
    setSourceLocId(src);
    setTargetLocId(tgt);
    setAmount("");
    setNarration("Branch fund rebalancing");
    setShowTransferModal(true);
  };

  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;

    if (!sourceLocId || !targetLocId) {
      alert("Please select both source and destination branches.");
      return;
    }

    if (sourceLocId === targetLocId) {
      alert("Source and destination branch cannot be the same. Use Contra Transfer for internal accounts.");
      return;
    }

    if (!sourceAccountId || !targetAccountId) {
      alert("Please select both source and destination accounts.");
      return;
    }

    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      alert("Please enter a valid transfer amount greater than 0.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const res = await executeInterBranchTransfer({
      organizationId: selected.organizationId,
      sourceLocationId: sourceLocId,
      sourceAccountId,
      targetLocationId: targetLocId,
      targetAccountId,
      amount: amt,
      narration: narration || "Inter-Branch Fund Transfer",
    });

    setSubmitting(false);

    if (res.success) {
      setShowTransferModal(false);
      setSuccess(`Successfully transferred ₹${amt.toLocaleString("en-IN", { minimumFractionDigits: 2 })} across branches.`);
      loadData();
    } else {
      alert("Transfer failed: " + (res.error || "Unknown error"));
    }
  };

  if (!selected) return <div className="p-8 text-center">Please select an organization context.</div>;

  const totalOwed = positions.filter(p => p.netPosition > 0).reduce((sum, p) => sum + p.netPosition, 0);

  return (
    <div className="kalki-main-content">
      <div className="kalki-page-header" style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 className="kalki-page-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Network size={24} style={{ color: "var(--kalki-primary)" }} />
            Inter-Branch Clearing
          </h1>
          <p className="kalki-page-description">Visualize and settle funds owed between restaurant locations.</p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button onClick={loadData} className="kalki-button kalki-button--secondary" style={{ height: "36px" }} title="Refresh Balances">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} style={{ marginRight: "6px" }} /> Refresh
          </button>
          <button onClick={() => handleOpenTransferModal()} className="kalki-button kalki-button--primary" style={{ height: "36px" }}>
            <ArrowRightLeft size={16} style={{ marginRight: "8px" }} /> Transfer Funds Across Branches
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: "12px 16px", background: "#fef2f2", color: "var(--kalki-danger)", borderRadius: "8px", border: "1px solid #fecaca", marginBottom: "16px", fontSize: "14px" }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ padding: "12px 16px", background: "#f0fdf4", color: "#16a34a", borderRadius: "8px", border: "1px solid #bbf7d0", marginBottom: "16px", fontSize: "14px" }}>
          {success}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px", marginBottom: "32px" }}>
        <div className="kalki-section" style={{ position: "relative", margin: 0 }}>
          <div className="kalki-section-content">
            <div style={{ position: "absolute", top: "16px", right: "16px", opacity: 0.1 }}>
              <Activity size={64} color="var(--kalki-primary)" />
            </div>
            <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--kalki-text-secondary)", textTransform: "uppercase", marginBottom: "8px", margin: 0 }}>Total System Imbalance</p>
            <h3 style={{ fontSize: "28px", fontWeight: "bold", margin: "4px 0 16px 0", color: "var(--kalki-text-primary)" }}>₹{totalOwed.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
            <div style={{ fontSize: "12px", color: "var(--kalki-text-secondary)" }}>
              Total funds floating between branches
            </div>
          </div>
        </div>
      </div>

      <div className="kalki-section">
        <div className="kalki-section-header">
          <div className="kalki-section-title">
            Branch Net Positions
          </div>
        </div>
        <div className="kalki-table-container">
          <table className="kalki-table">
            <thead>
              <tr>
                <th>Branch</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Net Position (₹)</th>
                <th style={{ textAlign: "center", width: "160px" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} style={{ textAlign: "center", padding: "32px", color: "var(--kalki-text-secondary)" }}>Loading branch positions...</td></tr>
              ) : positions.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: "center", padding: "32px", color: "var(--kalki-text-secondary)" }}>No data found.</td></tr>
              ) : positions.map(pos => (
                <tr key={pos.location.id}>
                  <td style={{ fontWeight: 500, color: "var(--kalki-text-primary)" }}>{pos.location.name}</td>
                  <td>
                    {Math.abs(pos.netPosition) < 0.01 ? (
                      <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: "999px", background: "#f1f5f9", color: "var(--kalki-text-secondary)", fontSize: "12px", fontWeight: 600 }}>Balanced</span>
                    ) : pos.netPosition > 0 ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "2px 8px", borderRadius: "999px", background: "#dcfce7", color: "#16a34a", fontSize: "12px", fontWeight: 600 }}>
                        <TrendingUp size={12} /> Creditor (Owed Money)
                      </span>
                    ) : (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "2px 8px", borderRadius: "999px", background: "#fee2e2", color: "var(--kalki-danger)", fontSize: "12px", fontWeight: 600 }}>
                        <TrendingDown size={12} /> Debtor (Owes Money)
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: "right", fontWeight: "bold", color: Math.abs(pos.netPosition) < 0.01 ? "var(--kalki-text-primary)" : pos.netPosition > 0 ? "#16a34a" : "var(--kalki-danger)" }}>
                    {pos.netPosition > 0 ? '+' : ''}{pos.netPosition.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <button
                      onClick={() => handleOpenTransferModal(pos.location.id, undefined)}
                      className="kalki-button kalki-button--secondary"
                      style={{ fontSize: "11px", height: "28px", padding: "0 10px" }}
                    >
                      <ArrowRightLeft size={12} style={{ marginRight: "4px" }} />
                      Transfer Funds
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transfer Funds Modal */}
      {showTransferModal && (
        <div className="kalki-modal-overlay">
          <div className="kalki-modal" style={{ maxWidth: "620px" }}>
            <div className="kalki-modal-header">
              <h2 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <ArrowRightLeft size={20} style={{ color: "var(--kalki-primary)" }} /> Inter-Branch Fund Transfer
              </h2>
              <button onClick={() => setShowTransferModal(false)} className="kalki-modal-close">&times;</button>
            </div>
            <form onSubmit={handleExecuteTransfer}>
              <div className="kalki-modal-content">
                <div style={{ padding: "10px 14px", background: "#eff6ff", borderRadius: "8px", border: "1px solid #bfdbfe", fontSize: "13px", color: "#1e40af" }}>
                  💡 Transfers automatically clear through <strong>1290 Inter-Branch Receivable</strong> and <strong>2190 Inter-Branch Payable</strong> accounts without creating false revenue or tax liability.
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  {/* Source Branch */}
                  <div className="kalki-field">
                    <label className="kalki-label">From Branch (Sender)</label>
                    <select
                      required
                      value={sourceLocId}
                      onChange={e => {
                        setSourceLocId(e.target.value);
                        if (e.target.value === targetLocId) {
                          setTargetLocId(locations.find(l => l.id !== e.target.value)?.id || "");
                        }
                      }}
                      className="kalki-select"
                    >
                      <option value="">Select source branch...</option>
                      {locations.map(loc => (
                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Destination Branch */}
                  <div className="kalki-field">
                    <label className="kalki-label">To Branch (Receiver)</label>
                    <select
                      required
                      value={targetLocId}
                      onChange={e => setTargetLocId(e.target.value)}
                      className="kalki-select"
                    >
                      <option value="">Select destination branch...</option>
                      {locations.filter(l => l.id !== sourceLocId).map(loc => (
                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  {/* Source Account */}
                  <div className="kalki-field">
                    <label className="kalki-label">Source Cash/Bank (Credit)</label>
                    <select
                      required
                      value={sourceAccountId}
                      onChange={e => setSourceAccountId(e.target.value)}
                      className="kalki-select"
                    >
                      <option value="">Select source account...</option>
                      {sourceAccounts.map(a => (
                        <option key={a.id} value={a.id}>{a.name} (₹{a.balance.toLocaleString()})</option>
                      ))}
                    </select>
                  </div>

                  {/* Destination Account */}
                  <div className="kalki-field">
                    <label className="kalki-label">Destination Cash/Bank (Debit)</label>
                    <select
                      required
                      value={targetAccountId}
                      onChange={e => setTargetAccountId(e.target.value)}
                      className="kalki-select"
                    >
                      <option value="">Select destination account...</option>
                      {targetAccounts.map(a => (
                        <option key={a.id} value={a.id}>{a.name} (₹{a.balance.toLocaleString()})</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Amount */}
                <div className="kalki-field">
                  <label className="kalki-label">Transfer Amount (₹)</label>
                  <input
                    required
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="kalki-input"
                    placeholder="e.g. 50000.00"
                  />
                </div>

                {/* Narration */}
                <div className="kalki-field">
                  <label className="kalki-label">Narration / Transfer Reason</label>
                  <input
                    required
                    type="text"
                    value={narration}
                    onChange={e => setNarration(e.target.value)}
                    className="kalki-input"
                    placeholder="e.g. Rebalancing cash liquidity for supplier payment"
                  />
                </div>
              </div>
              <div className="kalki-modal-footer">
                <button type="button" onClick={() => setShowTransferModal(false)} className="kalki-button kalki-button--secondary">Cancel</button>
                <button type="submit" disabled={submitting || loadingAccounts} className="kalki-button kalki-button--primary">
                  {submitting ? "Processing Transfer..." : "Confirm & Transfer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
