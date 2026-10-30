"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { processReceipt } from "@/app/finance/receivables-actions";
import { X, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

export interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  invoiceDate: string | Date | null;
  dueDate: string | Date | null;
  totalAmount: number | string;
  paidAmount: number | string;
  creditApplied: number | string;
  balanceDue: number;
  customerId: string;
  customerName: string;
  locationId?: string;
}

interface ReceivePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: InvoiceItem | null;
  organizationId: string;
  locationId: string;
  onSuccess?: () => void;
}

export default function ReceivePaymentModal({
  isOpen,
  onClose,
  invoice,
  organizationId,
  locationId,
  onSuccess
}: ReceivePaymentModalProps) {
  const router = useRouter();

  const [receivedAmount, setReceivedAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("BANK_TRANSFER");
  const [referenceNumber, setReferenceNumber] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && invoice) {
      // Default to the full balance due
      const bal = invoice.balanceDue > 0 ? invoice.balanceDue : 0;
      setReceivedAmount(bal > 0 ? bal.toFixed(2) : "");
      setPaymentMethod("BANK_TRANSFER");
      setReferenceNumber("");
      setNotes("");
      setError(null);
    }
  }, [isOpen, invoice]);

  if (!isOpen || !invoice) return null;

  const totalAmountNum = Number(invoice.totalAmount || 0);
  const alreadyPaidNum = Number(invoice.paidAmount || 0) + Number(invoice.creditApplied || 0);
  const currentBalanceDue = invoice.balanceDue;

  const enteredAmountNum = parseFloat(receivedAmount) || 0;
  const remainingBalanceAfterPayment = Math.max(0, currentBalanceDue - enteredAmountNum);
  const isOverAllocated = enteredAmountNum > currentBalanceDue;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (enteredAmountNum <= 0) {
      setError("Please enter a valid amount greater than ₹0.");
      return;
    }

    if (isOverAllocated) {
      setError(`Cannot receive more than the outstanding balance due of ₹${currentBalanceDue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}.`);
      return;
    }

    const effectiveLocationId = locationId || invoice.locationId;
    if (!effectiveLocationId) {
      setError("Location context is missing. Please ensure a location is active.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await processReceipt({
        organizationId,
        locationId: effectiveLocationId,
        customerId: invoice.customerId,
        amount: enteredAmountNum,
        paymentMethod,
        referenceNumber: referenceNumber.trim() || undefined,
        notes: notes.trim() || undefined,
        allocations: [
          {
            invoiceId: invoice.id,
            amountApplied: enteredAmountNum
          }
        ]
      });

      if (!res.success) {
        throw new Error(res.error || "Failed to process receipt");
      }

      onClose();
      if (onSuccess) {
        onSuccess();
      } else {
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred while processing payment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px"
      }}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          width: "100%",
          maxWidth: "520px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          overflow: "hidden",
          border: "1px solid #e2e8f0",
          animation: "fadeIn 0.15s ease-out"
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: "#f8fafc"
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>
              Receive Payment
            </h3>
            <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#64748b" }}>
              Log incoming collection against invoice #{invoice.invoiceNumber}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              padding: "4px",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center"
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} style={{ padding: "24px" }}>
          {error && (
            <div
              style={{
                marginBottom: "16px",
                padding: "12px",
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "8px",
                display: "flex",
                gap: "10px",
                alignItems: "center",
                color: "#991b1b",
                fontSize: "13px"
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <div>{error}</div>
            </div>
          )}

          {/* Invoice Financial Summary Card */}
          <div
            style={{
              backgroundColor: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              padding: "14px 18px",
              marginBottom: "20px"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontSize: "12px", color: "#64748b" }}>Customer:</span>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#0f172a" }}>
                {invoice.customerName}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontSize: "12px", color: "#64748b" }}>Invoice Total:</span>
              <span style={{ fontSize: "13px", fontWeight: 500, color: "#334155" }}>
                ₹{totalAmountNum.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontSize: "12px", color: "#64748b" }}>Previously Received / Credited:</span>
              <span style={{ fontSize: "13px", fontWeight: 500, color: "#16a34a" }}>
                ₹{alreadyPaidNum.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                paddingTop: "8px",
                borderTop: "1px dashed #cbd5e1",
                marginTop: "4px"
              }}
            >
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>
                Current Balance Due:
              </span>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "#dc2626" }}>
                ₹{currentBalanceDue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Form Fields */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Amount Received Input */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#334155",
                  marginBottom: "6px"
                }}
              >
                Receiving Amount (₹) <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={currentBalanceDue}
                required
                value={receivedAmount}
                onChange={(e) => setReceivedAmount(e.target.value)}
                placeholder="0.00"
                className="kalki-input"
                style={{
                  width: "100%",
                  fontSize: "15px",
                  fontWeight: 600,
                  padding: "10px 14px",
                  borderColor: isOverAllocated ? "#ef4444" : undefined
                }}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: "6px",
                  fontSize: "12px"
                }}
              >
                <button
                  type="button"
                  onClick={() => setReceivedAmount(currentBalanceDue.toFixed(2))}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#2563eb",
                    cursor: "pointer",
                    padding: 0,
                    fontWeight: 500
                  }}
                >
                  Pay Full Balance (₹{currentBalanceDue.toFixed(2)})
                </button>
                <span
                  style={{
                    fontWeight: 600,
                    color: remainingBalanceAfterPayment === 0 ? "#16a34a" : "#64748b"
                  }}
                >
                  {remainingBalanceAfterPayment === 0 ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <CheckCircle size={13} color="#16a34a" /> Settles in Full
                    </span>
                  ) : (
                    `Balance Remaining: ₹${remainingBalanceAfterPayment.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                  )}
                </span>
              </div>
            </div>

            {/* Payment Method & Reference */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    color: "#334155",
                    marginBottom: "6px"
                  }}
                >
                  Payment Method <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="kalki-select"
                  style={{ width: "100%", padding: "9px 12px", fontSize: "13px" }}
                >
                  <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                  <option value="UPI">UPI / GPay / PhonePe</option>
                  <option value="CASH">Cash</option>
                  <option value="CARD">Credit / Debit Card</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    color: "#334155",
                    marginBottom: "6px"
                  }}
                >
                  Reference / Txn #
                </label>
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="e.g. UTR or Cheque #"
                  className="kalki-input"
                  style={{ width: "100%", padding: "9px 12px", fontSize: "13px" }}
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  color: "#334155",
                  marginBottom: "6px"
                }}
              >
                Notes (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Remarks, collected by, etc."
                className="kalki-input"
                style={{ width: "100%", padding: "9px 12px", fontSize: "13px" }}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px",
              marginTop: "24px",
              paddingTop: "16px",
              borderTop: "1px solid #e2e8f0"
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="kalki-button kalki-button--secondary"
              style={{ padding: "8px 16px", fontSize: "13px" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || enteredAmountNum <= 0 || isOverAllocated}
              className="kalki-button kalki-button--primary"
              style={{
                padding: "8px 20px",
                fontSize: "13px",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> Processing...
                </>
              ) : (
                `Receive ₹${(enteredAmountNum || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

