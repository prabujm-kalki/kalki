import { db } from "@/db";
import { organizations, whatsappCommunications } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * WhatsApp Cloud API Client
 * Meta Graph API Integration for Kalki BOS
 */

interface SendWhatsAppTemplateResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  status?: number;
}

/**
 * Resolves WhatsApp credentials:
 * 1. From organization configuration in DB (if organizationId provided)
 * 2. Otherwise from environment variables
 */
export async function getWhatsAppCredentials(organizationId?: string): Promise<{
  phoneNumberId?: string;
  businessAccountId?: string;
  apiToken?: string;
}> {
  if (organizationId) {
    try {
      const orgs = await db
        .select({ whatsappConfig: organizations.whatsappConfig })
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1);

      const cfg: any = orgs[0]?.whatsappConfig;
      if (cfg?.phoneNumberId && cfg?.apiToken) {
        return {
          phoneNumberId: cfg.phoneNumberId.trim(),
          businessAccountId: (cfg.businessAccountId || cfg.wabaId || "").trim() || undefined,
          apiToken: cfg.apiToken.trim(),
        };
      }
    } catch (e) {
      console.error("[WhatsApp] Error fetching org credentials:", e);
    }
  }

  // Fallback: check environment or default organization
  if (process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_API_TOKEN) {
    return {
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
      businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
      apiToken: process.env.WHATSAPP_API_TOKEN,
    };
  }

  try {
    const orgs = await db
      .select({ id: organizations.id, whatsappConfig: organizations.whatsappConfig })
      .from(organizations);

    for (const org of orgs) {
      const cfg: any = org?.whatsappConfig;
      if (cfg?.phoneNumberId && cfg?.apiToken) {
        return {
          phoneNumberId: cfg.phoneNumberId.trim(),
          businessAccountId: (cfg.businessAccountId || cfg.wabaId || "").trim() || undefined,
          apiToken: cfg.apiToken.trim(),
        };
      }
    }
  } catch (e) {}

  return {};
}

/**
 * Normalizes mobile number to E.164 without '+' or leading zeros
 * e.g., "9842771993" -> "919842771993" (defaulting to India country code 91 if 10 digits)
 */
export function formatWhatsAppMobile(mobileNumber: string, defaultCountryCode: string = "91"): string {
  // Strip all non-digit characters
  let cleaned = mobileNumber.replace(/\D/g, "");

  // Remove leading 0s
  cleaned = cleaned.replace(/^0+/, "");

  // If 10 digits (standard Indian mobile), prepend 91
  if (cleaned.length === 10) {
    return `${defaultCountryCode}${cleaned}`;
  }

  return cleaned;
}

/**
 * Sends a pre-approved WhatsApp message template using the Meta Cloud API.
 * 
 * @param mobileNumber Destination mobile number
 * @param templateName Meta pre-approved template name
 * @param parameters Optional positional text body parameters for variables ({{1}}, {{2}}, ...)
 * @param organizationId Optional organization ID to use tenant-specific credentials
 * @returns Result object with delivery status and message id or error
 */
export async function sendWhatsAppTemplate(
  mobileNumber: string,
  templateName: string,
  parameters: string[] = [],
  organizationId?: string,
  languageCode?: string
): Promise<SendWhatsAppTemplateResponse> {
  const { phoneNumberId, apiToken: token } = await getWhatsAppCredentials(organizationId);

  if (!token || !phoneNumberId) {
    console.warn(
      "[WhatsApp API] Missing WhatsApp Phone Number ID or Access Token. Message delivery skipped."
    );
    return {
      success: false,
      error: "WhatsApp API credentials are not configured in Settings > General Settings.",
    };
  }

  const recipient = formatWhatsAppMobile(mobileNumber);

  if (!recipient || recipient.length < 10) {
    console.warn(`[WhatsApp API] Invalid destination mobile number provided: '${mobileNumber}'`);
    return {
      success: false,
      error: `Invalid phone number format: ${mobileNumber}`,
    };
  }

  const endpoint = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;

  // Build template components if parameters are supplied
  const components: any[] = [];
  if (parameters && parameters.length > 0) {
    components.push({
      type: "body",
      parameters: parameters.map((param) => ({
        type: "text",
        text: String(param),
      })),
    });
  }

  // Meta Cloud API's default 'hello_world' template is registered under 'en_US'
  const resolvedLang = languageCode || (templateName === "hello_world" ? "en_US" : "en");

  const payload: any = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipient,
    type: "template",
    template: {
      name: templateName,
      language: {
        code: resolvedLang,
      },
      ...(components.length > 0 ? { components } : {}),
    },
  };

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMessage =
        data?.error?.message ||
        data?.error?.error_user_msg ||
        `HTTP ${response.status} ${response.statusText}`;
      console.error(`[WhatsApp API Error] (${recipient}):`, errorMessage, data);
      return {
        success: false,
        error: errorMessage,
        status: response.status,
      };
    }

    const messageId = data?.messages?.[0]?.id;

    // Automatically record outbound message in whatsappCommunications ledger
    if (messageId) {
      try {
        const orgId = organizationId || (await db.select({ id: organizations.id }).from(organizations).limit(1))[0]?.id;
        if (orgId) {
          await db
            .insert(whatsappCommunications)
            .values({
              organizationId: orgId,
              metaMessageId: messageId,
              direction: "OUTBOUND",
              status: "SENT",
              messageType: "template",
              content: `[Template: ${templateName}] ${parameters.join(", ")}`,
              senderNumber: phoneNumberId,
              recipientNumber: recipient,
            })
            .onConflictDoNothing();
        }
      } catch (logErr) {
        console.error("[WhatsApp] Failed to record outbound template communication:", logErr);
      }
    }

    return {
      success: true,
      messageId,
      status: response.status,
    };
  } catch (err: any) {
    // Graceful error handling to ensure background runner and main thread never crash
    console.error(`[WhatsApp API Network/Execution Error] (${recipient}):`, err?.message || err);
    return {
      success: false,
      error: err?.message || "Unknown network error during WhatsApp dispatch",
    };
  }
}

/**
 * Sends a standard free-form WhatsApp text message (during open 24hr service window)
 */
export async function sendWhatsAppTextMessage(
  mobileNumber: string,
  messageText: string,
  organizationId?: string
): Promise<SendWhatsAppTemplateResponse> {
  const { phoneNumberId, apiToken: token } = await getWhatsAppCredentials(organizationId);

  if (!token || !phoneNumberId) {
    return {
      success: false,
      error: "WhatsApp API credentials are not configured in Settings > General Settings.",
    };
  }

  const recipient = formatWhatsAppMobile(mobileNumber);
  if (!recipient || recipient.length < 10) {
    return { success: false, error: `Invalid phone number format: ${mobileNumber}` };
  }

  const endpoint = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipient,
    type: "text",
    text: { preview_url: false, body: messageText },
  };

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const errMsg = data?.error?.message || `HTTP ${response.status} ${response.statusText}`;
      return { success: false, error: errMsg, status: response.status };
    }

    const messageId = data?.messages?.[0]?.id;
    if (messageId) {
      try {
        const orgId = organizationId || (await db.select({ id: organizations.id }).from(organizations).limit(1))[0]?.id;
        if (orgId) {
          await db
            .insert(whatsappCommunications)
            .values({
              organizationId: orgId,
              metaMessageId: messageId,
              direction: "OUTBOUND",
              status: "SENT",
              messageType: "text",
              content: messageText,
              senderNumber: phoneNumberId,
              recipientNumber: recipient,
            })
            .onConflictDoNothing();
        }
      } catch (logErr) {}
    }

    return { success: true, messageId, status: response.status };
  } catch (err: any) {
    return { success: false, error: err?.message || "Network error" };
  }
}

/* ==========================================================================
   WhatsApp Inbound Webhooks & Events
   ========================================================================== */

export interface WhatsAppWebhookStatus {
  id: string; // wamid message id
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
  recipient_id: string;
  conversation?: {
    id: string;
    expiration_timestamp?: string;
    origin?: { type: string };
  };
  pricing?: {
    billable: boolean;
    pricing_model: string;
    category: string;
  };
  errors?: Array<{
    code: number;
    title: string;
    message?: string;
    error_data?: { details: string };
  }>;
}

export interface WhatsAppWebhookMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  interactive?: {
    type: string;
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string; description?: string };
  };
}

export interface WhatsAppWebhookContact {
  profile?: { name: string };
  wa_id: string;
}

export interface WhatsAppWebhookValue {
  messaging_product: "whatsapp";
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  contacts?: WhatsAppWebhookContact[];
  messages?: WhatsAppWebhookMessage[];
  statuses?: WhatsAppWebhookStatus[];
}

export interface WhatsAppWebhookEntry {
  id: string;
  changes: Array<{
    value: WhatsAppWebhookValue;
    field: string;
  }>;
}

export interface WhatsAppWebhookPayload {
  object: string;
  entry?: WhatsAppWebhookEntry[];
}

/**
 * Validates Meta's Webhook Subscription challenge (GET handshake)
 */
export function verifyWhatsAppWebhook(
  mode: string | null,
  token: string | null,
  challenge: string | null
): { isValid: boolean; challenge?: string } {
  const configuredToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "kalki_wa_webhook_verify_token";

  if (mode === "subscribe" && token === configuredToken && challenge) {
    return { isValid: true, challenge };
  }

  return { isValid: false };
}

/**
 * Validates Meta X-Hub-Signature-256 header if WHATSAPP_APP_SECRET is configured
 */
export async function validateWhatsAppSignature(
  rawBody: string,
  signatureHeader: string | null
): Promise<boolean> {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) {
    // If not configured, pass through (verification handshake token is primary)
    return true;
  }

  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) {
    return false;
  }

  try {
    const crypto = await import("crypto");
    const signature = signatureHeader.substring(7);
    const expectedSignature = crypto
      .createHmac("sha256", appSecret)
      .update(rawBody, "utf8")
      .digest("hex");

    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  } catch (err) {
    console.error("[WhatsApp Webhook] Signature validation error:", err);
    return false;
  }
}

/**
 * Standard parser for WhatsApp webhook incoming payloads
 */
export function parseWhatsAppWebhookEvents(payload: WhatsAppWebhookPayload) {
  const statuses: WhatsAppWebhookStatus[] = [];
  const messages: Array<{
    message: WhatsAppWebhookMessage;
    contactName?: string;
    phoneNumberId: string;
  }> = [];

  if (payload.object !== "whatsapp_business_account" || !Array.isArray(payload.entry)) {
    return { statuses, messages };
  }

  for (const entry of payload.entry) {
    for (const change of entry.changes || []) {
      if (change.field === "messages" && change.value) {
        const val = change.value;
        const phoneNumberId = val.metadata?.phone_number_id || "";

        // Status updates (sent, delivered, read, failed)
        if (Array.isArray(val.statuses)) {
          statuses.push(...val.statuses);
        }

        // Incoming messages
        if (Array.isArray(val.messages)) {
          const contactMap = new Map<string, string>();
          for (const c of val.contacts || []) {
            if (c.profile?.name) {
              contactMap.set(c.wa_id, c.profile.name);
            }
          }

          for (const msg of val.messages) {
            messages.push({
              message: msg,
              contactName: contactMap.get(msg.from),
              phoneNumberId,
            });
          }
        }
      }
    }
  }

  return { statuses, messages };
}

