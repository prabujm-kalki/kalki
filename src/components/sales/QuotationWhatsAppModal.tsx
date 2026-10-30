"use client";

import React from "react";
import { MessageCircle, Check, X } from "lucide-react";
import { formatIndianCurrency, openWhatsAppUrl } from "@/lib/whatsapp-quotation";

export interface QuotationWhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmSent?: () => Promise<void> | void;
  quotationNumber: string;
  docType?: "QUOTATION" | "PROFORMA" | string;
  totalAmount?: number | string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  whatsappUrl: string;
  messagePreview?: string;
  isAlreadySent?: boolean;
}

export function QuotationWhatsAppModal({
  isOpen,
  onClose,
  onConfirmSent,
  quotationNumber,
  docType = "QUOTATION",
  totalAmount,
  customerName,
  customerPhone,
  whatsappUrl,
  messagePreview,
  isAlreadySent = false,
}: QuotationWhatsAppModalProps) {
  if (!isOpen) return null;

  const docLabel = docType === "PROFORMA" ? "Proforma Invoice" : "Quotation";

  const handleSend = async () => {
    if (onConfirmSent) {
      try {
        await onConfirmSent();
      } catch (e) {
        console.error("Failed to mark quotation as sent:", e);
      }
    }
    openWhatsAppUrl(whatsappUrl);
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "14px",
          width: "100%",
          maxWidth: "480px",
          overflow: "hidden",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
          border: "1px solid #e2e8f0",
          animation: "fadeIn 0.15s ease-out",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "#ffffff",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                backgroundColor: "#dcfce7",
                color: "#16a34a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <MessageCircle size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#0f172a" }}>
                Send {docLabel} on WhatsApp
              </h3>
              <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#64748b" }}>
                {isAlreadySent ? "Re-share document with customer" : "Direct WhatsApp dispatch to customer"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "#94a3b8",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "6px",
            }}
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: "20px" }}>
          <p style={{ margin: "0 0 14px 0", fontSize: "13.5px", color: "#334155", lineHeight: 1.5 }}>
            {docLabel} <strong style={{ color: "#0f172a" }}>#{quotationNumber}</strong> has been generated successfully. Would you like to send it to the customer on WhatsApp now?
          </p>

          <div
            style={{
              backgroundColor: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              padding: "14px 16px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              fontSize: "13px",
              marginBottom: "16px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#64748b" }}>Customer:</span>
              <strong style={{ color: "#0f172a" }}>{customerName || "Customer"}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#64748b" }}>WhatsApp Number:</span>
              <span style={{ color: customerPhone ? "#0f172a" : "#dc2626", fontWeight: "600", fontFamily: "monospace" }}>
                {customerPhone || "Not Provided"}
              </span>
            </div>
            {totalAmount !== undefined && totalAmount !== null ? (
              <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px dashed #e2e8f0", paddingTop: "8px" }}>
                <span style={{ color: "#64748b" }}>Grand Total:</span>
                <strong style={{ color: "#16a34a", fontSize: "14px" }}>
                  {formatIndianCurrency(totalAmount)}
                </strong>
              </div>
            ) : null}
          </div>

          {messagePreview && (
            <div style={{ marginTop: "10px" }}>
              <span style={{ fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                Message Preview
              </span>
              <div
                style={{
                  marginTop: "4px",
                  padding: "10px 12px",
                  borderRadius: "6px",
                  backgroundColor: "#f1f5f9",
                  fontSize: "12px",
                  color: "#334155",
                  maxHeight: "110px",
                  overflowY: "auto",
                  whiteSpace: "pre-line",
                  border: "1px solid #e2e8f0",
                  fontFamily: "inherit"
                }}
              >
                {messagePreview}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: "14px 20px",
            backgroundColor: "#f8fafc",
            borderTop: "1px solid #f1f5f9",
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "9px 16px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              backgroundColor: "#ffffff",
              color: "#475569",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            Skip for Now
          </button>
          <button
            type="button"
            onClick={handleSend}
            style={{
              padding: "9px 18px",
              borderRadius: "6px",
              border: "none",
              backgroundColor: "#16a34a",
              color: "#ffffff",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
            }}
          >
            <Check size={16} />
            Send via WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}

