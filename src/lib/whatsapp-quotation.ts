/**
 * Shared utility for building Sales Quotation / Proforma WhatsApp messages & URLs.
 * Direct wa.me integration with standardized Indian mobile number formatting.
 */

export interface QuotationWhatsappParams {
  quotationNumber: string;
  docType?: "QUOTATION" | "PROFORMA" | string;
  totalAmount?: number | string | null;
  publicToken?: string | null;
  publicUrl?: string | null;
  lines?: Array<{
    itemName?: string | null;
    quantity?: number | string | null;
    uom?: string | null;
    unitRate?: number | string | null;
    lineTotal?: number | string | null;
  }> | null;
  customerPhone?: string | null;
  customerName?: string | null;
  validUntil?: string | Date | null;
}

export function formatIndianCurrency(val: number | string | null | undefined): string {
  const num = Number(val || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(num);
}

export function buildQuotationWhatsappMessage(params: QuotationWhatsappParams): {
  text: string;
  whatsappUrl: string;
  phoneDigits: string;
} {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const publicUrl = params.publicUrl || (params.publicToken ? `${origin}/public/quotation/${params.publicToken}` : "");
  const docTitle = params.docType === "PROFORMA" ? "Proforma Invoice" : "Quotation";
  const quoteNum = params.quotationNumber;
  const amountFormatted = formatIndianCurrency(params.totalAmount);

  const itemsList = (params.lines && params.lines.length > 0)
    ? params.lines
        .filter(l => Number(l.quantity || 0) > 0)
        .slice(0, 8) // Limit to top 8 items to keep WhatsApp message crisp
        .map(l => `• ${l.itemName || "Item"} - ${l.quantity || 0} ${l.uom || "Unit"} @ ₹${Number(l.unitRate || 0).toLocaleString("en-IN")}`)
        .join("\n")
    : "";

  const expiryText = params.validUntil 
    ? `\n*Valid Until:* ${new Date(params.validUntil).toLocaleDateString("en-IN")}`
    : "";

  let text = `Dear ${params.customerName || "Customer"},\n\n`;
  text += `Please find your *${docTitle} #${quoteNum}* for *${amountFormatted}*.\n`;
  if (expiryText) text += `${expiryText}\n`;
  if (itemsList) text += `\n*Item Summary:*\n${itemsList}\n`;
  if (publicUrl) text += `\n📄 *View / Download PDF Document:* \n${publicUrl}\n`;
  text += `\nThank you for choosing us!`;

  let phoneDigits = (params.customerPhone || "").replace(/\D/g, "");
  // Standardize 10-digit Indian mobile numbers by prefixing 91
  if (phoneDigits.length === 10 && /^[6-9]/.test(phoneDigits)) {
    phoneDigits = `91${phoneDigits}`;
  } else if (phoneDigits.length === 11 && phoneDigits.startsWith("0")) {
    phoneDigits = `91${phoneDigits.slice(1)}`;
  }

  const whatsappUrl = phoneDigits
    ? `https://wa.me/${phoneDigits}?text=${encodeURIComponent(text)}`
    : `https://wa.me/?text=${encodeURIComponent(text)}`;

  return { text, whatsappUrl, phoneDigits };
}

/**
 * Safely opens a WhatsApp URL across standard browsers, mobile devices, and desktop.
 */
export function openWhatsAppUrl(url: string) {
  if (typeof window === "undefined") return;

  const isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  try {
    if (isMobile) {
      window.location.href = url;
      return;
    }

    const win = window.open(url, "_blank");
    if (!win || win.closed || typeof win.closed === "undefined") {
      window.location.href = url;
    }
  } catch (e) {
    try {
      window.location.href = url;
    } catch (err) {
      console.error("Failed to open WhatsApp URL:", err);
    }
  }
}

