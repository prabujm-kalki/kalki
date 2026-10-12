"use server";

import { db } from "@/db";
import { salesAlertConfigurations } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { SalesAlertConfigPayload, DEFAULT_SALES_ALERT_CONFIG } from "./types";

export async function getSalesAlertConfig(organizationId: string, locationId?: string | null) {
  if (!organizationId) {
    return DEFAULT_SALES_ALERT_CONFIG;
  }

  try {
    // Check for location-specific or org-wide configuration
    const conditions = [eq(salesAlertConfigurations.organizationId, organizationId)];
    if (locationId && locationId !== "all") {
      conditions.push(eq(salesAlertConfigurations.locationId, locationId));
    } else {
      conditions.push(isNull(salesAlertConfigurations.locationId));
    }

    const [config] = await db
      .select()
      .from(salesAlertConfigurations)
      .where(and(...conditions))
      .limit(1);

    if (config) {
      return {
        id: config.id,
        organizationId: config.organizationId,
        locationId: config.locationId,
        debtorDaysOverdue: Number(config.debtorDaysOverdue),
        newVipMinSpend: Number(config.newVipMinSpend),
        anomalyAovMultiplier: Number(config.anomalyAovMultiplier),
        dormantVipDays: Number(config.dormantVipDays),
        upsellDeficitDropPercentage: Number(config.upsellDeficitDropPercentage),
        concentrationTopCustomersCount: Number(config.concentrationTopCustomersCount),
      };
    }

    // Fallback: If location-specific wasn't found, check org-wide default
    if (locationId && locationId !== "all") {
      const [orgWideConfig] = await db
        .select()
        .from(salesAlertConfigurations)
        .where(
          and(
            eq(salesAlertConfigurations.organizationId, organizationId),
            isNull(salesAlertConfigurations.locationId)
          )
        )
        .limit(1);

      if (orgWideConfig) {
        return {
          id: orgWideConfig.id,
          organizationId: orgWideConfig.organizationId,
          locationId: orgWideConfig.locationId,
          debtorDaysOverdue: Number(orgWideConfig.debtorDaysOverdue),
          newVipMinSpend: Number(orgWideConfig.newVipMinSpend),
          anomalyAovMultiplier: Number(orgWideConfig.anomalyAovMultiplier),
          dormantVipDays: Number(orgWideConfig.dormantVipDays),
          upsellDeficitDropPercentage: Number(orgWideConfig.upsellDeficitDropPercentage),
          concentrationTopCustomersCount: Number(orgWideConfig.concentrationTopCustomersCount),
        };
      }
    }

    return DEFAULT_SALES_ALERT_CONFIG;
  } catch (error) {
    console.error("Failed to fetch sales alert configuration:", error);
    return DEFAULT_SALES_ALERT_CONFIG;
  }
}

export async function upsertSalesAlertConfig(payload: SalesAlertConfigPayload) {
  const {
    organizationId,
    locationId,
    debtorDaysOverdue,
    newVipMinSpend,
    anomalyAovMultiplier,
    dormantVipDays,
    upsellDeficitDropPercentage,
    concentrationTopCustomersCount,
  } = payload;

  if (!organizationId) {
    throw new Error("organizationId is required to configure sales alerts.");
  }

  const normalizedLocationId = locationId && locationId !== "all" ? locationId : null;

  const conditions = [
    eq(salesAlertConfigurations.organizationId, organizationId),
    normalizedLocationId
      ? eq(salesAlertConfigurations.locationId, normalizedLocationId)
      : isNull(salesAlertConfigurations.locationId),
  ];

  const [existing] = await db
    .select({ id: salesAlertConfigurations.id })
    .from(salesAlertConfigurations)
    .where(and(...conditions))
    .limit(1);

  if (existing) {
    await db
      .update(salesAlertConfigurations)
      .set({
        debtorDaysOverdue,
        newVipMinSpend,
        anomalyAovMultiplier: anomalyAovMultiplier.toFixed(2),
        dormantVipDays,
        upsellDeficitDropPercentage: upsellDeficitDropPercentage.toFixed(2),
        concentrationTopCustomersCount,
        updatedAt: new Date(),
      })
      .where(eq(salesAlertConfigurations.id, existing.id));
  } else {
    await db.insert(salesAlertConfigurations).values({
      organizationId,
      locationId: normalizedLocationId,
      debtorDaysOverdue,
      newVipMinSpend,
      anomalyAovMultiplier: anomalyAovMultiplier.toFixed(2),
      dormantVipDays,
      upsellDeficitDropPercentage: upsellDeficitDropPercentage.toFixed(2),
      concentrationTopCustomersCount,
    });
  }

  revalidatePath("/sales/settings/alerts");
  revalidatePath("/sales/reports/customer");

  return { success: true };
}
