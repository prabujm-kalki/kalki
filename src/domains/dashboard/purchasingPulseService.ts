import { db } from "@/db";
import { purchaseOrders, spotPurchases } from "@/db/schema";
import { eq, and, sql, gte, lte } from "drizzle-orm";
import { DashboardScopeContext, PurchasingPulseData } from "./types";
import { resolveDateRange } from "./dateRangeResolver";

export async function getPurchasingPulse(context: DashboardScopeContext): Promise<PurchasingPulseData> {
  const { organizationId, locationId, dateRangePreset, fromDate, toDate } = context;

  const defaultResult: PurchasingPulseData = {
    pendingPoCount: 0,
    pendingSpotPurchasesCount: 0,
  };

  if (!organizationId) return defaultResult;

  try {
    const range = resolveDateRange(dateRangePreset, fromDate, toDate);

    const poFilters = [
      eq(purchaseOrders.organizationId, organizationId),
      eq(purchaseOrders.status, "PENDING"),
      gte(purchaseOrders.createdAt, range.fromDateTime),
      lte(purchaseOrders.createdAt, range.toDateTime),
    ];
    if (locationId && locationId !== "ALL") {
      poFilters.push(eq(purchaseOrders.locationId, locationId));
    }

    const [poCountRes] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(purchaseOrders)
      .where(and(...poFilters));

    const spotFilters = [
      eq(spotPurchases.organizationId, organizationId),
      eq(spotPurchases.auditStatus, "PENDING_AUDIT"),
      gte(spotPurchases.createdAt, range.fromDateTime),
      lte(spotPurchases.createdAt, range.toDateTime),
    ];
    if (locationId && locationId !== "ALL") {
      spotFilters.push(eq(spotPurchases.locationId, locationId));
    }

    const [spotCountRes] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(spotPurchases)
      .where(and(...spotFilters));

    return {
      pendingPoCount: poCountRes?.count || 0,
      pendingSpotPurchasesCount: spotCountRes?.count || 0,
    };
  } catch (err) {
    console.error("Error fetching getPurchasingPulse:", err);
    return defaultResult;
  }
}
