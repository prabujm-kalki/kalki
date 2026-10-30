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
  poWhatsappPreference?: string | null; // Vendor override: "TEXT_ONLY" | "PDF_LINK_ONLY" | "TEXT_AND_PDF_LINK"
  whatsappPoTemplate?: string | null;
  orgWhatsappDispatchMode?: string | null; // "NO_WHATSAPP" | "API_AUTOMATED" | "WEB_LINK_POPUP"
  orgWhatsappContentFormat?: string | null; // "TEXT_AND_PDF_LINK" | "TEXT_ONLY" | "PDF_LINK_ONLY"
}

export type EffectiveWhatsappDispatchMode = "NO_WHATSAPP" | "API_AUTOMATED" | "WEB_LINK_POPUP";
export type EffectiveWhatsappContentFormat = "TEXT_AND_PDF_LINK" | "TEXT_ONLY" | "PDF_LINK_ONLY";

/**
 * Resolves the effective dispatch mode and content format based on:
 * 1. Org Dispatch Mode: if NO_WHATSAPP, WhatsApp is completely disabled.
 * 2. Vendor Override: if vendor specifies a content preference, it takes precedence over org default format.
 */
export function resolveWhatsappPreferences(params: {
  orgDispatchMode?: string | null;
  orgContentFormat?: string | null;
  vendorPreference?: string | null;
  vendorDeliveryMethod?: string | null;
}): {
  dispatchMode: EffectiveWhatsappDispatchMode;
  contentFormat: EffectiveWhatsappContentFormat;
  isGloballyDisabled: boolean;
} {
  const orgMode = (params.orgDispatchMode || "WEB_LINK_POPUP") as EffectiveWhatsappDispatchMode;
  
  // If Organization set to NO_WHATSAPP, it acts as a global master mute
  if (orgMode === "NO_WHATSAPP") {
    return {
      dispatchMode: "NO_WHATSAPP",
      contentFormat: "TEXT_AND_PDF_LINK",
      isGloballyDisabled: true,
    };
  }

  // If vendor specifically chooses non-whatsapp delivery method (e.g. EMAIL, MANUAL)
  if (params.vendorDeliveryMethod && params.vendorDeliveryMethod !== "WHATSAPP") {
    return {
      dispatchMode: "NO_WHATSAPP",
      contentFormat: "TEXT_AND_PDF_LINK",
      isGloballyDisabled: true,
    };
  }

  // Vendor format override takes precedence over org format default
  const effectiveFormat = (
    params.vendorPreference ||
    params.orgContentFormat ||
    "TEXT_AND_PDF_LINK"
  ) as EffectiveWhatsappContentFormat;

  return {
    dispatchMode: orgMode,
    contentFormat: effectiveFormat,
    isGloballyDisabled: false,
  };
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
        .filter(l => Number(l.orderedQuantity || 0) > 0)
        .map(l => `${l.itemName || "Item"} - ${l.orderedQuantity || 0} ${l.unitOfMeasure || ""}`.trim())
        .join("\n")
    : "";

  let text = "";

  const effectiveFormat = params.poWhatsappPreference || params.orgWhatsappContentFormat || "TEXT_AND_PDF_LINK";

  if (params.whatsappPoTemplate) {
    text = params.whatsappPoTemplate
      .replace(/{poId}/g, poNum)
      .replace(/{amount}/g, amountFormatted)
      .replace(/{items?}/g, itemsList)
      .replace(/{link}/g, publicUrl);
  } else if (effectiveFormat === "TEXT_ONLY") {
    text = `Hello, please find Purchase Order #${poNum} for ${amountFormatted}.${itemsList ? `\n\nItems:\n${itemsList}` : ""}`;
  } else if (effectiveFormat === "PDF_LINK_ONLY") {
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
