/**
 * Shared utility for building Purchase Order WhatsApp messages
 * honoring organization templates, vendor delivery preferences, and line items.
 */

export interface PoWhatsappParams {
  poNumber: string;
  totalAmount?: number | string | null;
  publicToken?: string | null;
  publicUrl?: string | null;
  lines?: Array<{
    itemName?: string | null;
    orderedQuantity?: number | string | null;
    unitOfMeasure?: string | null;
  }> | null;
  vendorPhone?: string | null;
  poWhatsappPreference?: string | null; // "TEXT_ONLY" | "PDF_LINK_ONLY" | "TEXT_AND_PDF_LINK"
  whatsappPoTemplate?: string | null;
}

export function formatIndianCurrency(val: number | string | null | undefined): string {
  const num = Number(val || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(num);
}

export function buildPoWhatsappMessage(params: PoWhatsappParams): {
  text: string;
  whatsappUrl: string;
  phoneDigits: string;
} {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const publicUrl = params.publicUrl || (params.publicToken ? `${origin}/public/po/${params.publicToken}` : "");
  const poNum = params.poNumber;
  const amountFormatted = formatIndianCurrency(params.totalAmount);

  const itemsList = (params.lines && params.lines.length > 0)
    ? params.lines
        .map(l => `${l.itemName || "Item"} - ${l.orderedQuantity || 0} ${l.unitOfMeasure || ""}`.trim())
        .join("\n")
    : "";

  let text = "";

  if (params.whatsappPoTemplate) {
    text = params.whatsappPoTemplate
      .replace(/{poId}/g, poNum)
      .replace(/{amount}/g, amountFormatted)
      .replace(/{items?}/g, itemsList)
      .replace(/{link}/g, publicUrl);
  } else if (params.poWhatsappPreference === "TEXT_ONLY") {
    text = `Hello, please find Purchase Order #${poNum} for ${amountFormatted}.${itemsList ? `\n\nItems:\n${itemsList}` : ""}`;
  } else if (params.poWhatsappPreference === "PDF_LINK_ONLY") {
    text = `Hello, view and download Purchase Order #${poNum} here: ${publicUrl}`;
  } else {
    // TEXT_AND_PDF_LINK (default)
    text = `Hello, please find Purchase Order #${poNum} for ${amountFormatted}.\n\n${itemsList ? `Items:\n${itemsList}\n\n` : ""}View and download the PDF here: ${publicUrl}`;
  }

  const phoneDigits = (params.vendorPhone || "").replace(/\D/g, "");
  const whatsappUrl = phoneDigits
    ? `https://wa.me/${phoneDigits}?text=${encodeURIComponent(text)}`
    : `https://wa.me/?text=${encodeURIComponent(text)}`;

  return { text, whatsappUrl, phoneDigits };
}

/**
 * Safely opens a WhatsApp URL across standard browsers, Capacitor Android WebView,
 * and mobile devices.
 */
export function openWhatsAppUrl(url: string) {
  if (typeof window === "undefined") return;

  try {
    // In Capacitor / mobile WebViews, window.open(url, '_system') asks the system to launch the external application/browser
    const win = window.open(url, "_system");
    if (!win) {
      window.open(url, "_blank");
    }
  } catch (e) {
    try {
      window.location.href = url;
    } catch (err) {
      console.error("Failed to open WhatsApp URL:", err);
    }
  }
}
