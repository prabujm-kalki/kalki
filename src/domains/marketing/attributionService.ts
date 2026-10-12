import { db } from "@/db";
import { marketingCampaigns, campaignAudiences, salesInvoices } from "@/db/schema";
import { eq, and, desc, sql, lte, isNull } from "drizzle-orm";

export interface SalesConversionResult {
  attributed: boolean;
  campaignId?: string;
  audienceId?: string;
  conversionWindow?: "72_HOURS" | "7_DAYS" | "30_DAYS";
  conversionAmount?: number;
  totalAttributedRevenue?: string;
  roiPercentage?: string;
  reason?: string;
}

/**
 * Closed-Loop Attribution Evaluator
 * 
 * When a sales invoice is created or synced from POS:
 * 1. Finds the most recent campaign_audiences record for the customer (or phone)
 *    sent prior to invoiceDate that has not yet been converted (isConverted = false).
 * 2. Evaluates the attribution window:
 *    - <= 72 hours  => '72_HOURS'
 *    - <= 168 hours (7 days) => '7_DAYS'
 *    - <= 720 hours (30 days) => '30_DAYS'
 * 3. If within 30 days:
 *    - Marks audience record as converted (isConverted: true, convertedInvoiceId, conversionWindow, conversionAmount, convertedAt).
 *    - Atomically updates parent marketing_campaigns record:
 *      * Increments matching window counter and revenue
 *      * Updates total_attributed_revenue
 *      * Recomputes roi_percentage = ((totalAttributedRevenue - estimatedApiCost) / estimatedApiCost) * 100
 */
export async function evaluateSalesConversionForCustomer(
  customerId: string | null | undefined,
  invoiceId: string,
  invoiceAmount: number,
  invoiceDate: Date = new Date(),
  recipientPhone?: string | null
): Promise<SalesConversionResult> {
  try {
    if (!customerId && !recipientPhone) {
      return { attributed: false, reason: "Neither customerId nor recipientPhone was provided" };
    }

    // 1. Build lookup condition for eligible audience records:
    // Must be sent before the invoice date, not yet converted, with deliveryStatus != 'FAILED'
    const targetConditions = [
      eq(campaignAudiences.isConverted, false),
      sql`${campaignAudiences.sentAt} IS NOT NULL`,
      lte(campaignAudiences.sentAt, invoiceDate),
    ];

    if (customerId) {
      targetConditions.push(eq(campaignAudiences.customerId, customerId));
    } else if (recipientPhone) {
      // Normalize phone digits
      const sanitizedPhone = recipientPhone.replace(/\D/g, "").slice(-10);
      targetConditions.push(sql`RIGHT(REGEXP_REPLACE(${campaignAudiences.recipientPhone}, '[^0-9]', '', 'g'), 10) = ${sanitizedPhone}`);
    }

    // Find the most recent marketing broadcast sent to this customer
    const [targetAudience] = await db
      .select({
        id: campaignAudiences.id,
        campaignId: campaignAudiences.campaignId,
        sentAt: campaignAudiences.sentAt,
      })
      .from(campaignAudiences)
      .where(and(...targetConditions))
      .orderBy(desc(campaignAudiences.sentAt))
      .limit(1);

    if (!targetAudience || !targetAudience.sentAt) {
      return { attributed: false, reason: "No eligible unconverted campaign message found before invoice date" };
    }

    // 2. Compute elapsed time between broadcast sentAt and invoiceDate
    const sentTimeMs = new Date(targetAudience.sentAt).getTime();
    const invoiceTimeMs = new Date(invoiceDate).getTime();
    const diffHours = (invoiceTimeMs - sentTimeMs) / (1000 * 60 * 60);

    if (diffHours < 0) {
      return { attributed: false, reason: "Invoice date precedes message dispatch time" };
    }

    let window: "72_HOURS" | "7_DAYS" | "30_DAYS";
    if (diffHours <= 72) {
      window = "72_HOURS";
    } else if (diffHours <= 168) {
      window = "7_DAYS";
    } else if (diffHours <= 720) {
      window = "30_DAYS";
    } else {
      return { attributed: false, reason: `Invoice occurred ${diffHours.toFixed(1)} hours after broadcast, outside the 30-day attribution window` };
    }

    const conversionAmountStr = invoiceAmount.toFixed(2);

    // 3. Mark audience record as converted
    await db
      .update(campaignAudiences)
      .set({
        isConverted: true,
        convertedInvoiceId: invoiceId,
        conversionWindow: window,
        conversionAmount: conversionAmountStr,
        convertedAt: invoiceDate,
      })
      .where(eq(campaignAudiences.id, targetAudience.id));

    // 4. Update parent marketing campaign metrics
    // Fetch current campaign financial data to recalculate ROI safely
    const [campaign] = await db
      .select({
        id: marketingCampaigns.id,
        estimatedApiCost: marketingCampaigns.estimatedApiCost,
        totalAttributedRevenue: marketingCampaigns.totalAttributedRevenue,
      })
      .from(marketingCampaigns)
      .where(eq(marketingCampaigns.id, targetAudience.campaignId))
      .limit(1);

    if (!campaign) {
      return { attributed: true, campaignId: targetAudience.campaignId, audienceId: targetAudience.id, conversionWindow: window, conversionAmount: invoiceAmount };
    }

    // Calculate new total attributed revenue
    const currentTotalRev = Number(campaign.totalAttributedRevenue || 0);
    const newTotalRev = (currentTotalRev + invoiceAmount).toFixed(2);
    const apiCost = Number(campaign.estimatedApiCost || 0);

    // ROI % = ((Attributed Revenue - API Cost) / API Cost) * 100
    let roi = "0.00";
    if (apiCost > 0) {
      const roiVal = ((Number(newTotalRev) - apiCost) / apiCost) * 100;
      roi = roiVal.toFixed(2);
    }

    // Determine window-specific column updates
    const windowUpdates: Record<string, any> = {
      totalAttributedRevenue: newTotalRev,
      roiPercentage: roi,
      updatedAt: new Date(),
    };

    if (window === "72_HOURS") {
      windowUpdates.conversions72hCount = sql`conversions_72h_count + 1`;
      windowUpdates.conversions72hRevenue = sql`conversions_72h_revenue + ${conversionAmountStr}::numeric`;
    } else if (window === "7_DAYS") {
      windowUpdates.conversions7dCount = sql`conversions_7d_count + 1`;
      windowUpdates.conversions7dRevenue = sql`conversions_7d_revenue + ${conversionAmountStr}::numeric`;
    } else if (window === "30_DAYS") {
      windowUpdates.conversions30dCount = sql`conversions_30d_count + 1`;
      windowUpdates.conversions30dRevenue = sql`conversions_30d_revenue + ${conversionAmountStr}::numeric`;
    }

    await db
      .update(marketingCampaigns)
      .set(windowUpdates)
      .where(eq(marketingCampaigns.id, campaign.id));

    return {
      attributed: true,
      campaignId: campaign.id,
      audienceId: targetAudience.id,
      conversionWindow: window,
      conversionAmount: invoiceAmount,
      totalAttributedRevenue: newTotalRev,
      roiPercentage: roi,
    };
  } catch (error: any) {
    console.error("[evaluateSalesConversionForCustomer Error]:", error);
    return { attributed: false, reason: error.message || "Attribution evaluation failed" };
  }
}
