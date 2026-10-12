"use server";

import { db } from "@/db";
import { marketingCampaigns, marketingAutomations, kuabTasks } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

/**
 * Kill switch: pause or resume active marketing campaign workers
 */
export async function toggleCampaignStatus(
  campaignId: string,
  newStatus: "RUNNING" | "PAUSED" | "CANCELLED"
) {
  try {
    await db
      .update(marketingCampaigns)
      .set({
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(marketingCampaigns.id, campaignId));

    revalidatePath("/marketing/dashboard");
    revalidatePath("/marketing/campaigns");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update campaign status" };
  }
}

/**
 * Marketing Automations Server Actions
 */
export async function toggleAutomationStatus(
  automationId: string,
  newStatus: "ACTIVE" | "PAUSED"
) {
  try {
    await db
      .update(marketingAutomations)
      .set({
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(marketingAutomations.id, automationId));

    revalidatePath("/marketing/automations");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to toggle automation status" };
  }
}

export async function createMarketingAutomation(params: {
  organizationId: string;
  locationId?: string;
  name: string;
  triggerType: string;
  channel?: string;
  templateName?: string;
  dripDelayMinutes?: number;
  targetSegment?: string;
  excludeIfMessagedInDays?: number;
}) {
  try {
    const {
      organizationId,
      locationId,
      name,
      triggerType,
      channel = "WHATSAPP",
      templateName,
      dripDelayMinutes = 0,
      targetSegment = "ALL",
      excludeIfMessagedInDays = 7,
    } = params;

    const [created] = await db
      .insert(marketingAutomations)
      .values({
        organizationId,
        locationId: locationId || null,
        name,
        triggerType,
        channel,
        templateName: templateName || null,
        dripDelayMinutes,
        status: "ACTIVE",
        targetSegment,
        exclusionRules: { excludeIfMessagedInDays },
      })
      .returning();

    // Register into KUAB task scheduler for autonomous periodic execution
    await db.insert(kuabTasks).values({
      organizationId,
      title: `Marketing Drip Worker: ${name}`,
      description: `Trigger: ${triggerType} - Delay: ${dripDelayMinutes}m - Segment: ${targetSegment}`,
      status: "PENDING",
      dueDate: new Date(Date.now() + dripDelayMinutes * 60 * 1000),
      metadata: {
        automationId: created.id,
        triggerType,
        targetSegment,
        dripDelayMinutes,
        excludeIfMessagedInDays,
      },
    });

    revalidatePath("/marketing/automations");
    return { success: true, automation: created };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to create automation" };
  }
}
