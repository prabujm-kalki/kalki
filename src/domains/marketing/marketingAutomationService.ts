"use server";

import { db } from "@/db";
import { marketingCampaigns, marketingAutomations, kuabTasks, marketingTemplates, marketingTemplateAudiences } from "@/db/schema";
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

/**
 * Lifecycle Marketing Workflow Actions (Dynamic Lists Drip Engine)
 */
export async function createLifecycleAutomationWorkflow(params: {
  organizationId: string;
  locationId?: string | null;
  name: string;
  triggerRule: string; // 'DORMANT_VIPS', 'AOV_DROPS', 'CRITICAL_DEBTORS', etc.
  cycleDurationWeeks: number; // e.g., 1, 2, 3, 4
  scheduleCron?: string; // e.g., "0 9 * * 1"
  metaTemplateName?: string; // WhatsApp template to be sent
}) {
  try {
    const {
      organizationId,
      locationId,
      name,
      triggerRule,
      cycleDurationWeeks = 3,
      scheduleCron = "0 9 * * 1",
      metaTemplateName,
    } = params;

    const [created] = await db
      .insert(marketingTemplates)
      .values({
        organizationId,
        locationId: locationId || null,
        targetEntityType: "CUSTOMER",
        name: metaTemplateName ? `${name} [${metaTemplateName}]` : name,
        cycleDurationWeeks,
        status: "ACTIVE",
        isAutomated: true,
        triggerRule,
        scheduleCron,
      })
      .returning();

    // Register recurring worker heartbeat task into KUAB
    await db.insert(kuabTasks).values({
      organizationId,
      title: `KUAB Drip Sync: ${created.name}`,
      description: `Rule: ${triggerRule} | Cycle: ${cycleDurationWeeks}w | Schedule: ${scheduleCron}`,
      status: "PENDING",
      dueDate: new Date(Date.now() + 60 * 60 * 1000),
      metadata: {
        templateId: created.id,
        triggerRule,
        cycleDurationWeeks,
        scheduleCron,
      },
    });

    revalidatePath("/marketing/automations");
    revalidatePath("/crm/intelligence");
    return { success: true, workflow: created };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to create workflow" };
  }
}

export async function toggleLifecycleAutomationWorkflow(
  templateId: string,
  newStatus: "ACTIVE" | "PAUSED"
) {
  try {
    await db
      .update(marketingTemplates)
      .set({
        status: newStatus,
      })
      .where(eq(marketingTemplates.id, templateId));

    revalidatePath("/marketing/automations");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to toggle workflow status" };
  }
}

export async function deleteLifecycleAutomationWorkflow(templateId: string) {
  try {
    // Delete audience links first, then template
    await db
      .delete(marketingTemplateAudiences)
      .where(eq(marketingTemplateAudiences.templateId, templateId));

    await db
      .delete(marketingTemplates)
      .where(eq(marketingTemplates.id, templateId));

    revalidatePath("/marketing/automations");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to delete workflow" };
  }
}
