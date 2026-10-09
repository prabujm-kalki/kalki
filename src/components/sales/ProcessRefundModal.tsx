"use client";

import React, { useState } from "react";
import { X, AlertCircle, Loader2, CheckCircle } from "lucide-react";
import { refundCreditNote } from "@/app/sales/actions";

interface CreditNote {
  id: string;
  creditNoteNumber: string;
  remainingBalance: number;
}

interface ProcessRefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  creditNote: CreditNote | null;
}

export default function ProcessRefundModal({
  isOpen,
  onClose,
  onSuccess,
  creditNote,
}: ProcessRefundModalProps) {
  const [paymentMethod, setPaymentMethod] = useState("BANK_TRANSFER");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize refundAmount when creditNote changes
  React.useEffect(() => {
    if (creditNote) {
      setRefundAmount(creditNote.remainingBalance.toString());
    }
  }, [creditNote]);

  if (!isOpen || !creditNote) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await refundCreditNote({
        creditNoteId: creditNote.id,
        refundAmount: parseFloat(refundAmount),
        paymentMethod,
        referenceNumber,
        notes,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "An error occurred while processing the refund.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }}>
      <div style={{ backgroundColor: "white", padding: "1.5rem", borderRadius: "0.5rem", width: "100%", maxWidth: "500px", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "600", color: "#111827" }}>Process Refund</h3>
            <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.875rem", color: "#6b7280" }}>{creditNote.creditNoteNumber}</p>
          </div>
          <button onClick={onClose} disabled={isSubmitting} style={{ background: "none", border: "none", color: "#9ca3af", cursor: isSubmitting ? "not-allowed" : "pointer", padding: 0 }}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{ marginBottom: "1rem", padding: "0.75rem", backgroundColor: "#fef2f2", color: "#991b1b", borderRadius: "0.375rem", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", fontWeight: "500" }}>
              <AlertCircle size={18} /> {error}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", marginBottom: "1.5rem" }}>
            <div style={{ padding: "1rem", backgroundColor: "#f9fafb", borderRadius: "0.375rem", border: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
              <span style={{ fontSize: "0.875rem", color: "#4b5563", fontWeight: "500" }}>Amount to Refund:</span>
              <div style={{ position: "relative", width: "150px" }}>
                <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#6b7280", fontWeight: "500" }}>₹</span>
                <input
                  type="number"
                  min="0.01"
                  max={creditNote.remainingBalance}
                  step="0.01"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  disabled={isSubmitting}
                  style={{ width: "100%", padding: "0.5rem 0.5rem 0.5rem 2rem", border: "1px solid #d1d5db", borderRadius: "0.375rem", fontSize: "1rem", fontWeight: "600", color: "#b91c1c", outline: "none", boxSizing: "border-box" }}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "500", color: "#374151", marginBottom: "0.5rem" }}>
                Payment Method <span style={{color: '#ef4444'}}>*</span>
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                required
                disabled={isSubmitting}
                style={{ width: "100%", padding: "0.75rem", border: "1px solid #d1d5db", borderRadius: "0.375rem", fontSize: "0.875rem", backgroundColor: "white", outline: "none", color: "#111827" }}
              >
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CASH">Cash</option>
                <option value="UPI">UPI</option>
                <option value="CHEQUE">Cheque</option>
                <option value="CARD">Card</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "500", color: "#374151", marginBottom: "0.5rem" }}>Reference Number</label>
              <input
                type="text"
                placeholder="e.g. UTR / Cheque No."
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                disabled={isSubmitting}
                style={{ width: "100%", padding: "0.75rem", border: "1px solid #d1d5db", borderRadius: "0.375rem", fontSize: "0.875rem", outline: "none", boxSizing: "border-box", color: "#111827" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "500", color: "#374151", marginBottom: "0.5rem" }}>Notes</label>
              <textarea
                placeholder="Additional details..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isSubmitting}
                rows={3}
                style={{ width: "100%", padding: "0.75rem", border: "1px solid #d1d5db", borderRadius: "0.375rem", fontSize: "0.875rem", outline: "none", boxSizing: "border-box", resize: "none", color: "#111827" }}
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", borderTop: "1px solid #e5e7eb", paddingTop: "1.25rem" }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{ padding: "0.5rem 1rem", border: "1px solid #d1d5db", borderRadius: "0.375rem", backgroundColor: "white", color: "#374151", fontSize: "0.875rem", fontWeight: "500", cursor: isSubmitting ? "not-allowed" : "pointer" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{ 
                display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1rem", border: "none", borderRadius: "0.375rem", 
                backgroundColor: isSubmitting ? "#86efac" : "#16a34a", color: "white", fontSize: "0.875rem", fontWeight: "500", 
                cursor: isSubmitting ? "not-allowed" : "pointer" 
              }}
            >
              {isSubmitting ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <CheckCircle size={16} />}
              {isSubmitting ? "Processing..." : "Process Refund"}
            </button>
          </div>
        </form>
        <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
