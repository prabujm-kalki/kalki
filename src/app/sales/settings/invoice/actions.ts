"use server";

import { db } from "@/db";
import { organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { DEFAULT_INVOICE_CONFIG, InvoiceSettingsConfig } from "./constants";

export async function getInvoiceSettings(orgId: string): Promise<InvoiceSettingsConfig> {
  if (!orgId) return DEFAULT_INVOICE_CONFIG;
  try {
    const org = await db
      .select({ invoiceSettings: organizations.invoiceSettings })
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);

    if (org.length > 0 && org[0].invoiceSettings) {
      return {
        ...DEFAULT_INVOICE_CONFIG,
        ...(org[0].invoiceSettings as any),
      };
    }
    return DEFAULT_INVOICE_CONFIG;
  } catch (error) {
    console.error("Failed to get invoice settings:", error);
    return DEFAULT_INVOICE_CONFIG;
  }
}

export async function updateInvoiceSettings(orgId: string, settings: InvoiceSettingsConfig) {
  if (!orgId) return { success: false, error: "Missing Organization ID" };
  try {
    await db
      .update(organizations)
      .set({ invoiceSettings: settings })
      .where(eq(organizations.id, orgId));

    try {
      revalidatePath("/sales/settings/invoice");
      revalidatePath("/sales/invoices/all");
      revalidatePath("/sales/orders/billing");
    } catch (e) {}

    return { success: true };
  } catch (error: any) {
    console.error("Failed to update invoice settings:", error);
    return { success: false, error: error.message || "Database error" };
  }
}
