"use client";

import React, { useState, useEffect } from "react";
import { applyCreditNote, fetchInvoices } from "@/app/sales/actions";
import { X, Loader2, CheckCircle, AlertCircle } from "lucide-react";

interface CreditNote {
  id: string;
  creditNoteNumber: string;
  totalAmount: string;
  remainingBalance: string;
  status: string;
  customerId: string;
}

interface ApplyCreditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  creditNote: CreditNote | null;
  organizationId: string;
  locationId: string;
}

export default function ApplyCreditModal({ isOpen, onClose, onSuccess, creditNote, organizationId, locationId }: ApplyCreditModalProps) {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("");
  const [amountToApply, setAmountToApply] = useState<string>("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (isOpen && creditNote?.customerId && organizationId && locationId) {
      setIsLoadingInvoices(true);
      fetchInvoices(organizationId, locationId, creditNote.customerId).then((res) => {
        // The backend now accurately handles the filtering of unpaid invoices
        if (isMounted) {
          setInvoices(res);
          setIsLoadingInvoices(false);
        }
      }).catch(() => {
        if (isMounted) setIsLoadingInvoices(false);
      });
    }
    
    if (isOpen) {
      setAmountToApply("");
      setSelectedInvoiceId("");
      setError(null);
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, creditNote]);

  if (!isOpen || !creditNote) return null;

  const remainingBalance = parseFloat(creditNote.remainingBalance);
  const currentInputAmount = parseFloat(amountToApply || "0");
  const isOverBalance = currentInputAmount > remainingBalance;
  
  const isSubmitDisabled = 
    !selectedInvoiceId || 
    !amountToApply || 
    currentInputAmount <= 0 || 
    isOverBalance || 
    isSubmitting;

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      const res = await applyCreditNote({
        creditNoteId: creditNote.id,
        appliedToInvoiceId: selectedInvoiceId,
        amountToApply: amountToApply
      });

      if (res.success) {
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      setError(err.message || "Failed to apply credit note.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }}>
      <div style={{ backgroundColor: "white", padding: "1.5rem", borderRadius: "0.5rem", width: "100%", maxWidth: "500px", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "600", color: "#111827" }}>Apply Credit Note</h3>
            <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.875rem", color: "#6b7280" }}>{creditNote.creditNoteNumber}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer" }}>
            <X size={24} />
          </button>
        </div>

        {error && (
          <div style={{ marginBottom: "1rem", padding: "0.75rem", backgroundColor: "#fef2f2", color: "#991b1b", borderRadius: "0.375rem", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", fontWeight: "500" }}>
            <AlertCircle size={18} /> {error}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", marginBottom: "1.5rem" }}>
          <div style={{ padding: "1rem", backgroundColor: "#f9fafb", borderRadius: "0.375rem", border: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.875rem", color: "#4b5563", fontWeight: "500" }}>Available Balance:</span>
            <span style={{ fontSize: "1.125rem", color: "#059669", fontWeight: "700" }}>₹ {remainingBalance.toFixed(2)}</span>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "500", color: "#374151", marginBottom: "0.5rem" }}>Select Target Invoice</label>
            {isLoadingInvoices ? (
               <div style={{ padding: "0.75rem", fontSize: "0.875rem", color: "#6b7280", border: "1px solid #d1d5db", borderRadius: "0.375rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
                 <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Fetching unpaid invoices...
               </div>
            ) : (
              <select 
                value={selectedInvoiceId}
                onChange={(e) => setSelectedInvoiceId(e.target.value)}
                style={{ width: "100%", padding: "0.75rem", border: "1px solid #d1d5db", borderRadius: "0.375rem", fontSize: "0.875rem", backgroundColor: "white", outline: "none" }}
              >
                <option value="" disabled>-- Select an unpaid invoice --</option>
                {invoices.map(inv => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoiceNumber} (Due: ₹ {parseFloat(inv.balanceDue !== undefined ? inv.balanceDue : (inv.total || inv.grandTotal)).toFixed(2)})
                  </option>
                ))}
              </select>
            )}
            {!isLoadingInvoices && invoices.length === 0 && (
              <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.75rem", color: "#d97706" }}>No unpaid invoices found for this customer.</p>
            )}
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "500", color: "#374151", marginBottom: "0.5rem" }}>Amount to Apply</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#6b7280", fontWeight: "500" }}>₹</span>
              <input 
                type="number"
                min="1"
                max={remainingBalance}
                step="0.01"
                value={amountToApply}
                onChange={(e) => setAmountToApply(e.target.value)}
                placeholder="0.00"
                style={{ 
                  width: "100%", padding: "0.75rem 0.75rem 0.75rem 2rem", border: `1px solid ${isOverBalance ? "#dc2626" : "#d1d5db"}`, 
                  borderRadius: "0.375rem", fontSize: "0.875rem", outline: "none", boxSizing: "border-box" 
                }}
              />
            </div>
            {isOverBalance && (
              <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.75rem", color: "#dc2626", fontWeight: "500" }}>Amount exceeds the available remaining balance.</p>
            )}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", borderTop: "1px solid #e5e7eb", paddingTop: "1.25rem" }}>
          <button 
            onClick={onClose} 
            disabled={isSubmitting}
            style={{ padding: "0.5rem 1rem", border: "1px solid #d1d5db", borderRadius: "0.375rem", backgroundColor: "white", color: "#374151", fontSize: "0.875rem", fontWeight: "500", cursor: isSubmitting ? "not-allowed" : "pointer" }}>
            Cancel
          </button>
          <button 
            onClick={handleSubmit} 
            disabled={isSubmitDisabled}
            style={{ 
              display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1rem", border: "none", borderRadius: "0.375rem", 
              backgroundColor: isSubmitDisabled ? "#93c5fd" : "#2563eb", color: "white", fontSize: "0.875rem", fontWeight: "500", 
              cursor: isSubmitDisabled ? "not-allowed" : "pointer" 
            }}>
            {isSubmitting ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <CheckCircle size={16} />}
            {isSubmitting ? "Processing..." : "Apply Credit"}
          </button>
        </div>
        <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
