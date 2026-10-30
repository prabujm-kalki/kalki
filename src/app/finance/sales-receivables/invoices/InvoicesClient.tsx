"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useSessionView } from "@/components/AppShell";
import { FileText, Receipt, CheckCircle2 } from "lucide-react";
import ReceivePaymentModal, { InvoiceItem } from "@/components/sales/ReceivePaymentModal";

interface InvoicesClientProps {
  invoices: InvoiceItem[];
  organizationId: string;
  isOverdueOnly: boolean;
}

function formatDate(dateString: string | Date | null) {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

export default function InvoicesClient({
  invoices,
  organizationId,
  isOverdueOnly
}: InvoicesClientProps) {
  const router = useRouter();
  const { selected } = useSessionView();
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const activeOrgId = organizationId || selected?.organizationId || "";
  const activeLocationId = selected?.locationId || "";

  const handleOpenPayment = (inv: InvoiceItem) => {
    setSelectedInvoice(inv);
    setIsModalOpen(true);
  };

  const handlePaymentSuccess = () => {
    setIsModalOpen(false);
    setSelectedInvoice(null);
    router.refresh();
  };

  return (
    <div className="kalki-main-content">
      <div
        className="kalki-page-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem"
        }}
      >
        <div>
          <h1
            className="kalki-page-title"
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            <FileText size={24} color="#3b82f6" />
            {isOverdueOnly ? "Overdue Invoices" : "Outstanding Invoices"}
          </h1>
          <p className="kalki-page-description">
            {isOverdueOnly
              ? "Viewing unpaid invoices past their payment due date."
              : "Manage and track all unpaid sales invoices waiting for collection."}
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <a
            href={`/finance/sales-receivables/invoices?organizationId=${activeOrgId}${activeLocationId ? `&locationId=${activeLocationId}` : ""}`}
            style={{
              padding: "6px 14px",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: 500,
              textDecoration: "none",
              backgroundColor: !isOverdueOnly ? "#3b82f6" : "#f1f5f9",
              color: !isOverdueOnly ? "#ffffff" : "#475569",
              border: "1px solid " + (!isOverdueOnly ? "#2563eb" : "#cbd5e1")
            }}
          >
            All Open Invoices
          </a>
          <a
            href={`/finance/sales-receivables/invoices?organizationId=${activeOrgId}${activeLocationId ? `&locationId=${activeLocationId}` : ""}&filter=overdue`}
            style={{
              padding: "6px 14px",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: 500,
              textDecoration: "none",
              backgroundColor: isOverdueOnly ? "#dc2626" : "#f1f5f9",
              color: isOverdueOnly ? "#ffffff" : "#475569",
              border: "1px solid " + (isOverdueOnly ? "#b91c1c" : "#cbd5e1")
            }}
          >
            Overdue Only
          </a>
        </div>
      </div>

      <div className="kalki-section" style={{ padding: 0, overflow: "hidden", marginTop: "24px" }}>
        {invoices.length === 0 ? (
          <div style={{ textAlign: "center", padding: "64px", color: "#64748b" }}>
            <Receipt size={48} style={{ opacity: 0.3, marginBottom: "16px" }} />
            <p>No outstanding invoices found.</p>
            <p style={{ fontSize: "13px", marginTop: "8px" }}>
              All sales invoices have been paid or none exist yet.
            </p>
          </div>
        ) : (
          <table className="kalki-table">
            <thead>
              <tr>
                <th>Invoice No.</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Due Date</th>
                <th style={{ textAlign: "right" }}>Total Amount</th>
                <th style={{ textAlign: "right" }}>Balance Due</th>
                <th style={{ textAlign: "center" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const isOverdue = inv.dueDate ? new Date(inv.dueDate as any) < new Date() : false;

                return (
                  <tr key={inv.id}>
                    <td style={{ fontWeight: 600 }}>{inv.invoiceNumber}</td>
                    <td>{inv.customerName || "Unknown Customer"}</td>
                    <td>{formatDate(inv.invoiceDate)}</td>
                    <td
                      style={{
                        color: isOverdue ? "#dc2626" : "inherit",
                        fontWeight: isOverdue ? 600 : 400
                      }}
                    >
                      {formatDate(inv.dueDate)} {isOverdue && "(Overdue)"}
                    </td>
                    <td style={{ textAlign: "right", color: "#64748b" }}>
                      ₹{Number(inv.totalAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 600, color: "#0f172a" }}>
                      ₹{inv.balanceDue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        type="button"
                        onClick={() => handleOpenPayment(inv)}
                        className="kalki-button kalki-button--primary"
                        style={{
                          padding: "5px 14px",
                          fontSize: "12px",
                          cursor: "pointer",
                          fontWeight: 600,
                          borderRadius: "6px"
                        }}
                      >
                        Receive Payment
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Instant In-Place Modal */}
      <ReceivePaymentModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedInvoice(null);
        }}
        invoice={selectedInvoice}
        organizationId={activeOrgId}
        locationId={activeLocationId || selectedInvoice?.locationId || ""}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
}

