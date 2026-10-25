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

  let phoneDigits = (params.vendorPhone || "").replace(/\D/g, "");
  // Standardize 10-digit Indian mobile numbers by prefixing 91 (WhatsApp wa.me strictly requires country code)
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
 * Safely opens a WhatsApp URL across standard browsers, Capacitor Android WebView,
 * iOS/Android mobile browsers, and desktop systems.
 */
export function openWhatsAppUrl(url: string) {
  if (typeof window === "undefined") return;

  const isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  try {
    // On mobile devices, window.location.href or direct intent reliably triggers the WhatsApp app without getting blocked by popup blocker
    if (isMobile) {
      window.location.href = url;
      return;
    }

    // On desktop browsers, open in a new tab
    const win = window.open(url, "_blank");
    if (!win || win.closed || typeof win.closed === "undefined") {
      // Fallback if desktop popup blocker intercepted
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
