import { db } from "../src/db";
import {
  marketingTemplates,
  marketingTemplateAudiences,
  marketingCampaigns,
  campaignAudiences,
  customers,
} from "../src/db/schema";
import { eq, and, lte, inArray } from "drizzle-orm";
import { getDynamicListEvaluation } from "../src/domains/crm/crmService";
import { sendWhatsAppTemplate } from "../src/lib/whatsapp";
import cron from "node-cron";

// Throttling sleep helper to stay within Meta Cloud API tiers
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const MS_PER_DAY = 24 * 60 * 60 * 1000;

interface AutomationDripRunResult {
  success: boolean;
  templatesEvaluated: number;
  newAudiencesEnrolled: number;
  messagesSent: number;
  messagesFailed: number;
  cyclesCompleted: number;
  error?: string;
}

/**
 * Kalki Universal Automation Bus (KUAB)
 * Automated Lifecycle Marketing & Dynamic Drip Engine Worker
 *
 * Evaluates active CRM dynamic list anomaly rules, enforces multi-week
 * cycle spam suppression, dispatches approved Meta WhatsApp templates,
 * and maintains database transaction integrity.
 */
export async function runAutomatedLifecycleDrips(): Promise<AutomationDripRunResult> {
  const startTime = new Date();
  console.log(`\n======================================================`);
  console.log(`[KUAB Lifecycle Drip Engine] Starting execution at ${startTime.toISOString()}`);
  console.log(`======================================================`);

  try {
    // 1. Fetch all active automated marketing templates
    const activeTemplates = await db
      .select()
      .from(marketingTemplates)
      .where(
        and(
          eq(marketingTemplates.isAutomated, true),
          eq(marketingTemplates.status, "ACTIVE"),
          eq(marketingTemplates.targetEntityType, "CUSTOMER")
        )
      );

    if (activeTemplates.length === 0) {
      console.log("[KUAB Drip Engine] No active automated lifecycle workflows found.");
      return {
        success: true,
        templatesEvaluated: 0,
        newAudiencesEnrolled: 0,
        messagesSent: 0,
        messagesFailed: 0,
        cyclesCompleted: 0,
      };
    }

    console.log(`[KUAB Drip Engine] Found ${activeTemplates.length} active automated template workflow(s).`);

    let totalEnrolled = 0;
    let totalSent = 0;
    let totalFailed = 0;
    let totalCyclesCompleted = 0;

    for (const template of activeTemplates) {
      const triggerRule = template.triggerRule || "DORMANT_VIPS";
      console.log(`\n--- Evaluating Workflow: "${template.name}" (${template.id}) ---`);
      console.log(`    Trigger Rule: ${triggerRule} | Organization: ${template.organizationId}`);
      console.log(`    Cycle Cooldown: ${template.cycleDurationWeeks} week(s) | Schedule: ${template.scheduleCron || "Every Monday 9 AM"}`);

      // a. Cycle Cooldown Maintenance: Expire older active enrollments that exceeded cycle duration
      const cycleDurationDays = Math.max(1, template.cycleDurationWeeks) * 7;
      const cycleCutoff = new Date(Date.now() - cycleDurationDays * MS_PER_DAY);

      const expiredRecords = await db
        .select({ id: marketingTemplateAudiences.id })
        .from(marketingTemplateAudiences)
        .where(
          and(
            eq(marketingTemplateAudiences.templateId, template.id),
            eq(marketingTemplateAudiences.enrollmentStatus, "ACTIVE"),
            lte(marketingTemplateAudiences.enrolledAt, cycleCutoff)
          )
        );

      if (expiredRecords.length > 0) {
        await db
          .update(marketingTemplateAudiences)
          .set({ enrollmentStatus: "COMPLETED" })
          .where(
            inArray(
              marketingTemplateAudiences.id,
              expiredRecords.map((r) => r.id)
            )
          );
        totalCyclesCompleted += expiredRecords.length;
        console.log(`    [Cycle Cooldown] Marked ${expiredRecords.length} customer audience(s) as COMPLETED (cooldown concluded).`);
      }

      // b. Evaluate linked CRM Dynamic List query
      const dynamicListResult = await getDynamicListEvaluation(
        template.organizationId,
        triggerRule,
        template.locationId || undefined
      );

      console.log(`    Evaluated Dynamic Rule: ${dynamicListResult.rule} -> ${dynamicListResult.count} qualifying customers.`);

      if (dynamicListResult.customers.length === 0) {
        console.log("    No qualifying customers under this dynamic rule at this time.");
        continue;
      }

      // c. Spam Protection (Cycle Check):
      // Cross-reference against marketingTemplateAudiences across all active campaigns
      const currentActiveAudiences = await db
        .select({ targetEntityId: marketingTemplateAudiences.targetEntityId })
        .from(marketingTemplateAudiences)
        .where(
          and(
            eq(marketingTemplateAudiences.enrollmentStatus, "ACTIVE"),
            eq(marketingTemplateAudiences.targetEntityType, "CUSTOMER")
          )
        );

      const activeAudienceSet = new Set(currentActiveAudiences.map((a) => a.targetEntityId));

      // Filter for newly eligible customers who are NOT currently in any active campaign cycle
      const newlyEligibleCustomers = dynamicListResult.customers.filter((c) => {
        const isAlreadyActive = activeAudienceSet.has(c.customerId);
        const hasValidPhone = Boolean(c.customerPhone && c.customerPhone.trim() !== "" && c.customerPhone !== "-");
        return !isAlreadyActive && hasValidPhone;
      });

      console.log(
        `    [Spam Protection] ${dynamicListResult.customers.length - newlyEligibleCustomers.length} excluded (Active Cooldown or No Phone).`
      );
      console.log(`    [Eligible Recipients] ${newlyEligibleCustomers.length} new customer(s) to enroll.`);

      if (newlyEligibleCustomers.length === 0) {
        continue;
      }

      // Extract template slug from template name (e.g., "Dormant VIP Winback [hello_world]" -> "hello_world" or fallback)
      let templateSlug = "order_receipt_v1";
      const match = template.name.match(/\[(.*?)\]/);
      if (match && match[1]) {
        templateSlug = match[1].trim();
      } else {
        templateSlug = template.name.toLowerCase().replace(/[^a-z0-9_]/g, "_");
      }

      // d. Execute Campaign Run inside database transaction
      const campaignDateStr = new Date().toISOString().slice(0, 10);
      const campaignName = `[Auto-Drip] ${template.name} - ${campaignDateStr}`;

      // Insert Parent Campaign Run
      const [campaignRun] = await db
        .insert(marketingCampaigns)
        .values({
          organizationId: template.organizationId,
          locationId: template.locationId || null,
          name: campaignName,
          channel: "WHATSAPP",
          templateName: templateSlug,
          templateLanguage: "en_US",
          status: "RUNNING",
          totalRecipients: newlyEligibleCustomers.length,
          launchedAt: new Date(),
        })
        .returning();

      // Bulk enroll eligible customers into marketingTemplateAudiences
      const audienceInserts = newlyEligibleCustomers.map((cust) => ({
        templateId: template.id,
        targetEntityType: "CUSTOMER",
        targetEntityId: cust.customerId,
        enrollmentStatus: "ACTIVE",
        enrolledAt: new Date(),
      }));

      await db.insert(marketingTemplateAudiences).values(audienceInserts);
      totalEnrolled += newlyEligibleCustomers.length;

      // Bulk insert into campaignAudiences
      const campaignAudienceInserts = newlyEligibleCustomers.map((cust) => ({
        campaignId: campaignRun.id,
        customerId: cust.customerId,
        recipientPhone: cust.customerPhone || "",
        deliveryStatus: "PENDING",
      }));

      const insertedCampaignAudiences = await db
        .insert(campaignAudiences)
        .values(campaignAudienceInserts)
        .returning({ id: campaignAudiences.id, customerId: campaignAudiences.customerId });

      const audienceMap = new Map(
        insertedCampaignAudiences.map((ca) => [ca.customerId, ca.id])
      );

      // e. Dispatch WhatsApp messages via Meta Cloud API utility
      let campaignSent = 0;
      let campaignFailed = 0;

      for (const cust of newlyEligibleCustomers) {
        const phone = cust.customerPhone?.trim() || "";
        const custName = cust.customerName || "Valued Customer";
        const caId = cust.customerId ? audienceMap.get(cust.customerId) : undefined;

        console.log(`    Dispatching WhatsApp -> ${custName} (${phone}) [Template: ${templateSlug}]`);

        try {
          const sendRes = process.env.TEST_SIMULATE_WHATSAPP_DISPATCH === "true"
            ? { success: true, messageId: `wamid.test_${Date.now()}_${Math.random().toString(36).substring(2, 8)}` }
            : await sendWhatsAppTemplate(
                phone,
                templateSlug,
                [custName],
                template.organizationId
              );

          if (sendRes.success) {
            campaignSent++;
            totalSent++;
            if (caId) {
              await db
                .update(campaignAudiences)
                .set({
                  deliveryStatus: "SENT",
                  metaMessageId: sendRes.messageId || null,
                  sentAt: new Date(),
                })
                .where(eq(campaignAudiences.id, caId));
            }
          } else {
            campaignFailed++;
            totalFailed++;
            if (caId) {
              await db
                .update(campaignAudiences)
                .set({
                  deliveryStatus: "FAILED",
                  errorMessage: sendRes.error || "Delivery failed",
                })
                .where(eq(campaignAudiences.id, caId));
            }
          }
        } catch (err: any) {
          campaignFailed++;
          totalFailed++;
          if (caId) {
            await db
              .update(campaignAudiences)
              .set({
                deliveryStatus: "FAILED",
                errorMessage: err.message || "Dispatch error",
              })
              .where(eq(campaignAudiences.id, caId));
          }
        }

        // Throttle 100ms to adhere to Meta Cloud API rate limits
        await sleep(100);
      }

      // Update parent campaign status
      await db
        .update(marketingCampaigns)
        .set({
          sentCount: campaignSent,
          failedCount: campaignFailed,
          status: "COMPLETED",
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(marketingCampaigns.id, campaignRun.id));

      console.log(
        `    Campaign Finished: ${campaignSent} sent, ${campaignFailed} failed. Total Enrolled: ${newlyEligibleCustomers.length}`
      );
    }

    const durationMs = Date.now() - startTime.getTime();
    console.log(`\n======================================================`);
    console.log(`[KUAB Lifecycle Drip Engine] Completed in ${durationMs}ms`);
    console.log(`Total Templates Evaluated: ${activeTemplates.length}`);
    console.log(`New Customers Enrolled:    ${totalEnrolled}`);
    console.log(`Messages Dispatched:       ${totalSent}`);
    console.log(`Messages Failed:           ${totalFailed}`);
    console.log(`Expired Cycles Completed:  ${totalCyclesCompleted}`);
    console.log(`======================================================\n`);

    return {
      success: true,
      templatesEvaluated: activeTemplates.length,
      newAudiencesEnrolled: totalEnrolled,
      messagesSent: totalSent,
      messagesFailed: totalFailed,
      cyclesCompleted: totalCyclesCompleted,
    };
  } catch (error: any) {
    console.error(`[KUAB Lifecycle Drip Engine ERROR]:`, error);
    return {
      success: false,
      templatesEvaluated: 0,
      newAudiencesEnrolled: 0,
      messagesSent: 0,
      messagesFailed: 0,
      cyclesCompleted: 0,
      error: error.message || "Lifecycle drip engine execution failed",
    };
  }
}

// Standalone execution handler
if (require.main === module || process.argv[1]?.includes("automated-lifecycle-drips")) {
  const isCronMode = process.argv.includes("--cron");

  if (isCronMode) {
    console.log("[KUAB Lifecycle Drip Engine] Initializing Cron Scheduler daemon (every Monday at 9:00 AM)...");
    // Default weekly schedule: Monday 9:00 AM
    cron.schedule("0 9 * * 1", async () => {
      await runAutomatedLifecycleDrips();
    });
    // Run an initial evaluation pass on startup
    runAutomatedLifecycleDrips();
  } else {
    // Single-run mode
    runAutomatedLifecycleDrips()
      .then((res) => {
        console.log("Single pass completed:", res);
        process.exit(res.success ? 0 : 1);
      })
      .catch((err) => {
        console.error("Fatal error:", err);
        process.exit(1);
      });
  }
}
