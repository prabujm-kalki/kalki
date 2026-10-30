"use server";

import { db } from "@/db";
import { organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export interface QuotationSettingsConfig {
  defaultValidityDays: number;
  defaultPaymentTerms: string;
  defaultNotes: string;
  defaultTermsAndConditions: string;
  whatsappDispatchMode?: "NO_WHATSAPP" | "API_AUTOMATED" | "WEB_LINK_POPUP";
}

const DEFAULT_CONFIG: QuotationSettingsConfig = {
  defaultValidityDays: 15,
  defaultPaymentTerms: "Payment within 15 days of invoice",
  defaultNotes: "Thank you for your business inquiry!",
  defaultTermsAndConditions: "1. Goods once sold will be accepted under warranty policy.\n2. Rates quoted are valid until the validity date specified.\n3. Taxes as applicable at time of invoicing.",
  whatsappDispatchMode: "WEB_LINK_POPUP",
};

export async function getQuotationSettings(orgId: string): Promise<QuotationSettingsConfig> {
  if (!orgId) return DEFAULT_CONFIG;
  try {
    const org = await db
      .select({
        quotationSettings: organizations.quotationSettings,
        whatsappDispatchMode: organizations.whatsappDispatchMode,
      })
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);

    if (org.length > 0) {
      const mode = (org[0].whatsappDispatchMode as any) || "WEB_LINK_POPUP";
      if (org[0].quotationSettings) {
        return {
          ...DEFAULT_CONFIG,
          whatsappDispatchMode: mode,
          ...(org[0].quotationSettings as any),
        };
      }
      return {
        ...DEFAULT_CONFIG,
        whatsappDispatchMode: mode,
      };
    }
    return DEFAULT_CONFIG;
  } catch (error) {
    console.error("Failed to get quotation settings:", error);
    return DEFAULT_CONFIG;
  }
}

export async function updateQuotationSettings(orgId: string, settings: QuotationSettingsConfig) {
  if (!orgId) return { success: false, error: "Missing Organization ID" };
  try {
    const { whatsappDispatchMode, ...restSettings } = settings;

    const updatePayload: any = {
      quotationSettings: restSettings,
    };
    if (whatsappDispatchMode) {
      updatePayload.whatsappDispatchMode = whatsappDispatchMode;
    }

    await db
      .update(organizations)
      .set(updatePayload)
      .where(eq(organizations.id, orgId));

    try {
      revalidatePath("/sales/settings/quotations");
      revalidatePath("/sales/quotations/new");
    } catch (e) {}

    return { success: true };
  } catch (error: any) {
    console.error("Failed to update quotation settings:", error);
    return { success: false, error: error.message || "Database error" };
  }
}

