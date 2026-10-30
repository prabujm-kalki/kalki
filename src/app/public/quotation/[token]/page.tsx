"use client";

import { useEffect, useState, use } from "react";
import { Printer, Download, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { formatIndianCurrency } from "@/lib/whatsapp-quotation";

export default function PublicQuotationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/public/quotation?token=${token}`)
      .then((res) => {
        if (!res.ok) throw new Error("Document not found or expired");
        return res.json();
      })
      .then((resData) => {
        setData(resData);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load document");
        setLoading(false);
      });
  }, [token]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div style={{ padding: "60px 20px", textAlign: "center", fontFamily: "sans-serif", color: "#64748b" }}>
        <p style={{ fontSize: "16px" }}>Loading Document...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: "60px 20px", textAlign: "center", fontFamily: "sans-serif" }}>
        <div style={{ display: "inline-flex", padding: "12px", borderRadius: "50%", backgroundColor: "#fee2e2", color: "#dc2626", marginBottom: "12px" }}>
          <AlertCircle size={32} />
        </div>
        <h2 style={{ fontSize: "20px", color: "#0f172a", margin: "0 0 8px 0" }}>Document Not Found</h2>
        <p style={{ color: "#64748b", fontSize: "14px", margin: 0 }}>
          This quotation link may be invalid or has expired. Please contact the sender for assistance.
        </p>
      </div>
    );
  }

  const { quotation, lines, organization, location } = data;
  const isProforma = quotation.docType === "PROFORMA";
  const isDummy = quotation.docType === "DUMMY";
  const docTitle = isDummy ? "" : isProforma ? "PROFORMA INVOICE" : "QUOTATION";

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc", padding: "24px 16px", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Action Bar (Hidden when printing) */}
      <div
        className="no-print"
        style={{
          maxWidth: "850px",
          margin: "0 auto 16px auto",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "#ffffff",
          padding: "12px 20px",
          borderRadius: "8px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              padding: "4px 10px",
              borderRadius: "12px",
              fontSize: "12px",
              fontWeight: 600,
              backgroundColor: quotation.status === "CONVERTED" ? "#dcfce7" : quotation.status === "SENT" ? "#e0e7ff" : "#f1f5f9",
              color: quotation.status === "CONVERTED" ? "#16a34a" : quotation.status === "SENT" ? "#4338ca" : "#475569",
            }}
          >
            {quotation.status}
          </span>
          <span style={{ fontSize: "13px", color: "#64748b" }}>
            Generated on {new Date(quotation.issueDate).toLocaleDateString("en-IN")}
          </span>
        </div>

        <button
          type="button"
          onClick={handlePrint}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 16px",
            borderRadius: "6px",
            border: "1px solid #cbd5e1",
            backgroundColor: "#ffffff",
            color: "#0f172a",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <Printer size={16} />
          Print / Save PDF
        </button>
      </div>

      {/* Main Document Body */}
      <div
        id="quotation-print-container"
        style={{
          maxWidth: "850px",
          margin: "0 auto",
          backgroundColor: "#ffffff",
          borderRadius: "10px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
          padding: "40px",
        }}
      >
        {/* Document Header */}
        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #0f172a", paddingBottom: "20px", marginBottom: "24px" }}>
          <div>
            <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#0f172a", margin: "0 0 6px 0" }}>
              {organization?.name || "KALKI ENTERPRISES"}
            </h1>
            <p style={{ margin: "2px 0", fontSize: "13px", color: "#475569" }}>{location?.address || organization?.address || ""}</p>
            {organization?.gstin && (
              <p style={{ margin: "2px 0", fontSize: "13px", color: "#475569" }}>
                <strong>GSTIN:</strong> {organization.gstin}
              </p>
            )}
            {organization?.phone && (
              <p style={{ margin: "2px 0", fontSize: "13px", color: "#475569" }}>
                <strong>Phone:</strong> {organization.phone}
              </p>
            )}
          </div>

          <div style={{ textAlign: "right" }}>
            {docTitle ? (
              <h2 style={{ fontSize: "20px", fontWeight: "800", color: "#2563eb", margin: "0 0 6px 0", letterSpacing: "0.05em" }}>
                {docTitle}
              </h2>
            ) : null}
            <p style={{ margin: "2px 0", fontSize: "14px", fontWeight: "700", color: "#0f172a" }}>
              #{quotation.quotationNumber}
            </p>
            <p style={{ margin: "2px 0", fontSize: "13px", color: "#64748b" }}>
              Date: {new Date(quotation.issueDate).toLocaleDateString("en-IN")}
            </p>
            {quotation.validUntil && (
              <p style={{ margin: "2px 0", fontSize: "13px", color: "#dc2626", fontWeight: "600" }}>
                Valid Until: {new Date(quotation.validUntil).toLocaleDateString("en-IN")}
              </p>
            )}
          </div>
        </div>

        {/* Customer Info */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "28px" }}>
          <div style={{ width: "55%" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Billed To
            </span>
            <h3 style={{ margin: "4px 0 2px 0", fontSize: "16px", fontWeight: "700", color: "#0f172a" }}>
              {quotation.customerName}
            </h3>
            {quotation.billingAddress && (
              <p style={{ margin: "2px 0", fontSize: "13px", color: "#475569", whiteSpace: "pre-line" }}>
                {quotation.billingAddress}
              </p>
            )}
            {quotation.customerPhone && (
              <p style={{ margin: "2px 0", fontSize: "13px", color: "#475569" }}>
                <strong>Phone:</strong> {quotation.customerPhone}
              </p>
            )}
            {quotation.customerGstin && (
              <p style={{ margin: "2px 0", fontSize: "13px", color: "#475569" }}>
                <strong>GSTIN:</strong> {quotation.customerGstin}
              </p>
            )}
          </div>

          <div style={{ width: "35%", backgroundColor: "#f8fafc", padding: "14px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Terms & Validity</span>
            <div style={{ marginTop: "6px", fontSize: "12px", color: "#334155", display: "flex", flexDirection: "column", gap: "4px" }}>
              <div><strong>Terms:</strong> {quotation.paymentTerms || "Standard Net 30"}</div>
              <div><strong>Document Type:</strong> {isDummy ? "Bill" : isProforma ? "Proforma" : "Sales Estimate"}</div>
              {quotation.convertedInvoiceId && (
                <div style={{ color: "#16a34a", fontWeight: "600" }}>
                  <CheckCircle size={13} style={{ display: "inline", marginRight: "4px" }} />
                  Converted to Tax Invoice
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "24px" }}>
          <thead>
            <tr style={{ backgroundColor: "#f1f5f9", borderBottom: "2px solid #cbd5e1" }}>
              <th style={{ textAlign: "left", padding: "10px 12px", fontSize: "12px", fontWeight: "700", color: "#334155" }}>#</th>
              <th style={{ textAlign: "left", padding: "10px 12px", fontSize: "12px", fontWeight: "700", color: "#334155" }}>Item & Description</th>
              <th style={{ textAlign: "center", padding: "10px 12px", fontSize: "12px", fontWeight: "700", color: "#334155" }}>HSN</th>
              <th style={{ textAlign: "right", padding: "10px 12px", fontSize: "12px", fontWeight: "700", color: "#334155" }}>Qty</th>
              <th style={{ textAlign: "right", padding: "10px 12px", fontSize: "12px", fontWeight: "700", color: "#334155" }}>Rate (₹)</th>
              <th style={{ textAlign: "right", padding: "10px 12px", fontSize: "12px", fontWeight: "700", color: "#334155" }}>GST %</th>
              <th style={{ textAlign: "right", padding: "10px 12px", fontSize: "12px", fontWeight: "700", color: "#334155" }}>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {lines?.map((line: any, idx: number) => (
              <tr key={line.id} style={{ borderBottom: "1px solid #e2e8f0", fontSize: "13px" }}>
                <td style={{ padding: "10px 12px", color: "#64748b" }}>{idx + 1}</td>
                <td style={{ padding: "10px 12px", fontWeight: "600", color: "#0f172a" }}>
                  {line.itemName}
                </td>
                <td style={{ padding: "10px 12px", textAlign: "center", color: "#64748b" }}>
                  {line.hsnCode || "-"}
                </td>
                <td style={{ padding: "10px 12px", textAlign: "right", color: "#0f172a" }}>
                  {Number(line.quantity).toLocaleString("en-IN")} {line.uom}
                </td>
                <td style={{ padding: "10px 12px", textAlign: "right", color: "#0f172a" }}>
                  {Number(line.unitRate).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </td>
                <td style={{ padding: "10px 12px", textAlign: "right", color: "#64748b" }}>
                  {Number(line.gstRate)}%
                </td>
                <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: "600", color: "#0f172a" }}>
                  {Number(line.lineTotal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Calculation & Summary Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "30px" }}>
          <div style={{ width: "55%" }}>
            {quotation.notes && (
              <div style={{ marginBottom: "14px" }}>
                <strong style={{ fontSize: "12px", color: "#475569", textTransform: "uppercase" }}>Notes:</strong>
                <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#334155", whiteSpace: "pre-line" }}>
                  {quotation.notes}
                </p>
              </div>
            )}
            {quotation.termsAndConditions && (
              <div>
                <strong style={{ fontSize: "12px", color: "#475569", textTransform: "uppercase" }}>Terms & Conditions:</strong>
                <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#64748b", whiteSpace: "pre-line" }}>
                  {quotation.termsAndConditions}
                </p>
              </div>
            )}
          </div>

          <div style={{ width: "40%", border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" }}>
            <div style={{ padding: "8px 14px", display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#475569", borderBottom: "1px solid #f1f5f9" }}>
              <span>Subtotal:</span>
              <span>₹{Number(quotation.subtotalAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
            {Number(quotation.discountAmount) > 0 && (
              <div style={{ padding: "8px 14px", display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#dc2626", borderBottom: "1px solid #f1f5f9" }}>
                <span>Discount:</span>
                <span>-₹{Number(quotation.discountAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div style={{ padding: "8px 14px", display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#475569", borderBottom: "1px solid #f1f5f9" }}>
              <span>Taxable Value:</span>
              <span>₹{Number(quotation.taxableAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
            {Number(quotation.cgstAmount) > 0 && (
              <div style={{ padding: "8px 14px", display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#475569", borderBottom: "1px solid #f1f5f9" }}>
                <span>CGST:</span>
                <span>₹{Number(quotation.cgstAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            {Number(quotation.sgstAmount) > 0 && (
              <div style={{ padding: "8px 14px", display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#475569", borderBottom: "1px solid #f1f5f9" }}>
                <span>SGST:</span>
                <span>₹{Number(quotation.sgstAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div style={{ padding: "12px 14px", display: "flex", justifyContent: "space-between", fontSize: "16px", fontWeight: "800", color: "#0f172a", backgroundColor: "#f8fafc" }}>
              <span>Grand Total:</span>
              <span style={{ color: "#16a34a" }}>
                ₹{Number(quotation.grandTotal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Signature Area */}
        <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #e2e8f0", paddingTop: "40px", marginTop: "30px" }}>
          <div>
            <p style={{ margin: 0, fontSize: "12px", color: "#94a3b8" }}>Customer Acceptance Signature</p>
            <div style={{ width: "200px", borderBottom: "1px dashed #cbd5e1", height: "40px" }} />
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ margin: 0, fontSize: "12px", color: "#94a3b8" }}>Authorized Signatory</p>
            <div style={{ width: "200px", borderBottom: "1px dashed #cbd5e1", height: "40px", marginLeft: "auto" }} />
            <p style={{ margin: "6px 0 0 0", fontSize: "12px", fontWeight: "600", color: "#334155" }}>
              For {organization?.name || "KALKI ENTERPRISES"}
            </p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background-color: #ffffff !important;
            padding: 0 !important;
          }
          #quotation-print-container {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            max-width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}

