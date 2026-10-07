"use client";

import React, { useState, useEffect } from "react";
import { BookOpen, Plus, Trash2, AlertTriangle, CheckCircle, Save } from "lucide-react";
import { useSessionView } from "@/components/AppShell";
import { fetchChartOfAccounts, fetchLocations, postManualJournal } from "@/app/finance/actions";
import { ManualJournalCategory } from "@/domains/finance/types";

export function JournalsClient() {
  const { selected } = useSessionView();
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  
  const [category, setCategory] = useState<ManualJournalCategory>("AUDIT_CORRECTION");
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [narration, setNarration] = useState("");
  const [lines, setLines] = useState<{ id: string; accountId: string; locationId: string; debit: string; credit: string; narration: string }[]>([
    { id: "1", accountId: "", locationId: "", debit: "", credit: "", narration: "" },
    { id: "2", accountId: "", locationId: "", debit: "", credit: "", narration: "" },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    Promise.all([
      fetchChartOfAccounts(selected.organizationId),
      fetchLocations(selected.organizationId)
    ]).then(([accRes, locRes]) => {
      if (accRes.success) setAccounts((accRes.data as any).accounts);
      if (locRes.success) setLocations(locRes.data as any[]);
      setLoading(false);
    });
  }, [selected]);

  const totalDebit = lines.reduce((sum, l) => sum + (parseFloat(l.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (parseFloat(l.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const handleAddLine = () => {
    setLines([...lines, { id: Date.now().toString(), accountId: "", locationId: "", debit: "", credit: "", narration: "" }]);
  };

  const handleRemoveLine = (id: string) => {
    if (lines.length <= 2) return;
    setLines(lines.filter(l => l.id !== id));
  };

  const handleChange = (id: string, field: string, value: string) => {
    setLines(lines.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    if (!isBalanced) {
      setError("Cannot post: Total Debits must equal Total Credits.");
      return;
    }
    if (totalDebit <= 0) {
      setError("Cannot post: Total amount must be greater than zero.");
      return;
    }
    
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    const payloadLines = lines
      .filter(l => l.accountId && l.locationId && (parseFloat(l.debit) > 0 || parseFloat(l.credit) > 0))
      .map(l => {
        const d = parseFloat(l.debit) || 0;
        const c = parseFloat(l.credit) || 0;
        return {
          accountId: l.accountId,
          locationId: l.locationId,
          amount: d > 0 ? d : c,
          isDebit: d > 0,
          narration: l.narration || undefined,
        };
      });

    const res = await postManualJournal({
      organizationId: selected.organizationId,
      locationId: lines[0].locationId, // Base location
      category,
      entryDate: new Date(entryDate),
      narration,
      lines: payloadLines
    });

    if (res.success) {
      setSuccess("Journal entry posted successfully!");
      setLines([
        { id: "1", accountId: "", locationId: "", debit: "", credit: "", narration: "" },
        { id: "2", accountId: "", locationId: "", debit: "", credit: "", narration: "" },
      ]);
      setNarration("");
    } else {
      setError(res.error || "Failed to post journal entry.");
    }
    setSubmitting(false);
  };

  if (!selected) return <div className="p-8 text-center">Please select an organization context.</div>;

  return (
    <div className="kalki-main-content">
      <div className="kalki-page-header" style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 className="kalki-page-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <BookOpen size={24} style={{ color: "var(--kalki-primary)" }} />
            Manual Journals
          </h1>
          <p className="kalki-page-description">Post adjusting entries directly to the ledger.</p>
        </div>
      </div>

      <div className="kalki-section">
        <div className="kalki-section-content">
          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: "16px", paddingBottom: "24px", borderBottom: "1px solid var(--kalki-border)", marginBottom: "24px" }}>
              <div className="kalki-field">
                <label className="kalki-label">Entry Date *</label>
                <input type="date" required value={entryDate} onChange={e => setEntryDate(e.target.value)} className="kalki-input" />
              </div>
              <div className="kalki-field">
                <label className="kalki-label">Category *</label>
                <select required value={category} onChange={e => setCategory(e.target.value as any)} className="kalki-select">
                  <option value="AUDIT_CORRECTION">Audit / Correction</option>
                  <option value="DEPRECIATION">Depreciation</option>
                  <option value="OPENING_BALANCE">Opening Balance</option>
                  <option value="PROVISION">Provision</option>
                </select>
              </div>
              <div className="kalki-field">
                <label className="kalki-label">Narration *</label>
                <input type="text" required value={narration} onChange={e => setNarration(e.target.value)} placeholder="Reason for this journal entry..." className="kalki-input" />
              </div>
            </div>

            <div className="kalki-table-container" style={{ marginBottom: "24px" }}>
              <table className="kalki-table">
                <thead>
                  <tr>
                    <th style={{ width: "30%" }}>Account *</th>
                    <th style={{ width: "20%" }}>Branch *</th>
                    <th>Narration</th>
                    <th style={{ textAlign: "right", width: "120px" }}>Debit (₹)</th>
                    <th style={{ textAlign: "right", width: "120px" }}>Credit (₹)</th>
                    <th style={{ width: "40px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => (
                    <tr key={line.id}>
                      <td>
                        <select required value={line.accountId} onChange={e => handleChange(line.id, "accountId", e.target.value)} className="kalki-select">
                          <option value="">Select...</option>
                          {accounts.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                        </select>
                      </td>
                      <td>
                        <select required value={line.locationId} onChange={e => handleChange(line.id, "locationId", e.target.value)} className="kalki-select">
                          <option value="">Select...</option>
                          {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                      </td>
                      <td>
                        <input type="text" value={line.narration} onChange={e => handleChange(line.id, "narration", e.target.value)} placeholder="Optional detail" className="kalki-input" />
                      </td>
                      <td>
                        <input type="number" min="0" step="0.01" value={line.debit} onChange={e => { handleChange(line.id, "debit", e.target.value); handleChange(line.id, "credit", ""); }} disabled={!!line.credit} className="kalki-input" style={{ textAlign: "right" }} />
                      </td>
                      <td>
                        <input type="number" min="0" step="0.01" value={line.credit} onChange={e => { handleChange(line.id, "credit", e.target.value); handleChange(line.id, "debit", ""); }} disabled={!!line.debit} className="kalki-input" style={{ textAlign: "right" }} />
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <button type="button" onClick={() => handleRemoveLine(line.id)} disabled={lines.length <= 2} style={{ background: "none", border: "none", color: lines.length <= 2 ? "var(--kalki-border)" : "var(--kalki-danger)", cursor: lines.length <= 2 ? "not-allowed" : "pointer" }}>
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot style={{ background: "#f8fafc", borderTop: "2px solid var(--kalki-border)" }}>
                  <tr>
                    <td colSpan={3} style={{ textAlign: "right", fontWeight: 600, padding: "12px 16px" }}>Totals:</td>
                    <td style={{ textAlign: "right", fontWeight: 600, padding: "12px 16px" }}>{totalDebit.toFixed(2)}</td>
                    <td style={{ textAlign: "right", fontWeight: 600, padding: "12px 16px" }}>{totalCredit.toFixed(2)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button type="button" onClick={handleAddLine} className="kalki-button kalki-button--ghost" style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--kalki-primary)" }}>
                <Plus size={16} /> Add Line
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                {!isBalanced && (
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--kalki-danger)", fontSize: "13px", fontWeight: 500 }}>
                    <AlertTriangle size={16} /> Difference: {Math.abs(totalDebit - totalCredit).toFixed(2)}
                  </div>
                )}
                {error && <div style={{ color: "var(--kalki-danger)", fontSize: "13px" }}>{error}</div>}
                {success && <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#16a34a", fontSize: "13px" }}><CheckCircle size={16} /> {success}</div>}
                
                <button type="submit" disabled={submitting || !isBalanced || totalDebit <= 0} className="kalki-button kalki-button--primary" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Save size={16} />
                  {submitting ? "Posting..." : "Post Journal"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
