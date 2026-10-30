export type InvoiceTemplateKey = "CLASSIC_CORPORATE" | "MODERN_MINIMAL" | "THERMAL_COMPACT";

export interface InvoiceSettingsConfig {
  defaultTemplate: InvoiceTemplateKey;
  primaryColor: string;
  // Company / Header Details
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyGstin?: string;
  showLogo: boolean;
  showHsn: boolean;
  showUom: boolean;
  showDiscount: boolean;
  showTaxBreakup: boolean;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  accountHolder: string;
  upiId: string;
  authorizedSignatory: string;
  defaultTerms: string;
}

export const DEFAULT_INVOICE_CONFIG: InvoiceSettingsConfig = {
  defaultTemplate: "CLASSIC_CORPORATE",
  primaryColor: "#0f172a",
  companyName: "",
  companyAddress: "",
  companyPhone: "",
  companyGstin: "",
  showLogo: true,
  showHsn: true,
  showUom: true,
  showDiscount: true,
  showTaxBreakup: true,
  bankName: "",
  accountNumber: "",
  ifscCode: "",
  accountHolder: "",
  upiId: "",
  authorizedSignatory: "Authorized Signatory",
  defaultTerms:
    "1. Payment is due within agreed credit terms.\n2. Interest @ 18% p.a. charged on overdue invoices.\n3. Goods once sold will not be accepted back unless authorized.",
};

