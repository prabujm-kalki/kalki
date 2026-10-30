"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  Plus,
  Search,
  Filter,
  CheckCircle,
  Clock,
  ArrowRightCircle,
  XCircle,
  MessageCircle,
  Eye,
  Edit,
  Loader2,
  RefreshCw,
} from "lucide-react";
import {
  fetchQuotations,
  convertQuotationToInvoice,
  markQuotationAsSent,
} from "./actions";
import {
  buildQuotationWhatsappMessage,
  formatIndianCurrency,
} from "@/lib/whatsapp-quotation";
import { QuotationWhatsAppModal } from "@/components/sales/QuotationWhatsAppModal";

export default function QuotationsListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgId = searchParams.get("organizationId");
  const locId = searchParams.get("locationId");
  const query = orgId && locId ? `?organizationId=${orgId}&locationId=${locId}` : "";

  const [loading, setLoading] = useState(true);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [filterDocType, setFilterDocType] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [convertingId, setConvertingId] = useState<string | null>(null);

  // WhatsApp Modal State
  const [whatsAppModal, setWhatsAppModal] = useState<{
    quotationNumber: string;
    docType: string;
    totalAmount: number | string;
    customerName: string;
    customerPhone: string;
    whatsappUrl: string;
    quotationId: string;
    isAlreadySent: boolean;
    messagePreview: string;
  } | null>(null);

  const loadData = async () => {
    if (!orgId || !locId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const res = await fetchQuotations(orgId, locId, {
      docType: filterDocType,
      status: filterStatus,
      search: searchQuery,
    });
    if (res.success && res.data) {
      setQuotations(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [orgId, locId, filterDocType, filterStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  // Trigger WhatsApp popup
  const handleOpenWhatsApp = (quote: any) => {
    if (quote.whatsappDispatchMode === "NO_WHATSAPP") {
      alert("WhatsApp dispatch is currently disabled in Organization Settings.");
      return;
    }

    const { whatsappUrl, text } = buildQuotationWhatsappMessage({
      quotationNumber: quote.quotationNumber,
      docType: quote.docType,
      totalAmount: quote.grandTotal,
      publicToken: quote.publicToken,
      customerName: quote.customerName,
      customerPhone: quote.customerPhone,
      validUntil: quote.validUntil,
    });

    setWhatsAppModal({
      quotationNumber: quote.quotationNumber,
      docType: quote.docType,
      totalAmount: quote.grandTotal,
      customerName: quote.customerName,
      customerPhone: quote.customerPhone || "",
      whatsappUrl,
      quotationId: quote.id,
      isAlreadySent: Boolean(quote.isSentToCustomer),
      messagePreview: text,
    });
  };

  // Convert Quotation to Invoice
  const handleConvert = async (quotationId: string) => {
    if (!confirm("Are you sure you want to convert this quotation into a Sales Invoice?")) {
      return;
    }
    setConvertingId(quotationId);
    const res = await convertQuotationToInvoice(quotationId);
    setConvertingId(null);
    if (res.success && res.data) {
      alert(`Successfully converted! Invoice #${res.data.invoiceNumber} created.`);
      loadData();
      router.push(`/sales/invoices/all${query}`);
    } else {
      alert(res.error || "Failed to convert quotation");
    }
  };

  // Metrics
  const totalCount = quotations.length;
  const draftCount = quotations.filter((q) => q.status === "DRAFT").length;
  const sentCount = quotations.filter((q) => q.status === "SENT").length;
  const convertedCount = quotations.filter((q) => q.status === "CONVERTED").length;
  const totalValue = quotations.reduce((sum, q) => sum + Number(q.grandTotal || 0), 0);

  return (
    <div>
      {/* Top Header & KPIs */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: "700", color: "#0f172a", margin: "0 0 4px 0" }}>
            Quotations & Proforma Invoices
          </h1>
          <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
            Manage commercial estimates, send via WhatsApp, and convert into invoices
          </p>
        </div>

        <Link
          href={`/sales/quotations/new${query}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            backgroundColor: "#2563eb",
            color: "#ffffff",
            padding: "9px 16px",
            borderRadius: "6px",
            fontSize: "13px",
            fontWeight: "600",
            textDecoration: "none",
            boxShadow: "0 1px 2px rgba(37, 99, 235, 0.2)",
          }}
        >
          <Plus size={16} />
          Create Quotation
        </Link>
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "14px",
          marginBottom: "22px",
        }}
      >
        <div style={{ backgroundColor: "#ffffff", padding: "16px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
          <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>Total Quotes</span>
          <div style={{ fontSize: "22px", fontWeight: "700", color: "#0f172a", marginTop: "4px" }}>{totalCount}</div>
          <span style={{ fontSize: "12px", color: "#64748b" }}>Value: {formatIndianCurrency(totalValue)}</span>
        </div>
        <div style={{ backgroundColor: "#ffffff", padding: "16px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
          <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>Draft / Open</span>
          <div style={{ fontSize: "22px", fontWeight: "700", color: "#eab308", marginTop: "4px" }}>{draftCount}</div>
          <span style={{ fontSize: "12px", color: "#64748b" }}>Awaiting dispatch</span>
        </div>
        <div style={{ backgroundColor: "#ffffff", padding: "16px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
          <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>Sent to Customer</span>
          <div style={{ fontSize: "22px", fontWeight: "700", color: "#3b82f6", marginTop: "4px" }}>{sentCount}</div>
          <span style={{ fontSize: "12px", color: "#64748b" }}>Dispatched via WhatsApp</span>
        </div>
        <div style={{ backgroundColor: "#ffffff", padding: "16px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
          <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>Converted to Invoices</span>
          <div style={{ fontSize: "22px", fontWeight: "700", color: "#16a34a", marginTop: "4px" }}>{convertedCount}</div>
          <span style={{ fontSize: "12px", color: "#64748b" }}>Closed won</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "#ffffff",
          padding: "14px 18px",
          borderRadius: "10px",
          border: "1px solid #e2e8f0",
          marginBottom: "16px",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <form onSubmit={handleSearchSubmit} style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: "260px" }}>
          <div style={{ position: "relative", width: "100%", maxWidth: "340px" }}>
            <Search size={15} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
            <input
              type="text"
              placeholder="Search quotation #, customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px 8px 32px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
              }}
            />
          </div>
          <button
            type="submit"
            style={{
              padding: "8px 14px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              backgroundColor: "#f8fafc",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Search
          </button>
        </form>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <select
            value={filterDocType}
            onChange={(e) => setFilterDocType(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              fontSize: "13px",
              backgroundColor: "#ffffff",
            }}
          >
            <option value="ALL">All Types</option>
            <option value="QUOTATION">Quotations</option>
            <option value="PROFORMA">Proforma Invoices</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              fontSize: "13px",
              backgroundColor: "#ffffff",
            }}
          >
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="SENT">Sent</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="CONVERTED">Converted</option>
            <option value="DECLINED">Declined</option>
          </select>

          <button
            type="button"
            onClick={loadData}
            title="Refresh"
            style={{
              padding: "8px 10px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              backgroundColor: "#ffffff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
            }}
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Quotations Table */}
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "10px",
          border: "1px solid #e2e8f0",
          overflow: "hidden",
        }}
      >
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
            <Loader2 size={24} style={{ animation: "spin 1s linear infinite", display: "inline-block" }} />
            <p style={{ marginTop: "8px", fontSize: "14px" }}>Loading quotations...</p>
          </div>
        ) : quotations.length === 0 ? (
          <div style={{ padding: "50px 20px", textAlign: "center" }}>
            <FileText size={36} style={{ color: "#94a3b8", margin: "0 auto 12px auto" }} />
            <h3 style={{ margin: "0 0 6px 0", fontSize: "16px", color: "#0f172a" }}>No Quotations Found</h3>
            <p style={{ margin: "0 0 16px 0", fontSize: "13px", color: "#64748b" }}>
              Start by creating your first sales quotation or proforma invoice.
            </p>
            <Link
              href={`/sales/quotations/new${query}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                backgroundColor: "#2563eb",
                color: "#ffffff",
                padding: "8px 16px",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: "600",
                textDecoration: "none",
              }}
            >
              <Plus size={15} /> Create Quotation
            </Link>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  <th style={{ textAlign: "left", padding: "12px 16px", fontSize: "12px", fontWeight: "700", color: "#475569" }}>Document #</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", fontSize: "12px", fontWeight: "700", color: "#475569" }}>Type</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", fontSize: "12px", fontWeight: "700", color: "#475569" }}>Customer</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", fontSize: "12px", fontWeight: "700", color: "#475569" }}>Date</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", fontSize: "12px", fontWeight: "700", color: "#475569" }}>Status</th>
                  <th style={{ textAlign: "right", padding: "12px 16px", fontSize: "12px", fontWeight: "700", color: "#475569" }}>Amount (₹)</th>
                  <th style={{ textAlign: "center", padding: "12px 16px", fontSize: "12px", fontWeight: "700", color: "#475569" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {quotations.map((quote) => {
                  const isSent = Boolean(quote.isSentToCustomer);
                  const isConverted = quote.status === "CONVERTED";

                  return (
                    <tr
                      key={quote.id}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        fontSize: "13px",
                        transition: "background-color 0.1s ease",
                      }}
                    >
                      <td style={{ padding: "12px 16px", fontWeight: "700", color: "#0f172a" }}>
                        <Link
                          href={`/sales/quotations/${quote.id}${query}`}
                          style={{ color: "#2563eb", textDecoration: "none" }}
                        >
                          {quote.quotationNumber}
                        </Link>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: "4px",
                            fontSize: "11px",
                            fontWeight: "600",
                            backgroundColor: quote.docType === "PROFORMA" ? "#fef3c7" : "#e0e7ff",
                            color: quote.docType === "PROFORMA" ? "#b45309" : "#4338ca",
                          }}
                        >
                          {quote.docType === "PROFORMA" ? "Proforma" : "Quotation"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ fontWeight: "600", color: "#0f172a" }}>{quote.customerName}</div>
                        {quote.customerPhone && (
                          <div style={{ fontSize: "11px", color: "#64748b", fontFamily: "monospace" }}>
                            {quote.customerPhone}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "12px 16px", color: "#64748b" }}>
                        {new Date(quote.issueDate).toLocaleDateString("en-IN")}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: "12px",
                            fontSize: "11px",
                            fontWeight: "600",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            backgroundColor:
                              quote.status === "CONVERTED"
                                ? "#dcfce7"
                                : quote.status === "SENT"
                                ? "#e0e7ff"
                                : quote.status === "DRAFT"
                                ? "#fef9c3"
                                : "#f1f5f9",
                            color:
                              quote.status === "CONVERTED"
                                ? "#16a34a"
                                : quote.status === "SENT"
                                ? "#3730a3"
                                : quote.status === "DRAFT"
                                ? "#854d0e"
                                : "#475569",
                          }}
                        >
                          {quote.status}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: "700", color: "#0f172a" }}>
                        ₹{Number(quote.grandTotal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                          {/* WhatsApp Action Button (Only if WhatsApp is enabled in org settings) */}
                          {quote.whatsappDispatchMode !== "NO_WHATSAPP" && (
                            <button
                              type="button"
                              onClick={() => handleOpenWhatsApp(quote)}
                              title={isSent ? "Already sent to customer (Click to re-send)" : "Send document on WhatsApp"}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                backgroundColor: isSent ? "#94a3b8" : "#25D366",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "4px",
                                padding: "4px 8px",
                                fontSize: "11.5px",
                                fontWeight: 600,
                                cursor: "pointer",
                                opacity: isSent ? 0.85 : 1,
                                boxShadow: isSent ? "none" : "0 1px 2px rgba(37, 211, 102, 0.25)",
                                transition: "all 0.15s ease",
                              }}
                            >
                              <MessageCircle size={12} />
                              <span>{isSent ? "Sent" : "WhatsApp"}</span>
                            </button>
                          )}

                          {/* Convert to Invoice Button */}
                          {!isConverted ? (
                            <button
                              type="button"
                              onClick={() => handleConvert(quote.id)}
                              disabled={convertingId === quote.id}
                              title="Convert to Sales Invoice"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                backgroundColor: "#0f172a",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "4px",
                                padding: "4px 8px",
                                fontSize: "11.5px",
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                            >
                              <ArrowRightCircle size={12} />
                              <span>Convert</span>
                            </button>
                          ) : (
                            <span
                              style={{
                                fontSize: "11px",
                                color: "#16a34a",
                                fontWeight: "600",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "2px",
                              }}
                            >
                              <CheckCircle size={12} /> Invoiced
                            </span>
                          )}

                          {/* View details */}
                          <Link
                            href={`/sales/quotations/${quote.id}${query}`}
                            style={{
                              padding: "4px",
                              color: "#64748b",
                              display: "inline-flex",
                              alignItems: "center",
                            }}
                            title="View / Edit Details"
                          >
                            <Eye size={16} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* WhatsApp Modal Trigger */}
      {whatsAppModal && (
        <QuotationWhatsAppModal
          isOpen={Boolean(whatsAppModal)}
          onClose={() => setWhatsAppModal(null)}
          onConfirmSent={async () => {
            await markQuotationAsSent(whatsAppModal.quotationId);
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
    </div>
  );
}

