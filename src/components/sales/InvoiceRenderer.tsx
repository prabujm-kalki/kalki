"use client";

import React from "react";
import { InvoiceSettingsConfig, InvoiceTemplateKey } from "@/app/sales/settings/invoice/constants";
import { Building2, QrCode } from "lucide-react";

export interface InvoiceRendererProps {
  documentTitle?: string;
  invoice: {
    invoiceNumber: string;
    invoiceDate?: string | Date | null;
    dueDate?: string | Date | null;
    customerName: string;
    customerPhone?: string | null;
    customerGstin?: string | null;
    billingAddress?: string | null;
    subtotalAmount: number | string;
    discountAmount?: number | string;
    taxableAmount?: number | string;
    cgstAmount?: number | string;
    sgstAmount?: number | string;
    igstAmount?: number | string;
    roundOffAmount?: number | string;
    grandTotal: number | string;
    balanceDue?: number | string;
    advancePaid?: number | string;
    paymentStatus?: string | null;
    paymentMode?: string | null;
    notes?: string | null;
    items?: Array<{
      id?: string;
      itemDescription?: string;
      description?: string;
      hsnCode?: string | null;
      uom?: string | null;
      quantity: number | string;
      unitRate?: number | string;
      unitPrice?: number | string;
      discountPercent?: number | string;
      discountAmount?: number | string;
      gstRate?: number | string;
      taxableAmount?: number | string;
      cgstAmount?: number | string;
      sgstAmount?: number | string;
      lineTotal?: number | string;
      totalAmount?: number | string;
    }>;
  };
  organization?: {
    name?: string;
    address?: string;
    phone?: string;
    gstin?: string;
    logoUrl?: string | null;
  };
  config: InvoiceSettingsConfig;
  templateOverride?: InvoiceTemplateKey;
  containerId?: string;
}

export function InvoiceRenderer({
  documentTitle,
  invoice,
  organization,
  config,
  templateOverride,
  containerId = "invoice-print-area",
}: InvoiceRendererProps) {
  const activeTemplate = templateOverride || config.defaultTemplate || "CLASSIC_CORPORATE";
  const primaryColor = config.primaryColor || "#0f172a";
  const docTitle = documentTitle !== undefined ? documentTitle : "TAX INVOICE";

  const orgName = config.companyName?.trim() || organization?.name || "KALKI ENTERPRISES";
  const orgAddress = config.companyAddress !== undefined && config.companyAddress !== "" ? config.companyAddress : (organization?.address || "");
  const orgPhone = config.companyPhone !== undefined && config.companyPhone !== "" ? config.companyPhone : (organization?.phone || "");
  const orgGstin = config.companyGstin !== undefined && config.companyGstin !== "" ? config.companyGstin : (organization?.gstin || "");

  const items = invoice.items || [];
  const grandTotalNum = Number(invoice.grandTotal || 0);
  const subtotalNum = Number(invoice.subtotalAmount || 0);
  const discountNum = Number(invoice.discountAmount || 0);
  const taxableNum = Number(invoice.taxableAmount || (subtotalNum - discountNum));
  const cgstNum = Number(invoice.cgstAmount || 0);
  const sgstNum = Number(invoice.sgstAmount || 0);
  const roundOffNum = Number(invoice.roundOffAmount || 0);

  // ==========================================
  // TEMPLATE 1: CLASSIC CORPORATE (Standard B2B)
  // ==========================================
  if (activeTemplate === "CLASSIC_CORPORATE") {
    return (
      <div
        id={containerId}
        style={{
          backgroundColor: "#ffffff",
          fontFamily: "system-ui, -apple-system, sans-serif",
          color: "#0f172a",
          padding: "32px",
          borderRadius: "8px",
          border: "1px solid #e2e8f0",
          maxWidth: "850px",
          margin: "0 auto",
          boxSizing: "border-box",
        }}
      >
        {/* Top Header with Corporate Accent Band */}
        <div style={{ height: "4px", backgroundColor: primaryColor, marginBottom: "20px", borderRadius: "2px" }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px" }}>
          <div>
            {config.showLogo && organization?.logoUrl ? (
              <img src={organization.logoUrl} alt="Logo" style={{ maxHeight: "50px", marginBottom: "8px" }} />
            ) : null}
            <h1 style={{ fontSize: "22px", fontWeight: "800", color: primaryColor, margin: "0 0 4px 0" }}>
              {orgName}
            </h1>
            {orgAddress && <p style={{ margin: "2px 0", fontSize: "12.5px", color: "#475569" }}>{orgAddress}</p>}
            {orgPhone && <p style={{ margin: "2px 0", fontSize: "12.5px", color: "#475569" }}>Phone: {orgPhone}</p>}
            {orgGstin && (
              <p style={{ margin: "2px 0", fontSize: "12.5px", color: "#0f172a", fontWeight: "600" }}>
                GSTIN: {orgGstin}
              </p>
            )}
          </div>

          <div style={{ textAlign: "right" }}>
            {docTitle ? (
              <h2 style={{ fontSize: "18px", fontWeight: "800", color: primaryColor, letterSpacing: "1px", margin: "0 0 4px 0" }}>
                {docTitle}
              </h2>
            ) : null}
            <p style={{ margin: "2px 0", fontSize: "14px", fontWeight: "700", color: "#0f172a" }}>
              #{invoice.invoiceNumber}
            </p>
            <p style={{ margin: "2px 0", fontSize: "12.5px", color: "#64748b" }}>
              Date: {invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString("en-IN") : "-"}
            </p>
            {invoice.dueDate && (
              <p style={{ margin: "2px 0", fontSize: "12.5px", color: "#dc2626", fontWeight: "600" }}>
                Due Date: {new Date(invoice.dueDate).toLocaleDateString("en-IN")}
              </p>
            )}
            {invoice.paymentStatus && (
              <span
                style={{
                  display: "inline-block",
                  marginTop: "6px",
                  padding: "3px 10px",
                  borderRadius: "12px",
                  fontSize: "11px",
                  fontWeight: 700,
                  backgroundColor: invoice.paymentStatus === "PAID" ? "#dcfce7" : "#fee2e2",
                  color: invoice.paymentStatus === "PAID" ? "#16a34a" : "#dc2626",
                }}
              >
                {invoice.paymentStatus}
              </span>
            )}
          </div>
        </div>

        {/* Billed To / Shipped To Grid */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "24px", padding: "14px", backgroundColor: "#f8fafc", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
          <div style={{ width: "55%" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
              Billed To
            </span>
            <h3 style={{ margin: "4px 0 2px 0", fontSize: "15px", fontWeight: "700", color: "#0f172a" }}>
              {invoice.customerName}
            </h3>
            {invoice.billingAddress && (
              <p style={{ margin: "2px 0", fontSize: "12.5px", color: "#475569", whiteSpace: "pre-line" }}>
                {invoice.billingAddress}
              </p>
            )}
            {invoice.customerPhone && (
              <p style={{ margin: "2px 0", fontSize: "12.5px", color: "#475569" }}>
                Phone: {invoice.customerPhone}
              </p>
            )}
            {invoice.customerGstin && (
              <p style={{ margin: "2px 0", fontSize: "12.5px", color: "#0f172a", fontWeight: "600" }}>
                GSTIN: {invoice.customerGstin}
              </p>
            )}
          </div>

          <div style={{ width: "38%", fontSize: "12.5px", color: "#475569", display: "flex", flexDirection: "column", gap: "4px" }}>
            <div><strong>Payment Mode:</strong> {invoice.paymentMode || "Credit"}</div>
            {invoice.advancePaid ? <div><strong>Advance Paid:</strong> ₹{Number(invoice.advancePaid).toLocaleString("en-IN")}</div> : null}
            {invoice.balanceDue ? <div><strong>Balance Due:</strong> ₹{Number(invoice.balanceDue).toLocaleString("en-IN")}</div> : null}
          </div>
        </div>

        {/* Item Table */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px" }}>
          <thead>
            <tr style={{ backgroundColor: "#f1f5f9", borderBottom: `2px solid ${primaryColor}` }}>
              <th style={{ textAlign: "left", padding: "8px 10px", fontSize: "12px", color: "#334155" }}>#</th>
              <th style={{ textAlign: "left", padding: "8px 10px", fontSize: "12px", color: "#334155" }}>Description</th>
              {config.showHsn && <th style={{ textAlign: "center", padding: "8px 10px", fontSize: "12px", color: "#334155" }}>HSN</th>}
              <th style={{ textAlign: "right", padding: "8px 10px", fontSize: "12px", color: "#334155" }}>Qty</th>
              {config.showUom && <th style={{ textAlign: "center", padding: "8px 10px", fontSize: "12px", color: "#334155" }}>UOM</th>}
              <th style={{ textAlign: "right", padding: "8px 10px", fontSize: "12px", color: "#334155" }}>Rate (₹)</th>
              {config.showDiscount && <th style={{ textAlign: "right", padding: "8px 10px", fontSize: "12px", color: "#334155" }}>Disc %</th>}
              {config.showTaxBreakup && <th style={{ textAlign: "right", padding: "8px 10px", fontSize: "12px", color: "#334155" }}>GST %</th>}
              <th style={{ textAlign: "right", padding: "8px 10px", fontSize: "12px", color: "#334155" }}>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it: any, i: number) => {
              const qty = Number(it.quantity || 0);
              const rate = Number(it.unitRate || it.unitPrice || 0);
              const total = Number(it.lineTotal || it.totalAmount || (qty * rate));
              return (
                <tr key={it.id || i} style={{ borderBottom: "1px solid #e2e8f0", fontSize: "12.5px" }}>
                  <td style={{ padding: "8px 10px", color: "#64748b" }}>{i + 1}</td>
                  <td style={{ padding: "8px 10px", fontWeight: "600", color: "#0f172a" }}>
                    {it.itemDescription || it.description || "Item"}
                  </td>
                  {config.showHsn && <td style={{ padding: "8px 10px", textAlign: "center", color: "#64748b" }}>{it.hsnCode || "-"}</td>}
                  <td style={{ padding: "8px 10px", textAlign: "right" }}>{qty}</td>
                  {config.showUom && <td style={{ padding: "8px 10px", textAlign: "center", color: "#64748b" }}>{it.uom || "Unit"}</td>}
                  <td style={{ padding: "8px 10px", textAlign: "right" }}>{rate.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                  {config.showDiscount && <td style={{ padding: "8px 10px", textAlign: "right" }}>{it.discountPercent ? `${it.discountPercent}%` : "-"}</td>}
                  {config.showTaxBreakup && <td style={{ padding: "8px 10px", textAlign: "right" }}>{it.gstRate ? `${it.gstRate}%` : "-"}</td>}
                  <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: "600", color: "#0f172a" }}>
                    {total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Totals & Bank Details Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
          <div style={{ width: "50%" }}>
            {config.bankName && (
              <div style={{ backgroundColor: "#f8fafc", padding: "12px", borderRadius: "6px", border: "1px solid #e2e8f0", marginBottom: "12px", fontSize: "12px" }}>
                <strong style={{ display: "block", color: "#334155", textTransform: "uppercase", marginBottom: "4px" }}>Bank Payment Details:</strong>
                <div>Bank: {config.bankName}</div>
                <div>A/C No: <span style={{ fontFamily: "monospace", fontWeight: "600" }}>{config.accountNumber}</span></div>
                <div>IFSC: <span style={{ fontFamily: "monospace" }}>{config.ifscCode}</span></div>
                {config.accountHolder && <div>Holder: {config.accountHolder}</div>}
                {config.upiId && <div>UPI VPA: <span style={{ fontFamily: "monospace", color: "#2563eb" }}>{config.upiId}</span></div>}
              </div>
            )}
            {config.defaultTerms && (
              <div>
                <strong style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase" }}>Terms & Conditions:</strong>
                <p style={{ margin: "2px 0 0 0", fontSize: "11.5px", color: "#64748b", whiteSpace: "pre-line" }}>{config.defaultTerms}</p>
              </div>
            )}
          </div>

          <div style={{ width: "40%", border: "1px solid #e2e8f0", borderRadius: "6px", overflow: "hidden" }}>
            <div style={{ padding: "6px 12px", display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#475569", borderBottom: "1px solid #f1f5f9" }}>
              <span>Subtotal:</span>
              <span>₹{subtotalNum.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
            {discountNum > 0 && (
              <div style={{ padding: "6px 12px", display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#dc2626", borderBottom: "1px solid #f1f5f9" }}>
                <span>Discount:</span>
                <span>-₹{discountNum.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            {config.showTaxBreakup && (
              <>
                <div style={{ padding: "6px 12px", display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#475569", borderBottom: "1px solid #f1f5f9" }}>
                  <span>CGST:</span>
                  <span>₹{cgstNum.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
                <div style={{ padding: "6px 12px", display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#475569", borderBottom: "1px solid #f1f5f9" }}>
                  <span>SGST:</span>
                  <span>₹{sgstNum.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
              </>
            )}
            {roundOffNum !== 0 && (
              <div style={{ padding: "6px 12px", display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#64748b", borderBottom: "1px solid #f1f5f9" }}>
                <span>Round Off:</span>
                <span>₹{roundOffNum.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div style={{ padding: "10px 12px", display: "flex", justifyContent: "space-between", fontSize: "15px", fontWeight: "800", color: "#ffffff", backgroundColor: primaryColor }}>
              <span>Grand Total:</span>
              <span>₹{grandTotalNum.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* Signatory Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "30px", textAlign: "right" }}>
          <div>
            <div style={{ width: "180px", borderBottom: "1px dashed #cbd5e1", height: "40px", marginLeft: "auto" }} />
            <p style={{ margin: "6px 0 0 0", fontSize: "12px", fontWeight: "600", color: "#334155" }}>
              {config.authorizedSignatory || "Authorized Signatory"}
            </p>
            <p style={{ margin: "2px 0 0 0", fontSize: "11px", color: "#64748b" }}>For {orgName}</p>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // TEMPLATE 2: MODERN MINIMAL (High Whitespace & Tech)
  // ==========================================
  if (activeTemplate === "MODERN_MINIMAL") {
    return (
      <div
        id={containerId}
        style={{
          backgroundColor: "#ffffff",
          fontFamily: "system-ui, -apple-system, sans-serif",
          color: "#0f172a",
          padding: "36px",
          maxWidth: "850px",
          margin: "0 auto",
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "40px" }}>
          <div>
            {docTitle ? (
              <div style={{ display: "inline-block", padding: "6px 12px", borderRadius: "6px", backgroundColor: primaryColor, color: "#ffffff", fontSize: "14px", fontWeight: "800", letterSpacing: "1px", marginBottom: "12px" }}>
                {docTitle}
              </div>
            ) : null}
            <h1 style={{ fontSize: "24px", fontWeight: "800", color: "#0f172a", margin: "0 0 4px 0" }}>
              {orgName}
            </h1>
            <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>{orgAddress} {orgGstin ? `• GST: ${orgGstin}` : ""}</p>
          </div>

          <div style={{ textAlign: "right" }}>
            <p style={{ margin: 0, fontSize: "12px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Invoice Number</p>
            <h2 style={{ margin: "2px 0 8px 0", fontSize: "18px", fontWeight: "700", color: "#0f172a" }}>#{invoice.invoiceNumber}</h2>
            <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>Issued: {invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString("en-IN") : "-"}</p>
            {invoice.dueDate && <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#dc2626", fontWeight: "600" }}>Due: {new Date(invoice.dueDate).toLocaleDateString("en-IN")}</p>}
          </div>
        </div>

        <div style={{ borderTop: "1px solid #f1f5f9", borderBottom: "1px solid #f1f5f9", padding: "18px 0", marginBottom: "32px", display: "flex", justifyContent: "space-between" }}>
          <div>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>Client</span>
            <h3 style={{ margin: "4px 0 2px 0", fontSize: "16px", fontWeight: "700", color: "#0f172a" }}>{invoice.customerName}</h3>
            <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>{invoice.customerPhone || invoice.billingAddress || ""}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>Amount Due</span>
            <div style={{ fontSize: "22px", fontWeight: "800", color: primaryColor, marginTop: "2px" }}>
              ₹{grandTotalNum.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "30px" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
              <th style={{ textAlign: "left", padding: "10px 0", fontSize: "12px", color: "#94a3b8", textTransform: "uppercase" }}>Item</th>
              <th style={{ textAlign: "right", padding: "10px 0", fontSize: "12px", color: "#94a3b8", textTransform: "uppercase" }}>Qty</th>
              <th style={{ textAlign: "right", padding: "10px 0", fontSize: "12px", color: "#94a3b8", textTransform: "uppercase" }}>Price</th>
              <th style={{ textAlign: "right", padding: "10px 0", fontSize: "12px", color: "#94a3b8", textTransform: "uppercase" }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it: any, i: number) => {
              const qty = Number(it.quantity || 0);
              const rate = Number(it.unitRate || it.unitPrice || 0);
              const total = Number(it.lineTotal || it.totalAmount || (qty * rate));
              return (
                <tr key={it.id || i} style={{ borderBottom: "1px solid #f8fafc", fontSize: "13px" }}>
                  <td style={{ padding: "12px 0", fontWeight: "600", color: "#0f172a" }}>
                    {it.itemDescription || it.description || "Item"}
                  </td>
                  <td style={{ padding: "12px 0", textAlign: "right", color: "#64748b" }}>{qty}</td>
                  <td style={{ padding: "12px 0", textAlign: "right", color: "#64748b" }}>₹{rate.toFixed(2)}</td>
                  <td style={{ padding: "12px 0", textAlign: "right", fontWeight: "700", color: "#0f172a" }}>₹{total.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ width: "50%", fontSize: "12px", color: "#64748b" }}>
            {config.upiId && (
              <div style={{ marginBottom: "10px", padding: "10px", backgroundColor: "#f8fafc", borderRadius: "6px", display: "inline-block" }}>
                <span>Scan / Pay via UPI: <strong>{config.upiId}</strong></span>
              </div>
            )}
            <p style={{ margin: 0 }}>{config.defaultTerms}</p>
          </div>

          <div style={{ width: "35%", textAlign: "right", fontSize: "13px", color: "#64748b", display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Subtotal:</span>
              <span style={{ color: "#0f172a", fontWeight: "600" }}>₹{subtotalNum.toFixed(2)}</span>
            </div>
            {cgstNum + sgstNum > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Taxes:</span>
                <span style={{ color: "#0f172a" }}>₹{(cgstNum + sgstNum).toFixed(2)}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", borderTop: "2px solid #0f172a", paddingTop: "8px", fontSize: "16px", fontWeight: "800", color: "#0f172a" }}>
              <span>Total:</span>
              <span>₹{grandTotalNum.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // TEMPLATE 3: THERMAL COMPACT (80mm POS Style)
  // ==========================================
  return (
    <div
      id={containerId}
      style={{
        backgroundColor: "#ffffff",
        fontFamily: "'Courier New', Courier, monospace",
        color: "#000000",
        padding: "20px 14px",
        maxWidth: "360px",
        margin: "0 auto",
        border: "1px dashed #94a3b8",
        boxSizing: "border-box",
        fontSize: "12px",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: "12px" }}>
        <h2 style={{ fontSize: "16px", fontWeight: "800", margin: "0 0 2px 0" }}>{orgName}</h2>
        {orgAddress && <p style={{ margin: "2px 0", fontSize: "11px" }}>{orgAddress}</p>}
        {orgGstin && <p style={{ margin: "2px 0", fontSize: "11px" }}>GST: {orgGstin}</p>}
        <p style={{ margin: "6px 0 2px 0", borderTop: "1px dashed #000", borderBottom: "1px dashed #000", padding: "4px 0", fontWeight: "700" }}>
          BILL / RECEIPT
        </p>
      </div>

      <div style={{ marginBottom: "10px", fontSize: "11.5px" }}>
        <div>Inv: #{invoice.invoiceNumber}</div>
        <div>Date: {invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleString("en-IN") : "-"}</div>
        <div>Customer: {invoice.customerName}</div>
      </div>

      <div style={{ borderBottom: "1px dashed #000", marginBottom: "8px" }} />

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11.5px", marginBottom: "10px" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #000" }}>
            <th style={{ textAlign: "left", padding: "4px 0" }}>Item</th>
            <th style={{ textAlign: "right", padding: "4px 0" }}>Qty</th>
            <th style={{ textAlign: "right", padding: "4px 0" }}>Price</th>
            <th style={{ textAlign: "right", padding: "4px 0" }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it: any, i: number) => {
            const qty = Number(it.quantity || 0);
            const rate = Number(it.unitRate || it.unitPrice || 0);
            const total = Number(it.lineTotal || it.totalAmount || (qty * rate));
            return (
              <tr key={it.id || i}>
                <td style={{ padding: "4px 0" }}>{it.itemDescription || it.description || "Item"}</td>
                <td style={{ textAlign: "right", padding: "4px 0" }}>{qty}</td>
                <td style={{ textAlign: "right", padding: "4px 0" }}>{rate.toFixed(0)}</td>
                <td style={{ textAlign: "right", padding: "4px 0", fontWeight: "bold" }}>{total.toFixed(0)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={{ borderTop: "1px dashed #000", paddingTop: "6px", marginBottom: "10px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: "14px" }}>
          <span>TOTAL:</span>
          <span>₹{grandTotalNum.toFixed(2)}</span>
        </div>
        {invoice.paymentMode && <div style={{ fontSize: "11px", marginTop: "2px" }}>Mode: {invoice.paymentMode}</div>}
      </div>

      <div style={{ textAlign: "center", fontSize: "11px", borderTop: "1px dashed #000", paddingTop: "8px" }}>
        <p style={{ margin: "2px 0" }}>Thank you! Visit Again</p>
      </div>
    </div>
  );
}
