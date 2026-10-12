import { db } from "../src/db";
import { marketingTemplates, marketingTemplateAudiences, customers } from "../src/db/schema";
import { eq, and } from "drizzle-orm";
import { sendWhatsAppTemplate } from "../src/lib/whatsapp";

// Rate limiting sleep helper to stay within Meta Cloud API tiers
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

/**
 * Kalki Universal Automation Bus (KUAB)
 * Marketing Campaign Runner Background Worker
 */
export async function runMarketingCampaigns() {
  const startTime = new Date();
  console.log(`\n======================================================`);
  console.log(`[KUAB Marketing Runner] Starting execution at ${startTime.toISOString()}`);
  console.log(`======================================================`);

  try {
    // 1. Fetch Active Campaigns targeting Customers
    const activeTemplates = await db
      .select({
        id: marketingTemplates.id,
        name: marketingTemplates.name,
        cycleDurationWeeks: marketingTemplates.cycleDurationWeeks,
        status: marketingTemplates.status,
      })
      .from(marketingTemplates)
      .where(
        and(
          eq(marketingTemplates.status, "ACTIVE"),
          eq(marketingTemplates.targetEntityType, "CUSTOMER")
        )
      );

    if (activeTemplates.length === 0) {
      console.log("[KUAB Marketing Runner] No active customer marketing templates found.");
      return { success: true, processedCampaigns: 0 };
    }

    console.log(`[KUAB Marketing Runner] Found ${activeTemplates.length} active customer marketing template(s).`);

    let totalDispatches = 0;
    let totalCompletedAudiences = 0;
    let totalCompletedTemplates = 0;

    for (const template of activeTemplates) {
      console.log(`\n--- Processing Template: "${template.name}" (${template.id}) ---`);
      console.log(`    Cycle Duration: ${template.cycleDurationWeeks} week(s)`);

      // 2. Fetch Active Audiences with customer mobile details
      const activeAudiences = await db
        .select({
          audienceId: marketingTemplateAudiences.id,
          targetEntityId: marketingTemplateAudiences.targetEntityId,
          enrolledAt: marketingTemplateAudiences.enrolledAt,
          customerName: customers.name,
          customerPhone: customers.phone,
        })
        .from(marketingTemplateAudiences)
        .leftJoin(customers, eq(marketingTemplateAudiences.targetEntityId, customers.id))
        .where(
          and(
            eq(marketingTemplateAudiences.templateId, template.id),
            eq(marketingTemplateAudiences.enrollmentStatus, "ACTIVE"),
            eq(marketingTemplateAudiences.targetEntityType, "CUSTOMER")
          )
        );

      console.log(`    Active Audiences to Process: ${activeAudiences.length}`);

      const now = new Date();

      for (const audience of activeAudiences) {
        // Dispatch WhatsApp message if contact number exists
        const phone = audience.customerPhone?.trim();
        const customerName = audience.customerName || "Valued Customer";

        if (phone && phone !== "-") {
          console.log(`    [Dispatching] -> ${customerName} (${phone})`);
          
          // Send template message via Meta Cloud API with safe parameters
          const sendResult = await sendWhatsAppTemplate(
            phone,
            template.name.toLowerCase().replace(/[^a-z0-9_]/g, "_"), // sanitized template identifier
            [customerName]
          );

          if (sendResult.success) {
            console.log(`    [Success] Message ID: ${sendResult.messageId}`);
          } else {
            console.log(`    [Skipped/Failed] ${sendResult.error}`);
          }

          totalDispatches++;

          // Respect Meta Cloud API rate limits (100ms throttle between dispatches)
          await sleep(100);
        } else {
          console.log(`    [Warning] No phone number available for customer ${customerName} (${audience.targetEntityId})`);
        }

        // 3. Cycle Evaluation: Check elapsed time since enrolledAt
        const enrolledTimestamp = new Date(audience.enrolledAt).getTime();
        const elapsedWeeks = (now.getTime() - enrolledTimestamp) / MS_PER_WEEK;

        if (elapsedWeeks >= template.cycleDurationWeeks) {
          console.log(`    [Cycle Completed] Audience ID ${audience.audienceId} reached ${elapsedWeeks.toFixed(1)} / ${template.cycleDurationWeeks} weeks.`);
          
          await db
            .update(marketingTemplateAudiences)
            .set({ enrollmentStatus: "COMPLETED" })
            .where(eq(marketingTemplateAudiences.id, audience.audienceId));

          totalCompletedAudiences++;
        }
      }

      // 4. Template Evaluation: Check if any ACTIVE audience members remain in this template
      const [remainingActive] = await db
        .select({
          count: marketingTemplateAudiences.id,
        })
        .from(marketingTemplateAudiences)
        .where(
          and(
            eq(marketingTemplateAudiences.templateId, template.id),
            eq(marketingTemplateAudiences.enrollmentStatus, "ACTIVE")
          )
        )
        .limit(1);

      if (!remainingActive) {
        console.log(`    [Template Completed] All audiences in "${template.name}" are COMPLETED. Marking template as COMPLETED.`);
        
        await db
          .update(marketingTemplates)
          .set({ status: "COMPLETED" })
          .where(eq(marketingTemplates.id, template.id));

        totalCompletedTemplates++;
      }
    }

    console.log(`\n======================================================`);
    console.log(`[KUAB Marketing Runner] Summary:`);
    console.log(`  Dispatches Triggered: ${totalDispatches}`);
    console.log(`  Audiences Completed:  ${totalCompletedAudiences}`);
    console.log(`  Templates Completed:  ${totalCompletedTemplates}`);
    console.log(`  Finished at:          ${new Date().toISOString()}`);
    console.log(`======================================================\n`);

    return {
      success: true,
      totalDispatches,
      totalCompletedAudiences,
      totalCompletedTemplates,
    };
  } catch (error) {
    console.error("[KUAB Marketing Runner Error]:", error);
    return { success: false, error };
  }
}

// If invoked directly from CLI (e.g., via tsx)
if (require.main === module || process.argv[1]?.includes("run-marketing-campaigns")) {
  runMarketingCampaigns()
    .then((result) => {
      process.exit(result.success ? 0 : 1);
    })
    .catch((err) => {
      console.error("Unhandled fatal exception:", err);
      process.exit(1);
    });
}
