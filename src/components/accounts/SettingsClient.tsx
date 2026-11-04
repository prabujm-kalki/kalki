"use client";

import React, { useState, useEffect } from "react";
import { Settings, Save, AlertCircle, CheckCircle2, CreditCard, Layers } from "lucide-react";
import { useSessionView } from "@/components/AppShell";
import { fetchChartOfAccounts, fetchAccountingMappings, saveAccountingMapping } from "@/app/finance/actions";

export function AccountsSettingsClient() {
  const { selected } = useSessionView();
  const [loading, setLoading] = useState(false);
  const [accountsData, setAccountsData] = useState<{ types: any[], groups: any[], accounts: any[] } | null>(null);
  const [mappings, setMappings] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  // System and Operational Mappings
  const SYSTEM_MAPPINGS = [
    { sourceModule: "SALES", mappingType: "SYSTEM_DEFAULT", sourceReferenceId: "SALES_REVENUE", label: "Sales Revenue (Income)", helper: "Credits total gross bill revenue" },
    { sourceModule: "SALES", mappingType: "SYSTEM_DEFAULT", sourceReferenceId: "TAX_PAYABLE", label: "GST / Sales Tax Output", helper: "Credits output tax liability collected from customers" },
    { sourceModule: "PURCHASE", mappingType: "SYSTEM_DEFAULT", sourceReferenceId: "VENDOR_PAYABLE", label: "Accounts Payable (Vendors)", helper: "Credits trade vendor balances when bills are approved" },
    { sourceModule: "PURCHASE", mappingType: "SYSTEM_DEFAULT", sourceReferenceId: "GRNI_SUSPENSE", label: "GRNI Suspense Account", helper: "Goods Received Not Invoiced clearing account" },
    { sourceModule: "PURCHASE", mappingType: "SYSTEM_DEFAULT", sourceReferenceId: "BANK_CASH", label: "Default Bank / Cash for Purchases", helper: "Default outflow account for vendor payments" },
    { sourceModule: "SYSTEM", mappingType: "SYSTEM_DEFAULT", sourceReferenceId: "INTER_BRANCH_RECEIVABLE", label: "Inter-Branch Receivable", helper: "Asset account for funds owed between branches" },
    { sourceModule: "SYSTEM", mappingType: "SYSTEM_DEFAULT", sourceReferenceId: "INTER_BRANCH_PAYABLE", label: "Inter-Branch Payable", helper: "Liability account for inter-branch balancing" },
    { sourceModule: "SALES", mappingType: "SYSTEM_DEFAULT", sourceReferenceId: "CASH_SHORTAGE_EXPENSE", label: "EOD Cash Shortage", helper: "Expense account when drawer cash is less than billings" },
    { sourceModule: "SALES", mappingType: "SYSTEM_DEFAULT", sourceReferenceId: "CASH_OVERAGE_REVENUE", label: "EOD Cash Overage", helper: "Revenue account when drawer cash exceeds billings" },
  ];

  // Payment Method Tender Mappings
  const PAYMENT_MAPPINGS = [
    { sourceModule: "SALES", mappingType: "PAYMENT_METHOD", sourceReferenceId: "CASH", label: "Cash Collections", helper: "Physical currency received in register drawer" },
    { sourceModule: "SALES", mappingType: "PAYMENT_METHOD", sourceReferenceId: "UPI", label: "UPI Collections", helper: "Google Pay, PhonePe, Paytm QR received directly into bank" },
    { sourceModule: "SALES", mappingType: "PAYMENT_METHOD", sourceReferenceId: "CARD", label: "Credit / Debit Card (POS Swipe)", helper: "Pine Labs / EDC swipe machine settlements" },
    { sourceModule: "SALES", mappingType: "PAYMENT_METHOD", sourceReferenceId: "SWIGGY", label: "Swiggy Online Orders", helper: "Receivables from Swiggy online orders" },
    { sourceModule: "SALES", mappingType: "PAYMENT_METHOD", sourceReferenceId: "ZOMATO", label: "Zomato Online Orders", helper: "Receivables from Zomato online orders" },
  ];

  const loadData = () => {
    if (!selected) return;
    setLoading(true);
    setError(null);
    Promise.all([
      fetchChartOfAccounts(selected.organizationId),
      fetchAccountingMappings(selected.organizationId)
    ]).then(([accRes, mapRes]) => {
      if (accRes.success && mapRes.success) {
        setAccountsData(accRes.data as any);
        setMappings(mapRes.data as any[]);
      } else {
        setError("Failed to load settings data");
      }
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, [selected]);

  const handleMappingChange = async (def: any, accountId: string) => {
    if (!selected) return;
    const key = `${def.mappingType}-${def.sourceReferenceId}`;
    setSavingKey(key);
    const res = await saveAccountingMapping({
      organizationId: selected.organizationId,
      sourceModule: def.sourceModule,
      mappingType: def.mappingType,
      sourceReferenceId: def.sourceReferenceId,
      accountId
    });
    setSavingKey(null);
    if (res.success) {
      loadData();
    } else {
      alert("Error saving mapping: " + res.error);
    }
  };

  if (!selected) {
    return <div className="kalki-main-content" style={{ padding: "32px", textAlign: "center" }}>Please select an organization context.</div>;
  }

  if (error) {
    return <div className="kalki-main-content" style={{ padding: "32px", textAlign: "center", color: "var(--kalki-danger)" }}>{error}</div>;
  }

  return (
    <div className="kalki-main-content">
      {/* Kalki Standard Page Header */}
      <div className="kalki-page-header" style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h1 className="kalki-page-title" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Settings size={22} style={{ color: "var(--kalki-primary)" }} />
            Accounts Settings
          </h1>
          <p className="kalki-page-description">Configure the General Ledger rules, tender accounts, and automated event mappings.</p>
        </div>
      </div>

      {/* SECTION 1: Tender & Payment Methods (Cash vs UPI vs Card) */}
      <div className="kalki-section" style={{ marginBottom: "24px" }}>
        <div className="kalki-section-header">
          <div className="kalki-section-title">
            <CreditCard size={18} style={{ color: "var(--kalki-primary)" }} />
            Payment & Tender Methods (Cash vs. UPI vs. Card)
          </div>
          <span style={{ fontSize: "12px", color: "var(--kalki-text-secondary)" }}>Routes daily sales breakdown into ledger accounts</span>
        </div>
        
        <div style={{ padding: "16px 20px 8px 20px" }}>
          <p style={{ margin: "0 0 16px 0", fontSize: "13px", color: "var(--kalki-text-secondary)", lineHeight: 1.5 }}>
            Specify which balance sheet accounts receive funds from TMBill & POS. Map UPI directly to your bank account, and Cash to Cash in Hand so daily collections and Trial Balance are 100% accurate.
          </p>
        </div>

        <div className="kalki-table-container" style={{ margin: 0, border: "none", borderTop: "1px solid var(--kalki-border)" }}>
          <table className="kalki-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ width: "35%" }}>Tender / Channel</th>
                <th style={{ width: "45%" }}>Receiving General Ledger Account</th>
                <th style={{ width: "20%", textAlign: "center" }}>Mapping Status</th>
              </tr>
            </thead>
            <tbody>
              {loading || !accountsData ? (
                <tr>
                  <td colSpan={3} style={{ textAlign: "center", padding: "32px", color: "var(--kalki-text-secondary)" }}>
                    Loading tender accounts...
                  </td>
                </tr>
              ) : (
                PAYMENT_MAPPINGS.map((def, idx) => {
                  const currentMapping = mappings.find(m => 
                    m.sourceModule === def.sourceModule && 
                    m.mappingType === def.mappingType && 
                    m.sourceReferenceId === def.sourceReferenceId
                  );
                  const isSaving = savingKey === `${def.mappingType}-${def.sourceReferenceId}`;

                  return (
                    <tr key={idx} style={{ borderBottom: "1px solid var(--kalki-border)" }}>
                      <td style={{ verticalAlign: "middle" }}>
                        <div style={{ fontWeight: 600, color: "var(--kalki-text-primary)", fontSize: "14px" }}>{def.label}</div>
                        <div style={{ fontSize: "12px", color: "var(--kalki-text-secondary)", marginTop: "2px" }}>{def.helper}</div>
                        <span style={{ display: "inline-block", fontSize: "11px", fontFamily: "monospace", color: "#64748b", background: "#f1f5f9", padding: "1px 6px", borderRadius: "4px", marginTop: "4px" }}>
                          {def.sourceReferenceId}
                        </span>
                      </td>
                      <td style={{ verticalAlign: "middle" }}>
                        <select
                          className="kalki-select"
                          style={{
                            height: "40px",
                            padding: "6px 12px",
                            fontSize: "13px",
                            lineHeight: "24px",
                            fontFamily: "inherit",
                            borderColor: currentMapping ? "var(--kalki-border)" : "#f59e0b"
                          }}
                          value={currentMapping?.accountId || ""}
                          disabled={isSaving}
                          onChange={(e) => handleMappingChange(def, e.target.value)}
                        >
                          <option value="">-- Select Receiving Account --</option>
                          {accountsData.accounts.map(acc => (
                            <option key={acc.id} value={acc.id}>
                              {acc.code} — {acc.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={{ textAlign: "center", verticalAlign: "middle" }}>
                        {isSaving ? (
                          <span style={{ fontSize: "12px", color: "var(--kalki-primary)", fontWeight: 500 }}>Saving...</span>
                        ) : currentMapping ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 10px", borderRadius: "999px", background: "#dcfce7", color: "#16a34a", fontSize: "12px", fontWeight: 600 }}>
                            <CheckCircle2 size={13} /> Mapped
                          </span>
                        ) : (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 10px", borderRadius: "999px", background: "#fef3c7", color: "#b45309", fontSize: "12px", fontWeight: 600 }} title="Auto-defaults based on code">
                            <AlertCircle size={13} /> Auto Fallback
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 2: System & Operational General Ledger Mappings */}
      <div className="kalki-section">
        <div className="kalki-section-header">
          <div className="kalki-section-title">
            <Layers size={18} style={{ color: "var(--kalki-primary)" }} />
            System & Operational Account Mappings
          </div>
          <span style={{ fontSize: "12px", color: "var(--kalki-text-secondary)" }}>Automated double-entry posting rules</span>
        </div>

        <div style={{ padding: "16px 20px 8px 20px" }}>
          <p style={{ margin: "0 0 16px 0", fontSize: "13px", color: "var(--kalki-text-secondary)", lineHeight: 1.5 }}>
            These accounts receive background postings from purchasing approvals, day-close reconciliations, and inter-branch transactions.
          </p>
        </div>

        <div className="kalki-table-container" style={{ margin: 0, border: "none", borderTop: "1px solid var(--kalki-border)" }}>
          <table className="kalki-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ width: "35%" }}>Transaction Type</th>
                <th style={{ width: "45%" }}>General Ledger Account</th>
                <th style={{ width: "20%", textAlign: "center" }}>Mapping Status</th>
              </tr>
            </thead>
            <tbody>
              {loading || !accountsData ? (
                <tr>
                  <td colSpan={3} style={{ textAlign: "center", padding: "32px", color: "var(--kalki-text-secondary)" }}>
                    Loading mappings...
                  </td>
                </tr>
              ) : (
                SYSTEM_MAPPINGS.map((def, idx) => {
                  const currentMapping = mappings.find(m => 
                    m.sourceModule === def.sourceModule && 
                    m.mappingType === def.mappingType && 
                    m.sourceReferenceId === def.sourceReferenceId
                  );
                  const isSaving = savingKey === `${def.mappingType}-${def.sourceReferenceId}`;

                  return (
                    <tr key={idx} style={{ borderBottom: "1px solid var(--kalki-border)" }}>
                      <td style={{ verticalAlign: "middle" }}>
                        <div style={{ fontWeight: 600, color: "var(--kalki-text-primary)", fontSize: "14px" }}>{def.label}</div>
                        <div style={{ fontSize: "12px", color: "var(--kalki-text-secondary)", marginTop: "2px" }}>{def.helper}</div>
                        <span style={{ display: "inline-block", fontSize: "11px", fontFamily: "monospace", color: "#64748b", background: "#f1f5f9", padding: "1px 6px", borderRadius: "4px", marginTop: "4px" }}>
                          [{def.sourceModule}] {def.sourceReferenceId}
                        </span>
                      </td>
                      <td style={{ verticalAlign: "middle" }}>
                        <select
                          className="kalki-select"
                          style={{
                            height: "40px",
                            padding: "6px 12px",
                            fontSize: "13px",
                            lineHeight: "24px",
                            fontFamily: "inherit",
                            borderColor: currentMapping ? "var(--kalki-border)" : "#f59e0b"
                          }}
                          value={currentMapping?.accountId || ""}
                          disabled={isSaving}
                          onChange={(e) => handleMappingChange(def, e.target.value)}
                        >
                          <option value="">-- Select Account --</option>
                          {accountsData.accounts.map(acc => (
                            <option key={acc.id} value={acc.id}>
                              {acc.code} — {acc.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={{ textAlign: "center", verticalAlign: "middle" }}>
                        {isSaving ? (
                          <span style={{ fontSize: "12px", color: "var(--kalki-primary)", fontWeight: 500 }}>Saving...</span>
                        ) : currentMapping ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 10px", borderRadius: "999px", background: "#dcfce7", color: "#16a34a", fontSize: "12px", fontWeight: 600 }}>
                            <CheckCircle2 size={13} /> Mapped
                          </span>
                        ) : (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 10px", borderRadius: "999px", background: "#fef3c7", color: "#b45309", fontSize: "12px", fontWeight: 600 }} title="Auto-resolved dynamically">
                            <AlertCircle size={13} /> Auto Fallback
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
