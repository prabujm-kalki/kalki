"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSessionView } from "@/components/AppShell";
import { fetchDayCloseContext, submitDayClose, reopenDayClose, syncTMBillForDayClose } from "@/domains/sales/eod-actions";
import { QuickPurchaseModal } from "@/components/purchasing/QuickPurchaseModal";
import { 
  Banknote, 
  Smartphone, 
  Receipt, 
  CheckCircle2, 
  TrendingDown, 
  TrendingUp, 
  AlertCircle, 
  Loader2, 
  Calculator, 
  ArrowRight, 
  ArrowLeft,
  Lock,
  RotateCcw,
  RefreshCw,
  PlusCircle,
  FileCheck2,
  ExternalLink,
  Eye
} from "lucide-react";

const STANDARD_DENOMINATIONS = [
  500, 200, 100, 50, 20, 10, 5, 2, 1
];

export function DayCloseClient() {
  const { selected, session } = useSessionView();
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [counts, setCounts] = useState<Record<number, number>>(
    STANDARD_DENOMINATIONS.reduce((acc, den) => ({ ...acc, [den]: 0 }), {})
  );
  
  // UPI Declaration
  const [declaredUpi, setDeclaredUpi] = useState<string>("");

  // Auto-loaded Context Data
  const [fetchingContext, setFetchingContext] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [syncingTMBill, setSyncingTMBill] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [contextData, setContextData] = useState<{
    isClosed: boolean;
    closedRecord: any | null;
    openingCash: number;
    cashExpenses: number;
    upiExpenses: number;
    expensesList: any[];
    systemSales: { cash: number; upi: number; other: number; total: number };
  } | null>(null);

  const [step, setStep] = useState<"ENTRY" | "PREVIEW">("ENTRY");
  const [isQuickPurchaseOpen, setIsQuickPurchaseOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<any | null>(null);

  // Load opening cash and expenses
  const loadContext = useCallback(async (orgId: string, locId: string, targetDate: string) => {
    setFetchingContext(true);
    setError("");
    const res = await fetchDayCloseContext(orgId, locId, targetDate);
    if (res.success && res.data) {
      setContextData(res.data);
    } else {
      setError(res.error || "Failed to load day context.");
    }
    setFetchingContext(false);
  }, []);

  // Sync TMBill data on demand or automatically
  const handleSyncTMBill = useCallback(async (silent = false) => {
    if (!selected) return;
    if (!silent) {
      setSyncingTMBill(true);
      setSyncFeedback(null);
    }
    try {
      const syncRes = await syncTMBillForDayClose(selected.organizationId, selected.locationId, date);
      if (syncRes.success && syncRes.data) {
        setLastSyncedAt(syncRes.data.syncedAt);
        if (!silent) {
          const processed = syncRes.data.totalProcessed || 0;
          const pushed = syncRes.data.pushedCount || 0;
          setSyncFeedback({
            type: "success",
            message: `Synced ${processed} bill${processed === 1 ? "" : "s"} (${pushed} updated) at ${syncRes.data.syncedAt}`
          });
        }
      } else if (!silent) {
        setSyncFeedback({
          type: "error",
          message: syncRes.error || "Failed to sync with POS."
        });
      }
    } catch (e: any) {
      console.warn("TMBill background sync warning:", e);
      if (!silent) {
        setSyncFeedback({
          type: "error",
          message: e?.message || "Error connecting to POS sync service."
        });
      }
    } finally {
      // Re-fetch context to reflect latest synced orders
      await loadContext(selected.organizationId, selected.locationId, date);
      if (!silent) setSyncingTMBill(false);
    }
  }, [selected, date, loadContext]);

  // Auto-pull from TMBill up to this exact second and load context on mount or when date/location changes
  useEffect(() => {
    if (!selected) return;
    // Initial fetch of context
    loadContext(selected.organizationId, selected.locationId, date);
    // Trigger auto-sync in background to pull latest bills up to this second
    handleSyncTMBill(true);
  }, [selected, date, loadContext, handleSyncTMBill]);

  // Denominations Total = Cash in Hand
  const cashInHand = STANDARD_DENOMINATIONS.reduce((sum, den) => sum + (den * (counts[den] || 0)), 0);
  const parsedUpi = parseFloat(declaredUpi || "0") || 0;
  // Strict non-editable opening cash carried from yesterday's closing cash in hand
  const effectiveOpeningCash = contextData?.openingCash || 0;

  const cashExpenses = contextData?.cashExpenses || 0;
  const upiExpenses = contextData?.upiExpenses || 0;

  // Real-time Standard Formula:
  // Net Calculated Cash Sales = Cash in Hand + Cash Expenses - Opening Cash
  const netCashSales = cashInHand + cashExpenses - effectiveOpeningCash;
  // Net Calculated UPI Sales = Declared UPI + UPI Expenses
  const netUpiSales = parsedUpi + upiExpenses;
  // Net Calculated Total Sales
  const netCalculatedSales = netCashSales + netUpiSales;

  const handleCountChange = (den: number, val: string) => {
    const num = parseInt(val, 10) || 0;
    setCounts(prev => ({ ...prev, [den]: num < 0 ? 0 : num }));
  };

  const handleSubmit = async () => {
    if (!selected) {
      setError("Please select a location first.");
      return;
    }

    if (!confirm("Are you sure you want to close the day? This will record physical cash denominations, lock daily reconciliations, and post financial journal entries to your General Ledger.")) {
      return;
    }

    setLoading(true);
    setError("");

    const denominations = Object.entries(counts)
      .filter(([_, count]) => count > 0)
      .map(([den, count]) => ({
        denomination: parseInt(den, 10),
        count
      }));

    const res = await submitDayClose({
      organizationId: selected.organizationId,
      locationId: selected.locationId,
      date,
      denominations,
      declaredUpi: parsedUpi
    });

    if (res.success) {
      setResult(res.data);
    } else {
      setError(res.error || "Failed to close the day.");
    }

    setLoading(false);
  };

  if (!selected) {
    return <div className="p-8 text-center">Please select a location from the sidebar.</div>;
  }

  // Preview Step View
  if (step === "PREVIEW") {
    const systemTotal = contextData?.systemSales?.total || 0;
    const variance = netCalculatedSales - systemTotal;
    const isShortage = variance < -0.01;
    const isOverage = variance > 0.01;
    const isBalanced = !isShortage && !isOverage;

    return (
      <div style={{ maxWidth: "1000px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {/* Top Header Card */}
        <div className="kalki-card" style={{ padding: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <FileCheck2 size={24} color="var(--kalki-primary)" />
              <h2 style={{ margin: 0, fontSize: "1.35rem", color: "var(--kalki-text-primary)" }}>Day Close Audit Preview</h2>
            </div>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--kalki-text-secondary)" }}>
              Carefully verify all figures, vouchers, and reconciliations before locking the day in the permanent ledger.
            </p>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <span style={{ fontSize: "0.85rem", color: "#64748b" }}>Date: <strong>{date}</strong></span>
            <span style={{ fontSize: "0.85rem", color: "#64748b" }}>|</span>
            <span style={{ fontSize: "0.85rem", color: "#64748b" }}>Branch: <strong>{selected.locationName}</strong></span>
          </div>
        </div>

        {/* Master Reconciliation Summary Banner */}
        <div className="kalki-card" style={{
          padding: "1.5rem",
          border: `1.5px solid ${isBalanced ? "#86efac" : isShortage ? "#fca5a5" : "#fde68a"}`,
          background: isBalanced ? "#f0fdf4" : isShortage ? "#fef2f2" : "#fffbeb"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <div style={{ fontSize: "0.85rem", fontWeight: 600, color: isBalanced ? "#166534" : isShortage ? "#991b1b" : "#92400e", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                {isBalanced ? "✓ Perfectly Reconciled" : isShortage ? "⚠️ Discrepancy Alert: Cash/Digital Shortage" : "ℹ️ Discrepancy Notice: Cash/Digital Overage"}
              </div>
              <div style={{ fontSize: "1.6rem", fontWeight: 800, color: isBalanced ? "#15803d" : isShortage ? "#dc2626" : "#b45309", marginTop: "4px" }}>
                {isBalanced ? "₹0.00 Variance" : `${variance < 0 ? "-" : "+"}₹${Math.abs(variance).toLocaleString(undefined, { minimumFractionDigits: 2 })} Variance`}
              </div>
              <div style={{ fontSize: "0.85rem", color: "#475569", marginTop: "4px" }}>
                Net Calculated Sales (₹{netCalculatedSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}) vs TMBill POS Sales (₹{systemTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })})
              </div>
            </div>

            <div style={{ display: "flex", gap: "1rem" }}>
              <div style={{ padding: "10px 16px", background: "white", borderRadius: "8px", border: "1px solid rgba(0,0,0,0.08)" }}>
                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>POS System Cash</div>
                <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#1e293b" }}>₹{(contextData?.systemSales?.cash || 0).toFixed(2)}</div>
              </div>
              <div style={{ padding: "10px 16px", background: "white", borderRadius: "8px", border: "1px solid rgba(0,0,0,0.08)" }}>
                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>POS System UPI</div>
                <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#1e293b" }}>₹{(contextData?.systemSales?.upi || 0).toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* 2-Column Audit Breakdown */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
          {/* Cash Audit Card */}
          <div className="kalki-card" style={{ padding: "1.5rem" }}>
            <h3 style={{ margin: "0 0 1rem 0", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.05rem" }}>
              <Banknote size={20} color="var(--kalki-primary)" />
              Cash Drawer Audit Breakdown
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.9rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b" }}>Cash in Hand (Physical Notes & Coins):</span>
                <strong>+ ₹{cashInHand.toFixed(2)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", color: "#b45309" }}>
                <span>(+) Cash Expenses / Spot Purchases:</span>
                <strong>+ ₹{cashExpenses.toFixed(2)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", color: "#b91c1c" }}>
                <span>(-) Yesterday's Opening Float (Carried):</span>
                <strong>- ₹{effectiveOpeningCash.toFixed(2)}</strong>
              </div>
              <div style={{ height: "1px", background: "#e2e8f0", margin: "4px 0" }}></div>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: "1rem" }}>
                <span>Net Cash Generated from Sales:</span>
                <span style={{ color: "var(--kalki-primary)" }}>₹{netCashSales.toFixed(2)}</span>
              </div>
            </div>

            {/* Denomination chips */}
            <div style={{ marginTop: "1.2rem", paddingTop: "1rem", borderTop: "1px dashed #e2e8f0" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", marginBottom: "8px" }}>
                Counted Denominations
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {STANDARD_DENOMINATIONS.map((den) => {
                  const count = counts[den] || 0;
                  if (count === 0) return null;
                  return (
                    <span key={den} style={{ padding: "4px 8px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "0.8rem", color: "#334155" }}>
                      ₹{den} × <strong>{count}</strong> = ₹{(den * count).toLocaleString()}
                    </span>
                  );
                })}
                {cashInHand === 0 && <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>No physical denominations entered.</span>}
              </div>
            </div>
          </div>

          {/* Digital / UPI Audit Card */}
          <div className="kalki-card" style={{ padding: "1.5rem" }}>
            <h3 style={{ margin: "0 0 1rem 0", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.05rem" }}>
              <Smartphone size={20} color="#0284c7" />
              Digital & UPI Audit Breakdown
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.9rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b" }}>Declared Settlement / Soundbox Total:</span>
                <strong>+ ₹{parsedUpi.toFixed(2)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", color: "#2563eb" }}>
                <span>(+) Digital / UPI Expenses Paid:</span>
                <strong>+ ₹{upiExpenses.toFixed(2)}</strong>
              </div>
              <div style={{ height: "1px", background: "#e2e8f0", margin: "4px 0" }}></div>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: "1rem" }}>
                <span>Net Digital Generated from Sales:</span>
                <span style={{ color: "#0284c7" }}>₹{netUpiSales.toFixed(2)}</span>
              </div>
            </div>

            <div style={{ marginTop: "1.2rem", paddingTop: "1rem", borderTop: "1px dashed #e2e8f0", fontSize: "0.85rem", color: "#64748b" }}>
              Batch slip / EDC terminal collection matches total digital receipts processed through branch QR accounts.
            </div>
          </div>
        </div>

        {/* Expenses List Card with Add Button */}
        <div className="kalki-card" style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.05rem" }}>
                <Receipt size={20} color="#b45309" />
                Deducted Petty Expenses & Spot Purchases ({contextData?.expensesList?.length || 0})
              </h3>
              <p style={{ margin: "4px 0 0 0", fontSize: "0.8rem", color: "#64748b" }}>
                Verify that no expenses from today are missing before locking.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsQuickPurchaseOpen(true)}
              className="kalki-button"
              style={{
                height: "34px",
                padding: "6px 14px",
                fontSize: "13px",
                fontWeight: 600,
                background: "#fef3c7",
                color: "#92400e",
                border: "1px solid #fde68a",
                borderRadius: "6px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              <PlusCircle size={15} />
              + Add Missing Expense
            </button>
          </div>

          {(!contextData?.expensesList || contextData.expensesList.length === 0) ? (
            <div style={{ padding: "1.5rem", textAlign: "center", background: "#f8fafc", borderRadius: "8px", border: "1px dashed #cbd5e1", color: "#64748b", fontSize: "0.85rem" }}>
              No spot purchases or petty expense vouchers recorded for today. If staff paid any cash or online expenses from the counter, click <strong>+ Add Missing Expense</strong> above.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "1.5px solid #e2e8f0", color: "#475569" }}>
                    <th style={{ padding: "8px 12px" }}>Voucher #</th>
                    <th style={{ padding: "8px 12px" }}>Vendor / Description</th>
                    <th style={{ padding: "8px 12px" }}>Payment Mode</th>
                    <th style={{ padding: "8px 12px" }}>Audit Status</th>
                    <th style={{ padding: "8px 12px", textAlign: "right" }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {contextData.expensesList.map((exp: any) => {
                    const isUpi = (exp.paymentSource || "").toUpperCase().includes("UPI") || (exp.paymentSource || "").toUpperCase().includes("ONLINE");
                    return (
                      <tr key={exp.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "8px 12px", fontWeight: 600, color: "#1e293b" }}>{exp.voucherNumber || "VCH-SPOT"}</td>
                        <td style={{ padding: "8px 12px", color: "#334155" }}>{exp.vendorName || "Spot Vendor"}</td>
                        <td style={{ padding: "8px 12px" }}>
                          <span style={{
                            padding: "2px 8px",
                            borderRadius: "12px",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            background: isUpi ? "#eff6ff" : "#fefce8",
                            color: isUpi ? "#1d4ed8" : "#854d0e"
                          }}>
                            {exp.paymentSource || "PETTY_CASH"}
                          </span>
                        </td>
                        <td style={{ padding: "8px 12px" }}>
                          <span style={{ fontSize: "0.75rem", color: "#64748b" }}>{exp.auditStatus || "RECORDED"}</span>
                        </td>
                        <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, color: "#0f172a" }}>
                          ₹{parseFloat(exp.totalAmount || "0").toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: "2px solid #e2e8f0", fontWeight: 700 }}>
                    <td colSpan={4} style={{ padding: "10px 12px" }}>Total Deducted Expenses (Cash: ₹{cashExpenses.toFixed(2)} | UPI: ₹{upiExpenses.toFixed(2)})</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", color: "#b45309" }}>₹{(cashExpenses + upiExpenses).toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {error && (
          <div style={{ padding: "1rem", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "8px", color: "var(--kalki-danger)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {/* Bottom Actions: Back to Edit vs Confirm & Lock */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", padding: "1rem 0" }}>
          <button
            type="button"
            onClick={() => setStep("ENTRY")}
            disabled={loading}
            className="kalki-button kalki-button--secondary"
            style={{ height: "44px", padding: "0 20px", display: "inline-flex", alignItems: "center", gap: "8px" }}
          >
            <ArrowLeft size={16} />
            Back to Edit Denominations & Figures
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || contextData?.isClosed}
            className="kalki-button kalki-button--primary"
            style={{
              height: "44px",
              padding: "0 28px",
              fontSize: "15px",
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            {loading ? <Loader2 size={18} className="lucide-spin" style={{ animation: "spin 2s linear infinite" }} /> : (
              <>
                <Lock size={16} />
                Confirm & Lock Day Close
              </>
            )}
          </button>
        </div>

        {/* Quick Purchase Modal for Adding Missing Expenses */}
        {isQuickPurchaseOpen && selected?.organizationId && selected?.locationId && (
          <QuickPurchaseModal
            isOpen={isQuickPurchaseOpen}
            onClose={() => setIsQuickPurchaseOpen(false)}
            organizationId={selected.organizationId}
            locationId={selected.locationId}
            currentUserId={session?.user?.id || ""}
            onSuccess={async () => {
              setIsQuickPurchaseOpen(false);
              await loadContext(selected.organizationId, selected.locationId, date);
            }}
          />
        )}
      </div>
    );
  }

  // Success State
  if (result) {
    const { 
      openingCash, 
      actualDeclaredCash, 
      declaredUpi: resUpi, 
      cashExpenses: resCashExp, 
      upiExpenses: resUpiExp, 
      netCalculatedSales: resCalculatedSales, 
      totalSystemSales, 
      overallVariance,
      cashVariance,
      upiVariance 
    } = result;

    const isShortage = overallVariance < 0;
    const isPerfect = Math.abs(overallVariance) < 0.01;

    return (
      <div className="kalki-card" style={{ padding: "2.5rem", maxWidth: "750px", margin: "0 auto", textAlign: "center" }}>
        {isPerfect ? (
          <CheckCircle2 size={64} style={{ color: "var(--kalki-success)", margin: "0 auto 1rem auto" }} />
        ) : isShortage ? (
          <TrendingDown size={64} style={{ color: "var(--kalki-danger)", margin: "0 auto 1rem auto" }} />
        ) : (
          <TrendingUp size={64} style={{ color: "#d97706", margin: "0 auto 1rem auto" }} />
        )}
        <h2 style={{ marginBottom: "0.5rem", color: "var(--kalki-text-primary)" }}>Day Closed & Reconciled Successfully</h2>
        <p style={{ color: "var(--kalki-text-secondary)", marginBottom: "2rem" }}>
          Location: <strong>{selected.locationName}</strong> | Date: <strong>{date}</strong>
        </p>

        {/* 4-Stat Metric Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
          <div style={{ padding: "1.2rem", background: "var(--kalki-bg)", borderRadius: "8px", border: "1px solid var(--kalki-border)" }}>
            <div style={{ fontSize: "0.8rem", color: "var(--kalki-text-secondary)", marginBottom: "0.3rem" }}>Closing Cash in Hand</div>
            <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--kalki-primary)" }}>₹{actualDeclaredCash.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "4px" }}>Tomorrow's Opening Float</div>
          </div>
          <div style={{ padding: "1.2rem", background: "var(--kalki-bg)", borderRadius: "8px", border: "1px solid var(--kalki-border)" }}>
            <div style={{ fontSize: "0.8rem", color: "var(--kalki-text-secondary)", marginBottom: "0.3rem" }}>Declared UPI Gross</div>
            <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#0284c7" }}>₹{resUpi.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "4px" }}>Soundbox / Batch Total</div>
          </div>
          <div style={{ padding: "1.2rem", background: "var(--kalki-bg)", borderRadius: "8px", border: "1px solid var(--kalki-border)" }}>
            <div style={{ fontSize: "0.8rem", color: "var(--kalki-text-secondary)", marginBottom: "0.3rem" }}>Total Expenses Deducted</div>
            <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#b45309" }}>₹{(resCashExp + resUpiExp).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "4px" }}>Cash: ₹{resCashExp} | UPI: ₹{resUpiExp}</div>
          </div>
        </div>

        {/* Comparison Result Banner */}
        <div style={{ 
          padding: "1.2rem", 
          borderRadius: "8px", 
          border: `1px solid ${isPerfect ? "#86efac" : isShortage ? "#fca5a5" : "#fde68a"}`,
          background: isPerfect ? "#f0fdf4" : isShortage ? "#fef2f2" : "#fffbeb",
          marginBottom: "2rem",
          textAlign: "left"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>Net Calculated Sales vs System POS Sales:</span>
            <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>
              ₹{resCalculatedSales.toLocaleString(undefined, { minimumFractionDigits: 2 })} vs ₹{totalSystemSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div style={{ fontSize: "0.85rem", color: "#475569" }}>
            {isPerfect ? (
              <span style={{ color: "#166534", fontWeight: 600 }}>✓ Zero Variance. Drawer and digital settlements reconcile perfectly.</span>
            ) : isShortage ? (
              <span style={{ color: "#b91c1c", fontWeight: 600 }}>⚠️ Net Shortage of ₹{Math.abs(overallVariance).toFixed(2)} recorded in Finance Shortage Account.</span>
            ) : (
              <span style={{ color: "#b45309", fontWeight: 600 }}>ℹ️ Net Overage of ₹{overallVariance.toFixed(2)} recorded in Revenue Variance Account.</span>
            )}
          </div>
        </div>

        <button className="kalki-button kalki-button--secondary" onClick={() => window.location.reload()}>
          Done / Close Another Day
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1.2fr", gap: "2rem", alignItems: "start" }}>
      {/* Left Column: Input Form */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {/* Date and Location Header Card */}
        <div className="kalki-card" style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "var(--kalki-text-secondary)", marginBottom: "0.3rem" }}>Business Date to Close</label>
              <input 
                type="date" 
                className="kalki-input" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{ height: "36px", padding: "6px 12px", width: "auto" }}
              />
            </div>

            {/* Opening Cash Indicator (Strictly auto-fetched, non-editable) */}
            <div style={{ background: "#f8fafc", padding: "10px 18px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                Yesterday's Closing Cash (Opening Float)
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "2px" }}>
                <span style={{ fontSize: "1.25rem", fontWeight: 700, color: "#1e293b" }}>
                  ₹{effectiveOpeningCash.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                <span style={{ fontSize: "0.75rem", padding: "2px 8px", background: "#e0f2fe", color: "#0369a1", borderRadius: "12px", fontWeight: 600 }}>
                  Locked & Carried
                </span>
              </div>
            </div>
          </div>

          {contextData?.isClosed && (
            <div style={{ marginTop: "1rem", padding: "12px 14px", background: "#fef3c7", border: "1px solid #fde68a", borderRadius: "8px", color: "#92400e", fontSize: "0.85rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Lock size={16} />
                <span><strong>Notice:</strong> This date has already been closed and locked in the General Ledger.</span>
              </div>
              {session?.isOwner && (
                <button
                  type="button"
                  onClick={async () => {
                    if (!confirm(`Super User Authorization: Are you sure you want to RE-OPEN the Day Close for ${date}? This will unlock the registers and remove previous postings for this date so you can re-declare.`)) {
                      return;
                    }
                    setReopening(true);
                    const res = await reopenDayClose(selected.organizationId, selected.locationId, date);
                    if (res.success) {
                      // Reload context
                      const ctxRes = await fetchDayCloseContext(selected.organizationId, selected.locationId, date);
                      if (ctxRes.success) setContextData(ctxRes.data as any);
                    } else {
                      alert(res.error || "Failed to reopen day close.");
                    }
                    setReopening(false);
                  }}
                  disabled={reopening}
                  className="kalki-button"
                  style={{ height: "30px", padding: "4px 10px", fontSize: "12px", background: "#b45309", color: "white", border: "none", display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  {reopening ? <Loader2 size={12} className="lucide-spin" style={{ animation: "spin 2s linear infinite" }} /> : <RotateCcw size={12} />}
                  Super User: Re-open Date & Edit
                </button>
              )}
            </div>
          )}
        </div>

        {/* Section 1: Physical Cash Denominations */}
        <div className="kalki-card" style={{ padding: "1.5rem" }}>
          <h3 style={{ margin: "0 0 1rem 0", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.05rem" }}>
            <Banknote size={20} color="var(--kalki-primary)" />
            Step 1: Physical Cash Denominations (Cash in Hand)
          </h3>
          <p style={{ fontSize: "0.85rem", color: "var(--kalki-text-secondary)", marginBottom: "1.2rem" }}>
            Count the physical notes and coins in the cash drawer at end of day.
          </p>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
            {STANDARD_DENOMINATIONS.map((den) => (
              <div key={den} style={{ display: "flex", alignItems: "center", gap: "8px", background: "#f8fafc", padding: "8px 10px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                <span style={{ fontWeight: 600, width: "45px", textAlign: "right", fontSize: "0.9rem" }}>₹{den}</span>
                <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>×</span>
                <input 
                  type="number" 
                  min="0"
                  className="kalki-input" 
                  placeholder="0"
                  value={counts[den] || ""}
                  onChange={(e) => handleCountChange(den, e.target.value)}
                  style={{ width: "70px", textAlign: "center", padding: "4px 8px", height: "32px", fontSize: "0.9rem" }}
                />
                <span style={{ fontSize: "0.8rem", color: "#64748b", marginLeft: "auto", fontWeight: 500 }}>
                  = ₹{(den * (counts[den] || 0)).toLocaleString()}
                </span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #e2e8f0", paddingTop: "12px" }}>
            <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "#475569" }}>Total Cash in Hand:</span>
            <span style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--kalki-primary)" }}>
              ₹{cashInHand.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Section 2: UPI / QR Declaration */}
        <div className="kalki-card" style={{ padding: "1.5rem" }}>
          <h3 style={{ margin: "0 0 0.8rem 0", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.05rem" }}>
            <Smartphone size={20} color="#0284c7" />
            Step 2: Declared UPI / QR Machine Total
          </h3>
          <p style={{ fontSize: "0.85rem", color: "var(--kalki-text-secondary)", marginBottom: "1rem" }}>
            Enter the settlement batch total shown on your UPI Soundbox / PhonePe / Paytm / EDC machine slip.
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "1.1rem", fontWeight: 600, color: "#0f172a" }}>₹</span>
            <input 
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              className="kalki-input"
              value={declaredUpi}
              onChange={(e) => setDeclaredUpi(e.target.value)}
              style={{ maxWidth: "250px", height: "40px", fontSize: "1.1rem", fontWeight: 600 }}
            />
            <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
              (Total digital collections for {date})
            </span>
          </div>
        </div>

        {/* Section 3: Today's Deducted Expenses Summary */}
        <div className="kalki-card" style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.8rem", flexWrap: "wrap", gap: "8px" }}>
            <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.05rem" }}>
              <Receipt size={20} color="#b45309" />
              Step 3: Today's Spot Purchases & Petty Expenses
            </h3>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                {contextData?.expensesList?.length || 0} Vouchers Recorded
              </span>
              <button
                type="button"
                onClick={() => setIsQuickPurchaseOpen(true)}
                className="kalki-button"
                style={{
                  height: "30px",
                  padding: "4px 10px",
                  fontSize: "12px",
                  fontWeight: 600,
                  background: "#fef3c7",
                  color: "#92400e",
                  border: "1px solid #fde68a",
                  borderRadius: "6px",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px"
                }}
              >
                <PlusCircle size={14} />
                + Add Expense Voucher
              </button>
            </div>
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <div style={{ padding: "12px 14px", background: "#fefce8", border: "1px solid #fef08a", borderRadius: "8px" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#854d0e" }}>EXPENSES IN CASH (DRAWER)</div>
              <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#a16207", marginTop: "2px" }}>
                ₹{cashExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div style={{ padding: "12px 14px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#1e40af" }}>EXPENSES IN UPI / ONLINE</div>
              <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#2563eb", marginTop: "2px" }}>
                ₹{upiExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          <p style={{ margin: 0, fontSize: "0.8rem", color: "#64748b" }}>
            * Automatically fetched from spot purchases and petty vouchers logged for today. You can add any missing expense voucher directly using the button above.
          </p>
        </div>

        {error && (
          <div style={{ padding: "1rem", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "8px", color: "var(--kalki-danger)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button 
            className="kalki-button kalki-button--primary" 
            onClick={() => setStep("PREVIEW")}
            disabled={loading || contextData?.isClosed}
            style={{ minWidth: "220px", height: "44px", fontSize: "15px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
          >
            <Eye size={18} />
            Review & Preview Summary
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* Right Column: Live Master Equation Cockpit */}
      <div className="kalki-card" style={{ padding: "1.5rem", position: "sticky", top: "2rem" }}>
        <h3 style={{ margin: "0 0 1rem 0", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.05rem" }}>
          <Calculator size={20} color="var(--kalki-primary)" />
          Live Reconciliation Cockpit
        </h3>

        {/* Master Formula Breakdown */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "14px", background: "var(--kalki-bg)", borderRadius: "8px", border: "1px solid var(--kalki-border)", marginBottom: "1.2rem" }}>
          <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>Calculation Breakdown</div>
          
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
            <span>Cash in Hand:</span>
            <strong>+ ₹{cashInHand.toFixed(2)}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "#b45309" }}>
            <span>Cash Expenses:</span>
            <strong>+ ₹{cashExpenses.toFixed(2)}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "#b91c1c" }}>
            <span>Opening Cash (Carried):</span>
            <strong>- ₹{effectiveOpeningCash.toFixed(2)}</strong>
          </div>
          <div style={{ height: "1px", background: "#cbd5e1" }}></div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", fontWeight: 600 }}>
            <span>Net Cash Generated:</span>
            <span style={{ color: "var(--kalki-primary)" }}>₹{netCashSales.toFixed(2)}</span>
          </div>

          <div style={{ height: "1px", background: "#cbd5e1", margin: "4px 0" }}></div>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
            <span>Declared UPI Total:</span>
            <strong>+ ₹{parsedUpi.toFixed(2)}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "#2563eb" }}>
            <span>UPI Expenses Paid:</span>
            <strong>+ ₹{upiExpenses.toFixed(2)}</strong>
          </div>
          <div style={{ height: "1px", background: "#cbd5e1" }}></div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", fontWeight: 600 }}>
            <span>Net Digital Generated:</span>
            <span style={{ color: "#0284c7" }}>₹{netUpiSales.toFixed(2)}</span>
          </div>
        </div>

        {/* Total Calculated Sales Header */}
        <div style={{ padding: "16px", background: "var(--kalki-primary)", color: "white", borderRadius: "10px", textAlign: "center", marginBottom: "1.2rem" }}>
          <div style={{ fontSize: "0.85rem", opacity: 0.9, marginBottom: "4px" }}>Total Net Calculated Sales</div>
          <div style={{ fontSize: "1.8rem", fontWeight: 800 }}>₹{netCalculatedSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          <div style={{ fontSize: "0.75rem", opacity: 0.8, marginTop: "4px" }}>
            (Cash Net + UPI Net)
          </div>
        </div>

        {/* System Sales vs Variance Indicator */}
        <div style={{ padding: "12px 14px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "0.8rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#334155" }}>TMBill POS Sales:</span>
              <button
                type="button"
                onClick={() => handleSyncTMBill(false)}
                disabled={syncingTMBill || fetchingContext}
                style={{
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  borderRadius: "4px",
                  padding: "2px 8px",
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  color: "#1d4ed8",
                  cursor: syncingTMBill ? "wait" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  transition: "all 0.15s ease",
                }}
                title="Fetch live bills from TMBill up to this exact second"
              >
                <RefreshCw size={11} className={syncingTMBill ? "lucide-spin" : ""} style={{ animation: syncingTMBill ? "spin 1s linear infinite" : "none" }} />
                {syncingTMBill ? "Syncing..." : "Sync Live POS"}
              </button>
            </div>
            <strong style={{ fontSize: "1rem", color: "#0f172a" }}>
              ₹{(contextData?.systemSales?.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </strong>
          </div>

          {/* Breakdown: Cash vs UPI */}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#64748b", padding: "4px 0", borderTop: "1px dashed #e2e8f0" }}>
            <span>POS Cash: ₹{(contextData?.systemSales?.cash || 0).toFixed(2)}</span>
            <span>POS UPI: ₹{(contextData?.systemSales?.upi || 0).toFixed(2)}</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "6px", paddingTop: "6px", borderTop: "1px solid #e2e8f0" }}>
            <span style={{ fontSize: "0.85rem", color: "#64748b" }}>Estimated Variance:</span>
            <strong style={{ 
              fontSize: "0.95rem", 
              color: Math.abs(netCalculatedSales - (contextData?.systemSales?.total || 0)) < 0.01 
                ? "#166534" 
                : (netCalculatedSales - (contextData?.systemSales?.total || 0)) < 0 ? "#dc2626" : "#d97706" 
            }}>
              {netCalculatedSales - (contextData?.systemSales?.total || 0) >= 0 ? "+" : ""}
              ₹{(netCalculatedSales - (contextData?.systemSales?.total || 0)).toFixed(2)}
            </strong>
          </div>

          {syncFeedback && (
            <div style={{
              marginTop: "8px",
              padding: "6px 10px",
              borderRadius: "6px",
              fontSize: "0.75rem",
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: syncFeedback.type === "success" ? "#ecfdf5" : syncFeedback.type === "error" ? "#fef2f2" : "#eff6ff",
              color: syncFeedback.type === "success" ? "#065f46" : syncFeedback.type === "error" ? "#991b1b" : "#1d4ed8",
              border: `1px solid ${syncFeedback.type === "success" ? "#a7f3d0" : syncFeedback.type === "error" ? "#fca5a5" : "#bfdbfe"}`
            }}>
              {syncFeedback.type === "success" ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
              <span>{syncFeedback.message}</span>
            </div>
          )}

          {lastSyncedAt && !syncFeedback && (
            <div style={{ fontSize: "0.7rem", color: "#94a3b8", textAlign: "right", marginTop: "4px" }}>
              Synced with TMBill at {lastSyncedAt}
            </div>
          )}
        </div>

        <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "1rem", lineHeight: 1.4 }}>
          💡 <strong>Zero-Trust Rule:</strong> The system automatically records physical notes, UPI tenders, and petty expenses into the permanent audit ledger upon confirmation.
        </div>
      </div>

      {/* Quick Purchase Modal for Adding Missing Expenses from Step 1 */}
      {isQuickPurchaseOpen && selected?.organizationId && selected?.locationId && (
        <QuickPurchaseModal
          isOpen={isQuickPurchaseOpen}
          onClose={() => setIsQuickPurchaseOpen(false)}
          organizationId={selected.organizationId}
          locationId={selected.locationId}
          currentUserId={session?.user?.id || ""}
          onSuccess={async () => {
            setIsQuickPurchaseOpen(false);
            await loadContext(selected.organizationId, selected.locationId, date);
          }}
        />
      )}
    </div>
  );
}
