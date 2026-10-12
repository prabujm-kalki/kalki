"use server";

import { db } from "@/db";
import { marketingCampaigns, campaignAudiences, customers, crmCustomerProfiles } from "@/db/schema";
import { eq, sql, inArray, and, ilike } from "drizzle-orm";
import { sendWhatsAppTemplate } from "@/lib/whatsapp";
import { revalidatePath } from "next/cache";

export interface LaunchCampaignParams {
  organizationId: string;
  locationId?: string | null;
  name: string;
  templateName: string;
  templateLanguage?: string;
  channel?: string;
  audienceType: "ALL_CUSTOMERS" | "CUSTOM_LIST";
  customNumbers?: string[];
  templateParams?: string[];
}

export interface LaunchCampaignResult {
  success: boolean;
  campaignId?: string;
  totalRecipients?: number;
  sentCount?: number;
  failedCount?: number;
  estimatedApiCost?: string;
  error?: string;
}

// Meta WhatsApp standard marketing conversation cost in INR
const ESTIMATED_COST_PER_MSG = 0.86;

/**
 * Server Action: launchMarketingCampaign
 * 
 * 1. Creates parent marketing_campaigns record (status: 'RUNNING', launchedAt: now).
 * 2. Populates campaign_audiences ledger based on audienceType:
 *    - ALL_CUSTOMERS: Queries customer database for 10+ digit phones.
 *    - CUSTOM_LIST: Sanitizes provided phone list.
 * 3. Dispatches Meta pre-approved WhatsApp templates to each audience member.
 * 4. Records metaMessageId, delivery_status: 'SENT', sentAt: now (or 'FAILED' on error).
 * 5. Atomically increments sentCount/failedCount and sets status to 'COMPLETED'.
 * 6. Calculates estimatedApiCost (sentCount * ₹0.86).
 */
export async function launchMarketingCampaign(
  params: LaunchCampaignParams
): Promise<LaunchCampaignResult> {
  try {
    const {
      organizationId,
      locationId,
      name,
      templateName,
      templateLanguage = "en_US",
      channel = "WHATSAPP",
      audienceType,
      customNumbers,
      templateParams = [],
    } = params;

    if (!organizationId || !name || !templateName) {
      return { success: false, error: "organizationId, name, and templateName are required." };
    }

    // 1. Resolve Target Recipients
    let audienceList: Array<{ customerId?: string | null; phone: string; name?: string }> = [];

    if (audienceType === "CUSTOM_LIST" && customNumbers && Array.isArray(customNumbers)) {
      const sanitized = customNumbers
        .map((p) => p.trim().replace(/\D/g, ""))
        .filter((p) => p.length >= 10);
      
      const uniquePhones = Array.from(new Set(sanitized));
      
      // Optionally try matching customerId if phone exists in DB
      let customerPhoneMap = new Map<string, string>();
      if (uniquePhones.length > 0) {
        const matchedCusts = await db
          .select({ id: customers.id, phone: customers.phone })
          .from(customers)
          .where(eq(customers.organizationId, organizationId));
        
        for (const c of matchedCusts) {
          if (c.phone) {
            const clean = c.phone.replace(/\D/g, "").slice(-10);
            customerPhoneMap.set(clean, c.id);
          }
        }
      }

      audienceList = uniquePhones.map((p) => ({
        customerId: customerPhoneMap.get(p.slice(-10)) || null,
        phone: p,
      }));
    } else {
      // ALL_CUSTOMERS mode
      let custsQuery = db
        .select({
          id: customers.id,
          phone: customers.phone,
          name: customers.name,
        })
        .from(customers);

      let custs: { id: string; phone: string | null; name: string | null }[];

      if (locationId && locationId !== "ALL") {
        custs = await custsQuery
          .innerJoin(crmCustomerProfiles, eq(customers.id, crmCustomerProfiles.customerId))
          .where(
            and(
              eq(customers.organizationId, organizationId),
              eq(crmCustomerProfiles.preferredLocationId, locationId)
            )
          );
      } else {
        custs = await custsQuery.where(eq(customers.organizationId, organizationId));
      }

      const validCusts = custs.filter(
        (c) => c.phone && c.phone.trim().replace(/\D/g, "").length >= 10
      );

      // Deduplicate by 10-digit normalized phone number
      const seenPhones = new Set<string>();
      for (const c of validCusts) {
        const clean = c.phone!.trim().replace(/\D/g, "").slice(-10);
        if (!seenPhones.has(clean)) {
          seenPhones.add(clean);
          audienceList.push({
            customerId: c.id,
            phone: c.phone!.trim(),
            name: c.name || undefined,
          });
        }
      }
    }

    if (audienceList.length === 0) {
      return {
        success: false,
        error: "No valid recipient phone numbers found for the selected audience.",
      };
    }

    // 2. Prevent duplicate campaign names within the same organization
    const existingName = await db
      .select({ id: marketingCampaigns.id })
      .from(marketingCampaigns)
      .where(
        and(
          eq(marketingCampaigns.organizationId, organizationId),
          ilike(marketingCampaigns.name, name.trim())
        )
      )
      .limit(1);

    if (existingName.length > 0) {
      return {
        success: false,
        error: `A campaign with the name "${name.trim()}" already exists. Please choose a unique name or add a date/batch identifier (e.g. "${name.trim()} - Part 2").`,
      };
    }

    // 3. Create Parent Campaign Record
    const [campaign] = await db
      .insert(marketingCampaigns)
      .values({
        organizationId,
        locationId: locationId || null,
        name,
        channel,
        templateName,
        templateLanguage,
        status: "RUNNING",
        totalRecipients: audienceList.length,
        sentCount: 0,
        deliveredCount: 0,
        readCount: 0,
        failedCount: 0,
        launchedAt: new Date(),
      })
      .returning();

    // 3. Dispatch Batch to Meta WhatsApp & Log Granular Audiences
    let sentCount = 0;
    let failedCount = 0;

    for (const recipient of audienceList) {
      const now = new Date();
      try {
        // hello_world template accepts NO parameters; only pass params if explicitly configured
        const paramsToSend =
          templateName === "hello_world"
            ? []
            : templateParams && templateParams.length > 0
            ? templateParams.map((p) => (p === "{{name}}" && recipient.name ? recipient.name : p))
            : [];

        const sendResult = await sendWhatsAppTemplate(
          recipient.phone,
          templateName,
          paramsToSend,
          organizationId,
          templateLanguage
        );

        if (sendResult.success && sendResult.messageId) {
          sentCount++;
          await db.insert(campaignAudiences).values({
            campaignId: campaign.id,
            customerId: recipient.customerId || null,
            recipientPhone: recipient.phone,
            metaMessageId: sendResult.messageId,
            deliveryStatus: "SENT",
            sentAt: now,
          });
        } else {
          failedCount++;
          await db.insert(campaignAudiences).values({
            campaignId: campaign.id,
            customerId: recipient.customerId || null,
            recipientPhone: recipient.phone,
            deliveryStatus: "FAILED",
            errorMessage: sendResult.error || "Dispatch failed",
            sentAt: now,
          });
        }
      } catch (dispatchErr: any) {
        failedCount++;
        await db.insert(campaignAudiences).values({
          campaignId: campaign.id,
          customerId: recipient.customerId || null,
          recipientPhone: recipient.phone,
          deliveryStatus: "FAILED",
          errorMessage: dispatchErr?.message || "Execution exception",
          sentAt: now,
        });
      }
    }

    // 4. Calculate Financial Metrics & Complete Campaign
    const estimatedApiCostVal = (sentCount * ESTIMATED_COST_PER_MSG).toFixed(2);

    await db
      .update(marketingCampaigns)
      .set({
        status: "COMPLETED",
        sentCount,
        failedCount,
        estimatedApiCost: estimatedApiCostVal,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(marketingCampaigns.id, campaign.id));

    revalidatePath("/marketing");
    revalidatePath("/marketing/campaigns");

    return {
      success: true,
      campaignId: campaign.id,
      totalRecipients: audienceList.length,
      sentCount,
      failedCount,
      estimatedApiCost: estimatedApiCostVal,
    };
  } catch (error: any) {
    console.error("[launchMarketingCampaign Error]:", error);
    return { success: false, error: error.message || "Failed to launch campaign" };
  }
}
