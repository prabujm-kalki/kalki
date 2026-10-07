"use client";

import React, { useState } from "react";
import { useSessionView } from "@/components/AppShell";
import { submitDayClose } from "@/domains/sales/eod-actions";
import { Banknote, AlertCircle, CheckCircle2, TrendingDown, TrendingUp, X, Loader2 } from "lucide-react";

const STANDARD_DENOMINATIONS = [
  500, 200, 100, 50, 20, 10, 5, 2, 1
];

export function DayCloseClient() {
  const { selected } = useSessionView();
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [counts, setCounts] = useState<Record<number, number>>(
    STANDARD_DENOMINATIONS.reduce((acc, den) => ({ ...acc, [den]: 0 }), {})
  );
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<any | null>(null);

  const totalDeclared = STANDARD_DENOMINATIONS.reduce((sum, den) => sum + (den * (counts[den] || 0)), 0);

  const handleCountChange = (den: number, val: string) => {
    const num = parseInt(val, 10) || 0;
    setCounts(prev => ({ ...prev, [den]: num < 0 ? 0 : num }));
  };

  const handleSubmit = async () => {
    if (!selected) {
      setError("Please select a location first.");
      return;
    }

    if (!confirm("Are you sure you want to close the day? You cannot modify POS transactions for this date once closed. Any variance will be automatically recorded in the ledger.")) {
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
      denominations
    });

    if (res.success) {
      setResult(res.data);
    } else {
      setError(res.error || "Failed to close the day.");
    }

    setLoading(false);
  };

  if (!selected) {
    return <div>Please select a location from the sidebar.</div>;
  }

  if (result) {
    const { systemExpectedCash, actualDeclaredCash, varianceAmount } = result;
    const isShortage = varianceAmount < 0;
    const isPerfect = varianceAmount === 0;

    return (
      <div className="kalki-card" style={{ padding: "2rem", maxWidth: "600px", margin: "0 auto", textAlign: "center" }}>
        {isPerfect ? (
          <CheckCircle2 size={64} color="var(--kalki-success)" style={{ margin: "0 auto 1rem auto" }} />
        ) : isShortage ? (
          <TrendingDown size={64} color="var(--kalki-danger)" style={{ margin: "0 auto 1rem auto" }} />
        ) : (
          <TrendingUp size={64} color="#d97706" style={{ margin: "0 auto 1rem auto" }} />
        )}
        <h2 style={{ marginBottom: "0.5rem", color: "var(--kalki-text-primary)" }}>Day Closed Successfully</h2>
        <p style={{ color: "var(--kalki-text-secondary)", marginBottom: "2rem" }}>
          Date: {new Date(date).toLocaleDateString()}
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "2rem" }}>
          <div style={{ padding: "1.5rem", background: "var(--kalki-bg)", borderRadius: "8px", border: "1px solid var(--kalki-border)" }}>
            <div style={{ fontSize: "0.85rem", color: "var(--kalki-text-secondary)", marginBottom: "0.5rem" }}>System Expected Cash</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>₹{systemExpectedCash.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </div>
          <div style={{ padding: "1.5rem", background: "var(--kalki-bg)", borderRadius: "8px", border: "1px solid var(--kalki-border)" }}>
            <div style={{ fontSize: "0.85rem", color: "var(--kalki-text-secondary)", marginBottom: "0.5rem" }}>Actual Declared Cash</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>₹{actualDeclaredCash.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </div>
        </div>

        {!isPerfect && (
          <div style={{ padding: "1rem", background: isShortage ? "rgba(220, 38, 38, 0.1)" : "rgba(217, 119, 6, 0.1)", border: `1px solid ${isShortage ? 'var(--kalki-danger)' : '#d97706'}`, borderRadius: "8px", marginBottom: "2rem" }}>
            <h4 style={{ margin: "0 0 0.5rem 0", color: isShortage ? 'var(--kalki-danger)' : '#d97706' }}>
              {isShortage ? 'Cash Shortage' : 'Cash Overage'} Detected: ₹{Math.abs(varianceAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h4>
            <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--kalki-text-secondary)" }}>
              An automated double-entry journal has been posted to the Finance ledger.
            </p>
          </div>
        )}

        <button className="kalki-button kalki-button--secondary" onClick={() => window.location.reload()}>
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "2rem", alignItems: "start" }}>
      {/* Left Column: Form */}
      <div className="kalki-card" style={{ padding: "2rem" }}>
        <h3 style={{ margin: "0 0 1.5rem 0", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Banknote size={20} color="var(--kalki-primary)" />
          Blind Cash Declaration
        </h3>
        
        <div style={{ marginBottom: "2rem" }}>
          <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 500, marginBottom: "0.5rem" }}>Business Date to Close</label>
          <input 
            type="date" 
            className="kalki-input" 
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{ maxWidth: "200px" }}
          />
          <p style={{ fontSize: "0.8rem", color: "var(--kalki-text-secondary)", marginTop: "0.5rem" }}>
            You cannot close future dates. Closing a date is an irreversible action.
          </p>
        </div>

        <div style={{ background: "var(--kalki-bg)", border: "1px solid var(--kalki-border)", borderRadius: "8px", padding: "1.5rem" }}>
          <h4 style={{ margin: "0 0 1rem 0" }}>Physical Cash Denominations</h4>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
            {STANDARD_DENOMINATIONS.map((den) => (
              <div key={den} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontWeight: 600, width: "50px", textAlign: "right" }}>₹{den}</span>
                <span style={{ color: "var(--kalki-text-secondary)" }}>x</span>
                <input 
                  type="number" 
                  min="0"
                  className="kalki-input" 
                  placeholder="0"
                  value={counts[den] || ""}
                  onChange={(e) => handleCountChange(den, e.target.value)}
                  style={{ width: "80px", textAlign: "center" }}
                />
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div style={{ marginTop: "1.5rem", padding: "1rem", background: "rgba(220, 38, 38, 0.1)", border: "1px solid var(--kalki-danger)", borderRadius: "8px", color: "var(--kalki-danger)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <div style={{ marginTop: "2rem", display: "flex", justifyContent: "flex-end" }}>
          <button 
            className="kalki-button kalki-button--primary" 
            onClick={handleSubmit}
            disabled={loading}
            style={{ minWidth: "150px" }}
          >
            {loading ? <Loader2 size={16} className="lucide-spin" style={{ animation: "spin 2s linear infinite" }} /> : "Close Day"}
          </button>
        </div>
      </div>

      {/* Right Column: Summary */}
      <div className="kalki-card" style={{ padding: "2rem", position: "sticky", top: "2rem" }}>
        <h3 style={{ margin: "0 0 1.5rem 0" }}>Declaration Summary</h3>
        
        <div style={{ padding: "1.5rem", background: "var(--kalki-primary)", color: "white", borderRadius: "12px", textAlign: "center", marginBottom: "1.5rem" }}>
          <div style={{ fontSize: "0.9rem", opacity: 0.9, marginBottom: "0.5rem" }}>Total Declared Cash</div>
          <div style={{ fontSize: "2rem", fontWeight: 700 }}>₹{totalDeclared.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
        </div>

        <div style={{ fontSize: "0.85rem", color: "var(--kalki-text-secondary)", lineHeight: 1.5, display: "flex", alignItems: "flex-start", gap: "0.5rem", padding: "1rem", background: "rgba(100, 116, 139, 0.1)", borderRadius: "8px" }}>
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
          <span>The <strong>System Expected Cash</strong> is intentionally hidden until you submit your physical count to ensure zero-trust compliance.</span>
        </div>
      </div>
    </div>
  );
}
