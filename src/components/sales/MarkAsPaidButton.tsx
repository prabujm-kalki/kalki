"use client";

import React from "react";
import { useRouter } from "next/navigation";

export default function MarkAsPaidButton({ invoiceId, customerId }: { invoiceId: string; customerId: string | null }) {
  const router = useRouter();

  const handleMarkAsPaid = () => {
    // Redirect to Finance Receivables module with invoiceId and customerId pre-filled
    const url = new URL(window.location.origin + "/finance/sales-receivables/receipts");
    if (customerId) {
      url.searchParams.set("customerId", customerId);
    }
    url.searchParams.set("invoiceId", invoiceId);
    url.searchParams.set("action", "pay");
    
    router.push(url.pathname + url.search);
  };

  return (
    <button
      onClick={handleMarkAsPaid}
      style={{
        fontSize: "14px",
        color: "#d97706",
        border: "1px solid #d97706",
        borderRadius: "6px",
        padding: "6px 12px",
        background: "transparent",
        cursor: "pointer",
        fontWeight: 500,
        transition: "all 0.2s"
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.backgroundColor = "#fffbeb";
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.backgroundColor = "transparent";
      }}
    >
      Process Payment
    </button>
  );
}
