"use client";

import React, { useState, useTransition } from "react";
import { updateInvoiceSettings } from "./actions";
import { InvoiceSettingsConfig, InvoiceTemplateKey } from "./constants";
import { InvoiceRenderer } from "@/components/sales/InvoiceRenderer";
import { Check, Sparkles, Building, Layers, Receipt, Save, Palette, Sliders, Landmark, QrCode } from "lucide-react";

interface Props {
  orgId: string;
  initialSettings: InvoiceSettingsConfig;
}

const TEMPLATES: {
  key: InvoiceTemplateKey;
  title: string;
  subtitle: string;
  badge: string;
  description: string;
  icon: any;
}[] = [
  {
    key: "CLASSIC_CORPORATE",
    title: "Classic Corporate",
    subtitle: "GST B2B Standard (A4)",
    badge: "GST Compliant",
    description: "High-density tabular layout with prominent tax breakdown, dual signature zones, and complete statutory headers.",
    icon: Building,
  },
  {
    key: "MODERN_MINIMAL",
    title: "Modern Minimal",
    subtitle: "Clean & Contemporary (A4)",
    badge: "Executive",
    description: "Spacious typography, clean carded totals, soft zebra striping, and visual QR code integration for high-end clientele.",
    icon: Layers,
  },
  {
    key: "THERMAL_COMPACT",
    title: "Thermal POS / Compact",
    subtitle: "3-inch (80mm) Roll / Counter Slip",
    badge: "POS Ready",
    description: "Dotted receipt format optimized for 80mm ESC/POS roll printers, retail billing counters, and fast customer handovers.",
    icon: Receipt,
  },
];

const PRESET_COLORS = [
  { label: "Slate Navy", value: "#0f172a" },
  { label: "Deep Indigo", value: "#4338ca" },
  { label: "Emerald Green", value: "#047857" },
  { label: "Burgundy Ruby", value: "#991b1b" },
  { label: "Royal Blue", value: "#1d4ed8" },
  { label: "Dark Teal", value: "#0f766e" },
];

const SAMPLE_INVOICE = {
  invoiceNumber: "INV-2026-0042",
  invoiceDate: new Date().toISOString(),
  dueDate: new Date(Date.now() + 15 * 86400000).toISOString(),
  customerName: "Acme Enterprises India Pvt Ltd",
  customerPhone: "+91 98401 23456",
  customerGstin: "33AABCA1234F1Z8",
  billingAddress: "42, Industrial Estate, Guindy, Chennai - 600032, Tamil Nadu",
  subtotalAmount: 14500,
  discountAmount: 500,
  taxableAmount: 14000,
  cgstAmount: 1260,
  sgstAmount: 1260,
  igstAmount: 0,
  roundOffAmount: 0,
  grandTotal: 16520,
  balanceDue: 16520,
  advancePaid: 0,
  paymentStatus: "UNPAID",
  paymentMode: "BANK_TRANSFER",
  notes: "Kindly quote invoice number during wire transfer.",
  items: [
    {
      description: "Industrial Precision Ball Bearing 6205-ZZ",
      hsnCode: "8482",
      uom: "PCS",
      quantity: 20,
      unitPrice: 450,
      discountPercent: 5,
      taxableAmount: 8550,
      gstRate: 18,
      cgstAmount: 769.5,
      sgstAmount: 769.5,
      totalAmount: 10089,
    },
    {
      description: "Synthetic High-Temperature Bearing Grease (5kg Bucket)",
      hsnCode: "2710",
      uom: "CAN",
      quantity: 2,
      unitPrice: 2975,
      discountPercent: 0,
      taxableAmount: 5950,
      gstRate: 18,
      cgstAmount: 535.5,
      sgstAmount: 535.5,
      totalAmount: 7021,
    },
  ],
};

const SAMPLE_ORG = {
  name: "Kalki Business Solutions",
  address: "Plot 18, Technology Corridor, OMR, Chennai, Tamil Nadu - 600096",
  phone: "+91 44 2855 0000",
  gstin: "33AABCK1234D1Z2",
};

export function InvoiceSettingsClient({ orgId, initialSettings }: Props) {
  const [config, setConfig] = useState<InvoiceSettingsConfig>(initialSettings);
  const [activeTab, setActiveTab] = useState<"TEMPLATE" | "COLUMNS" | "BANK" | "TERMS">("TEMPLATE");
  const [previewTemplate, setPreviewTemplate] = useState<InvoiceTemplateKey>(initialSettings.defaultTemplate);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const handleSave = () => {
    if (!orgId) {
      setFeedback({ message: "No Organization context active. Please select an organization.", type: "error" });
      return;
    }
    startTransition(async () => {
      const res = await updateInvoiceSettings(orgId, config);
      if (res.success) {
        setFeedback({ message: "Invoice template and settings saved successfully!", type: "success" });
        setTimeout(() => setFeedback(null), 4000);
      } else {
        setFeedback({ message: res.error || "Failed to update invoice settings", type: "error" });
      }
    });
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.15fr 0.95fr", gap: "24px", alignItems: "start" }}>
      {/* Left Column: Configuration Controls */}
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* Navigation Tabs */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            borderBottom: "1px solid #e2e8f0",
            paddingBottom: "8px",
          }}
        >
          {[
            { id: "TEMPLATE", label: "Templates & Style", icon: Sparkles },
            { id: "COLUMNS", label: "Fields & Columns", icon: Sliders },
            { id: "BANK", label: "Bank & UPI", icon: Landmark },
            { id: "TERMS", label: "Terms & Signature", icon: Check },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 14px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: isActive ? 600 : 500,
                  cursor: "pointer",
                  border: "none",
                  backgroundColor: isActive ? "#0f172a" : "#f1f5f9",
                  color: isActive ? "#ffffff" : "#475569",
                  transition: "all 0.15s ease",
                }}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB 1: Template Selection & Style */}
        {activeTab === "TEMPLATE" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <div style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a", marginBottom: "4px" }}>
                Choose Default Invoice Template
              </div>
              <div style={{ fontSize: "12.5px", color: "#64748b" }}>
                The chosen template will be preselected for all generated B2B invoices and print views.
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {TEMPLATES.map((tmpl) => {
                const Icon = tmpl.icon;
                const isSelected = config.defaultTemplate === tmpl.key;
                return (
                  <div
                    key={tmpl.key}
                    onClick={() => {
                      setConfig((prev) => ({ ...prev, defaultTemplate: tmpl.key }));
                      setPreviewTemplate(tmpl.key);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "14px",
                      padding: "16px",
                      borderRadius: "10px",
                      border: isSelected ? "2px solid #0f172a" : "1px solid #e2e8f0",
                      backgroundColor: isSelected ? "#f8fafc" : "#ffffff",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        padding: "10px",
                        borderRadius: "8px",
                        backgroundColor: isSelected ? "#0f172a" : "#f1f5f9",
                        color: isSelected ? "#ffffff" : "#475569",
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={22} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
                        <span style={{ fontSize: "14.5px", fontWeight: "700", color: "#0f172a" }}>
                          {tmpl.title}
                        </span>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: "600",
                            padding: "2px 8px",
                            borderRadius: "12px",
                            backgroundColor: "#e0e7ff",
                            color: "#3730a3",
                          }}
                        >
                          {tmpl.badge}
                        </span>
                        {isSelected && (
                          <span
                            style={{
                              marginLeft: "auto",
                              fontSize: "11.5px",
                              fontWeight: "700",
                              color: "#059669",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <Check size={14} /> DEFAULT
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "6px" }}>
                        {tmpl.subtitle}
                      </div>
                      <div style={{ fontSize: "12.5px", color: "#475569", lineHeight: "1.4" }}>
                        {tmpl.description}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Accent Color Customizer */}
            <div
              style={{
                marginTop: "10px",
                padding: "16px",
                borderRadius: "10px",
                border: "1px solid #e2e8f0",
                backgroundColor: "#ffffff",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <Palette size={16} color="#0f172a" />
                <span style={{ fontSize: "13.5px", fontWeight: "700", color: "#0f172a" }}>
                  Template Accent Color
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                {PRESET_COLORS.map((color) => {
                  const isChecked = config.primaryColor.toLowerCase() === color.value.toLowerCase();
                  return (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setConfig((prev) => ({ ...prev, primaryColor: color.value }))}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "6px 12px",
                        borderRadius: "20px",
                        border: isChecked ? "2px solid #0f172a" : "1px solid #cbd5e1",
                        backgroundColor: "#ffffff",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: isChecked ? 700 : 500,
                      }}
                    >
                      <span
                        style={{
                          width: "12px",
                          height: "12px",
                          borderRadius: "50%",
                          backgroundColor: color.value,
                          display: "inline-block",
                        }}
                      />
                      {color.label}
                    </button>
                  );
                })}
                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginLeft: "auto" }}>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>Custom:</span>
                  <input
                    type="color"
                    value={config.primaryColor}
                    onChange={(e) => setConfig((prev) => ({ ...prev, primaryColor: e.target.value }))}
                    style={{
                      width: "32px",
                      height: "32px",
                      padding: "2px",
                      border: "1px solid #cbd5e1",
                      borderRadius: "6px",
                      cursor: "pointer",
                    }}
                  />
                  <input
                    type="text"
                    value={config.primaryColor}
                    onChange={(e) => setConfig((prev) => ({ ...prev, primaryColor: e.target.value }))}
                    style={{
                      width: "80px",
                      padding: "6px 8px",
                      fontSize: "12px",
                      border: "1px solid #cbd5e1",
                      borderRadius: "6px",
                      fontFamily: "monospace",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Table Columns & Visibility */}
        {activeTab === "COLUMNS" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              padding: "16px",
              borderRadius: "10px",
              border: "1px solid #e2e8f0",
              backgroundColor: "#ffffff",
            }}
          >
            <div>
              <div style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a", marginBottom: "4px" }}>
                Invoice Column & Detail Visibility
              </div>
              <div style={{ fontSize: "12.5px", color: "#64748b" }}>
                Toggle columns on or off to tailor the print layout for services, products, or retail slips.
              </div>
            </div>

            {[
              {
                id: "showHsn",
                label: "HSN / SAC Code Column",
                desc: "Required for statutory GST B2B tax compliance above threshold.",
              },
              {
                id: "showUom",
                label: "Unit of Measurement (UOM)",
                desc: "Shows packaging units such as PCS, KGS, BOX, CAN, etc.",
              },
              {
                id: "showDiscount",
                label: "Item Discount Column",
                desc: "Displays itemized discount percentage and calculated reduction.",
              },
              {
                id: "showTaxBreakup",
                label: "Detailed Tax Breakup (CGST / SGST / IGST)",
                desc: "Shows separate rate and tax columns per item and in totals summary.",
              },
              {
                id: "showLogo",
                label: "Organization Logo in Header",
                desc: "Displays company logo if configured in organization profile.",
              },
            ].map((item) => {
              const checked = (config as any)[item.id];
              return (
                <label
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "12px",
                    padding: "12px",
                    borderRadius: "8px",
                    border: "1px solid #f1f5f9",
                    backgroundColor: checked ? "#f8fafc" : "#ffffff",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => setConfig((prev) => ({ ...prev, [item.id]: e.target.checked }))}
                    style={{ marginTop: "3px", width: "16px", height: "16px", cursor: "pointer" }}
                  />
                  <div>
                    <div style={{ fontSize: "13.5px", fontWeight: "600", color: "#0f172a" }}>{item.label}</div>
                    <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>{item.desc}</div>
                  </div>
                </label>
              );
            })}
          </div>
        )}

        {/* TAB 3: Bank & Payment Instructions */}
        {activeTab === "BANK" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              padding: "16px",
              borderRadius: "10px",
              border: "1px solid #e2e8f0",
              backgroundColor: "#ffffff",
            }}
          >
            <div>
              <div style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a", marginBottom: "4px" }}>
                Settlement & Bank Details
              </div>
              <div style={{ fontSize: "12.5px", color: "#64748b" }}>
                These bank credentials and UPI ID will print directly on customer invoices for direct NEFT/RTGS/UPI remittance.
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#334155", marginBottom: "5px" }}>
                  Bank Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. HDFC Bank, ICICI Bank"
                  value={config.bankName}
                  onChange={(e) => setConfig((prev) => ({ ...prev, bankName: e.target.value }))}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#334155", marginBottom: "5px" }}>
                  Account Holder / Beneficiary
                </label>
                <input
                  type="text"
                  placeholder="e.g. Kalki Solutions Pvt Ltd"
                  value={config.accountHolder}
                  onChange={(e) => setConfig((prev) => ({ ...prev, accountHolder: e.target.value }))}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#334155", marginBottom: "5px" }}>
                  Bank Account Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. 50200012345678"
                  value={config.accountNumber}
                  onChange={(e) => setConfig((prev) => ({ ...prev, accountNumber: e.target.value }))}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                    fontFamily: "monospace",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#334155", marginBottom: "5px" }}>
                  IFSC Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. HDFC0001234"
                  value={config.ifscCode}
                  onChange={(e) => setConfig((prev) => ({ ...prev, ifscCode: e.target.value.toUpperCase() }))}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                    fontFamily: "monospace",
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#334155", marginBottom: "5px" }}>
                UPI ID (Generates Dynamic Payment QR on Invoices)
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <QrCode size={18} color="#64748b" />
                <input
                  type="text"
                  placeholder="e.g. businessname@okaxis or 9840123456@upi"
                  value={config.upiId}
                  onChange={(e) => setConfig((prev) => ({ ...prev, upiId: e.target.value }))}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Terms & Signatory */}
        {activeTab === "TERMS" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              padding: "16px",
              borderRadius: "10px",
              border: "1px solid #e2e8f0",
              backgroundColor: "#ffffff",
            }}
          >
            <div>
              <div style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a", marginBottom: "4px" }}>
                Terms & Conditions and Signature
              </div>
              <div style={{ fontSize: "12.5px", color: "#64748b" }}>
                Standard legal clauses and signatory text displayed on generated invoices.
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#334155", marginBottom: "5px" }}>
                Authorized Signatory Label
              </label>
              <input
                type="text"
                placeholder="e.g. For Kalki Business Solutions / Authorized Signatory"
                value={config.authorizedSignatory}
                onChange={(e) => setConfig((prev) => ({ ...prev, authorizedSignatory: e.target.value }))}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  fontSize: "13px",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#334155", marginBottom: "5px" }}>
                Standard Terms & Conditions
              </label>
              <textarea
                rows={5}
                placeholder="Enter standard payment terms, jurisdiction, warranty policies..."
                value={config.defaultTerms}
                onChange={(e) => setConfig((prev) => ({ ...prev, defaultTerms: e.target.value }))}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  fontSize: "12.5px",
                  lineHeight: "1.45",
                  fontFamily: "inherit",
                }}
              />
            </div>
          </div>
        )}

        {/* Feedback message */}
        {feedback && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 500,
              backgroundColor: feedback.type === "success" ? "#ecfdf5" : "#fef2f2",
              color: feedback.type === "success" ? "#065f46" : "#991b1b",
              border: `1px solid ${feedback.type === "success" ? "#a7f3d0" : "#fecaca"}`,
            }}
          >
            {feedback.message}
          </div>
        )}

        {/* Action Button */}
        <div>
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 22px",
              borderRadius: "8px",
              backgroundColor: "#0f172a",
              color: "#ffffff",
              fontSize: "13.5px",
              fontWeight: "600",
              border: "none",
              cursor: isPending ? "not-allowed" : "pointer",
              opacity: isPending ? 0.7 : 1,
            }}
          >
            <Save size={16} />
            {isPending ? "Saving Configurations..." : "Save Invoice Settings"}
          </button>
        </div>
      </div>

      {/* Right Column: Live Interactive Preview */}
      <div
        style={{
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
          backgroundColor: "#f8fafc",
          padding: "16px",
          position: "sticky",
          top: "16px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "12px",
            paddingBottom: "10px",
            borderBottom: "1px solid #e2e8f0",
          }}
        >
          <div>
            <span style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a" }}>
              Live Interactive Preview
            </span>
            <span style={{ fontSize: "11px", color: "#64748b", marginLeft: "8px" }}>
              (Reflects current edits live)
            </span>
          </div>

          <div style={{ display: "flex", gap: "4px" }}>
            {TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.key}
                type="button"
                onClick={() => setPreviewTemplate(tmpl.key)}
                style={{
                  fontSize: "11px",
                  padding: "4px 8px",
                  borderRadius: "6px",
                  border: previewTemplate === tmpl.key ? "1px solid #0f172a" : "1px solid #cbd5e1",
                  backgroundColor: previewTemplate === tmpl.key ? "#0f172a" : "#ffffff",
                  color: previewTemplate === tmpl.key ? "#ffffff" : "#475569",
                  cursor: "pointer",
                  fontWeight: previewTemplate === tmpl.key ? 600 : 500,
                }}
              >
                {tmpl.title.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Scaled Preview Frame */}
        <div
          style={{
            maxHeight: "750px",
            overflowY: "auto",
            overflowX: "hidden",
            backgroundColor: "#ffffff",
            padding: "12px",
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ transform: "scale(0.88)", transformOrigin: "top left", width: "113%" }}>
            <InvoiceRenderer
              invoice={SAMPLE_INVOICE}
              organization={SAMPLE_ORG}
              config={config}
              templateOverride={previewTemplate}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
