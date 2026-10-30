"use server";

import { db } from "@/db";
import { organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { PricingTierSettingsConfig, DEFAULT_PRICING_CONFIG } from "./pricing-types";

export type { PricingTierSettingsConfig };

export async function getPricingTierSettings(orgId: string): Promise<PricingTierSettingsConfig> {
  if (!orgId) return DEFAULT_PRICING_CONFIG;
  try {
    const org = await db
      .select({
        pricingTierSettings: organizations.pricingTierSettings,
        quotationSettings: organizations.quotationSettings,
      })
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);

    if (org.length > 0) {
      if (org[0].pricingTierSettings && typeof org[0].pricingTierSettings === "object") {
        return {
          ...DEFAULT_PRICING_CONFIG,
          ...(org[0].pricingTierSettings as any),
          pricingTiers: {
            ...DEFAULT_PRICING_CONFIG.pricingTiers,
            ...((org[0].pricingTierSettings as any)?.pricingTiers || {}),
          },
        };
      }
      // Fallback migration: check if quotationSettings had pricing config
      const quoteSettings = org[0].quotationSettings as any;
      if (quoteSettings?.pricingTiers || quoteSettings?.multiPricingEnabled !== undefined) {
        return {
          multiPricingEnabled: quoteSettings.multiPricingEnabled ?? true,
          defaultPricingTier: quoteSettings.defaultPricingTier || "tier1",
          pricingTiers: {
            tier1: quoteSettings.pricingTiers?.tier1 || DEFAULT_PRICING_CONFIG.pricingTiers.tier1,
            tier2: quoteSettings.pricingTiers?.tier2 || DEFAULT_PRICING_CONFIG.pricingTiers.tier2,
            tier3: quoteSettings.pricingTiers?.tier3 || DEFAULT_PRICING_CONFIG.pricingTiers.tier3,
            tier4: quoteSettings.pricingTiers?.tier4 || DEFAULT_PRICING_CONFIG.pricingTiers.tier4,
          },
        };
      }
    }
    return DEFAULT_PRICING_CONFIG;
  } catch (error) {
    console.error("Failed to get pricing tier settings:", error);
    return DEFAULT_PRICING_CONFIG;
  }
}

export async function updatePricingTierSettings(orgId: string, settings: PricingTierSettingsConfig) {
  if (!orgId) return { success: false, error: "Missing Organization ID" };
  try {
    await db
      .update(organizations)
      .set({
        pricingTierSettings: settings,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, orgId));

    revalidatePath("/settings/master-data");
    revalidatePath("/purchasing/purchase-orders/create");
    revalidatePath("/sales/quotations/new");

    return { success: true };
  } catch (error) {
    console.error("Failed to update pricing tier settings:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update pricing tier settings",
    };
  }
}
