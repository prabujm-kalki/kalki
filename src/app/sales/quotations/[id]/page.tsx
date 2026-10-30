"use client";

import { useEffect, useState, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Printer,
  MessageCircle,
  ArrowRightCircle,
  Edit,
  CheckCircle,
  Loader2,
  Calendar,
  FileText,
  Clock,
} from "lucide-react";
import {
  fetchQuotationById,
  convertQuotationToInvoice,
  markQuotationAsSent,
} from "../actions";
import {
  buildQuotationWhatsappMessage,
  formatIndianCurrency,
} from "@/lib/whatsapp-quotation";
import { QuotationWhatsAppModal } from "@/components/sales/QuotationWhatsAppModal";
import { InvoiceRenderer } from "@/components/sales/InvoiceRenderer";
import { DEFAULT_INVOICE_CONFIG, InvoiceSettingsConfig, InvoiceTemplateKey } from "@/app/sales/settings/invoice/constants";

export default function QuotationDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const quotationId = resolvedParams.id;
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgId = searchParams.get("organizationId");
  const locId = searchParams.get("locationId");
  const query = orgId && locId ? `?organizationId=${orgId}&locationId=${locId}` : "";

  const [loading, setLoading] = useState(true);
  const [quotation, setQuotation] = useState<any>(null);
  const [converting, setConverting] = useState(false);
  const [templateOverride, setTemplateOverride] = useState<InvoiceTemplateKey | undefined>(undefined);

  // WhatsApp modal state
  const [whatsAppModal, setWhatsAppModal] = useState<{
    quotationNumber: string;
    docType: string;
    totalAmount: number | string;
    customerName: string;
    customerPhone: string;
    whatsappUrl: string;
    isAlreadySent: boolean;
    messagePreview: string;
  } | null>(null);

  const loadData = async () => {
    setLoading(true);
    const res = await fetchQuotationById(quotationId);
    if (res.success && res.data) {
      setQuotation(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [quotationId]);

  const handleOpenWhatsApp = () => {
    if (!quotation) return;
    if (quotation.whatsappDispatchMode === "NO_WHATSAPP") {
      alert("WhatsApp dispatch is currently disabled in Organization Settings.");
      return;
    }
    const { whatsappUrl, text } = buildQuotationWhatsappMessage({
      quotationNumber: quotation.quotationNumber,
      docType: quotation.docType,
      totalAmount: quotation.grandTotal,
      publicToken: quotation.publicToken,
      customerName: quotation.customerName,
      customerPhone: quotation.customerPhone,
      validUntil: quotation.validUntil,
      lines: quotation.lines,
    });

    setWhatsAppModal({
      quotationNumber: quotation.quotationNumber,
      docType: quotation.docType,
      totalAmount: quotation.grandTotal,
      customerName: quotation.customerName,
      customerPhone: quotation.customerPhone || "",
      whatsappUrl,
      isAlreadySent: Boolean(quotation.isSentToCustomer),
      messagePreview: text,
    });
  };

  const handleConvert = async () => {
    if (!confirm("Are you sure you want to convert this quotation into a Sales Invoice?")) {
      return;
    }
    setConverting(true);
    const res = await convertQuotationToInvoice(quotationId);
    setConverting(false);
    if (res.success && res.data) {
      alert(`Successfully converted! Invoice #${res.data.invoiceNumber} created.`);
      loadData();
      router.push(`/sales/invoices/all${query}`);
    } else {
      alert(res.error || "Failed to convert quotation");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div style={{ padding: "60px", textAlign: "center", color: "#64748b" }}>
        <Loader2 size={24} style={{ animation: "spin 1s linear infinite", display: "inline-block" }} />
        <p style={{ marginTop: "8px", fontSize: "14px" }}>Loading quotation details...</p>
      </div>
    );
  }

  if (!quotation) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <h2 style={{ fontSize: "18px", color: "#0f172a" }}>Quotation Not Found</h2>
        <Link href={`/sales/quotations${query}`} style={{ color: "#2563eb", marginTop: "10px", display: "inline-block" }}>
          Back to Quotations
        </Link>
      </div>
    );
  }

  const isSent = Boolean(quotation.isSentToCustomer);
  const isConverted = quotation.status === "CONVERTED";
  const isProforma = quotation.docType === "PROFORMA";
  const isDummy = quotation.docType === "DUMMY";
  const docTitle = isDummy ? "" : isProforma ? "PROFORMA INVOICE" : "SALES QUOTATION";

  return (
    <div style={{ maxWidth: "950px", margin: "0 auto", paddingBottom: "60px" }}>
      {/* Top Controls Action Bar */}
      <div
        className="no-print"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          backgroundColor: "#ffffff",
          padding: "12px 18px",
          borderRadius: "10px",
          border: "1px solid #e2e8f0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Link
            href={`/sales/quotations${query}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "32px",
              height: "32px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              backgroundColor: "#ffffff",
              color: "#475569",
              textDecoration: "none",
            }}
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 style={{ fontSize: "17px", fontWeight: "700", color: "#0f172a", margin: 0 }}>
              {quotation.quotationNumber}
            </h1>
            <span
              style={{
                fontSize: "11px",
                fontWeight: "600",
                color: isConverted ? "#16a34a" : isSent ? "#3730a3" : "#854d0e",
              }}
            >
              ● {quotation.status}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* WhatsApp Button (Hidden if WhatsApp is disabled in Organization Settings) */}
          {quotation.whatsappDispatchMode !== "NO_WHATSAPP" && (
            <button
              type="button"
              onClick={handleOpenWhatsApp}
              title={isSent ? "Already sent to customer (Click to re-send)" : "Send document on WhatsApp"}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "8px 14px",
                borderRadius: "6px",
                border: "none",
                backgroundColor: isSent ? "#94a3b8" : "#25D366",
                color: "#ffffff",
                fontSize: "12.5px",
                fontWeight: 600,
                cursor: "pointer",
                opacity: isSent ? 0.85 : 1,
                boxShadow: isSent ? "none" : "0 1px 2px rgba(37, 211, 102, 0.25)",
              }}
            >
              <MessageCircle size={15} />
              <span>{isSent ? "Re-send WhatsApp" : "Send WhatsApp"}</span>
            </button>
          )}

          {/* Convert to Invoice Button */}
          {!isConverted && (
            <button
              type="button"
              onClick={handleConvert}
              disabled={converting}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "8px 14px",
                borderRadius: "6px",
                border: "none",
                backgroundColor: "#0f172a",
                color: "#ffffff",
                fontSize: "12.5px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {converting ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <ArrowRightCircle size={14} />}
              Convert to Invoice
            </button>
          )}

          {/* Print Template Selector */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "500" }}>Template:</span>
            <select
              value={templateOverride || quotation.invoiceSettings?.defaultTemplate || "CLASSIC_CORPORATE"}
              onChange={(e) => setTemplateOverride(e.target.value as InvoiceTemplateKey)}
              style={{
                padding: "6px 10px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                fontSize: "12px",
                fontWeight: "600",
                color: "#0f172a",
                backgroundColor: "#ffffff",
                cursor: "pointer",
              }}
            >
              <option value="CLASSIC_CORPORATE">Classic Corporate</option>
              <option value="MODERN_MINIMAL">Modern Minimal</option>
              <option value="THERMAL_COMPACT">Thermal (80mm POS)</option>
            </select>
          </div>

          {/* Print Button */}
          <button
            type="button"
            onClick={handlePrint}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              backgroundColor: "#0f172a",
              color: "#ffffff",
              fontSize: "12.5px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Printer size={15} />
            Print Document
          </button>

          {/* Edit Button if not converted */}
          {!isConverted && (
            <Link
              href={`/sales/quotations/${quotation.id}/edit${query}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                backgroundColor: "#ffffff",
                color: "#334155",
                fontSize: "12.5px",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              <Edit size={14} />
              Edit Rates
            </Link>
          )}
        </div>
      </div>

      {/* Printable Quotation / Proforma / Dummy Bill Sheet using Kalki Invoice Renderer */}
      <div id="quotation-print-sheet" style={{ maxWidth: "850px", margin: "0 auto" }}>
        <InvoiceRenderer
          documentTitle={docTitle}
          invoice={{
            invoiceNumber: quotation.quotationNumber,
            invoiceDate: quotation.issueDate,
            dueDate: quotation.validUntil,
            customerName: quotation.customerName,
            customerPhone: quotation.customerPhone,
            customerGstin: quotation.customerGstin,
            billingAddress: quotation.billingAddress,
            subtotalAmount: quotation.subtotalAmount,
            discountAmount: quotation.discountAmount,
            taxableAmount: quotation.taxableAmount,
            cgstAmount: quotation.cgstAmount,
            sgstAmount: quotation.sgstAmount,
            igstAmount: quotation.igstAmount,
            roundOffAmount: quotation.roundOffAmount,
            grandTotal: quotation.grandTotal,
            paymentStatus: quotation.status,
            paymentMode: quotation.paymentTerms,
            notes: quotation.notes,
            items: quotation.lines?.map((line: any) => ({
              id: line.id,
              itemDescription: line.itemName,
              hsnCode: line.hsnCode,
              uom: line.uom,
              quantity: line.quantity,
              unitRate: line.unitRate,
              discountPercent: line.discountPercent,
              discountAmount: line.discountAmount,
              gstRate: line.gstRate,
              taxableAmount: line.taxableAmount,
              cgstAmount: line.cgstAmount,
              sgstAmount: line.sgstAmount,
              lineTotal: line.lineTotal,
            })),
          }}
          organization={{
            name: quotation.organization?.name || "KALKI ENTERPRISES",
            address: quotation.location?.name ? `Branch: ${quotation.location.name} (${quotation.location.code || ""})` : undefined,
            logoUrl: quotation.organization?.logoUrl,
          }}
          config={quotation.invoiceSettings || DEFAULT_INVOICE_CONFIG}
          templateOverride={templateOverride}
          containerId="quotation-print-area"
        />
      </div>

      {/* WhatsApp Modal */}
      {whatsAppModal && (
        <QuotationWhatsAppModal
          isOpen={Boolean(whatsAppModal)}
          onClose={() => setWhatsAppModal(null)}
          onConfirmSent={async () => {
            await markQuotationAsSent(quotation.id);
            loadData();
          }}
          quotationNumber={whatsAppModal.quotationNumber}
          docType={whatsAppModal.docType}
          totalAmount={whatsAppModal.totalAmount}
          customerName={whatsAppModal.customerName}
          customerPhone={whatsAppModal.customerPhone}
          whatsappUrl={whatsAppModal.whatsappUrl}
          messagePreview={whatsAppModal.messagePreview}
          isAlreadySent={whatsAppModal.isAlreadySent}
        />
      )}

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          #quotation-print-sheet {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}

