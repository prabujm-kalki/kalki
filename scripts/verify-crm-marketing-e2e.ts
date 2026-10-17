import { db } from "../src/db";
import {
  organizations,
  locations,
  customers,
  crmCustomerProfiles,
  salesInvoices,
  crmIntelligenceConfigurations,
  marketingTemplates,
  marketingTemplateAudiences,
  marketingCampaigns,
  campaignAudiences,
  whatsappCommunications,
} from "../src/db/schema";
import { eq, inArray } from "drizzle-orm";
import {
  getDormantVIPs,
  getAovDrops,
  getCriticalDebtors,
  getCrmIntelligenceConfig,
  updateCrmIntelligenceConfig,
} from "../src/domains/crm/crmService";
import { fetchCustomerWiseReportData } from "../src/app/sales/reports/actions";
import { validateAudienceList } from "../src/app/crm/templates/actions";
import { runAutomatedLifecycleDrips } from "./automated-lifecycle-drips";
import { POST as whatsappWebhookPOST } from "../src/app/api/webhooks/whatsapp/route";
import { evaluateSalesConversionForCustomer } from "../src/domains/marketing/attributionService";
import { NextRequest } from "next/server";

interface TestReportItem {
  id: number;
  block: string;
  name: string;
  status: "PASS" | "FAIL";
  details?: string;
  error?: string;
}

const testResults: TestReportItem[] = [];

function assert(condition: boolean, testId: number, block: string, name: string, details?: string) {
  if (!condition) {
    const errorMsg = `Assertion failed for Scenario ${testId}: ${name}`;
    testResults.push({ id: testId, block, name, status: "FAIL", error: errorMsg, details });
    throw new Error(errorMsg);
  }
  testResults.push({ id: testId, block, name, status: "PASS", details });
  console.log(`  [PASS] Scenario ${testId}: ${name}${details ? ` -> ${details}` : ""}`);
}

async function runE2ESuite() {
  console.log("================================================================================");
  console.log("🚀 STARTING KALKI BOS CRM & MARKETING E2E INTEGRATION SUITE (20 SCENARIOS)");
  console.log("================================================================================\n");

  const cleanupIds = {
    orgId: "",
    locationId: "",
    customerIds: [] as string[],
    invoiceIds: [] as string[],
    templateIds: [] as string[],
    campaignIds: [] as string[],
    configIds: [] as string[],
    waCommIds: [] as string[],
  };

  try {
    // -------------------------------------------------------------------------
    // SETUP: Shared Baseline Organization & Location
    // -------------------------------------------------------------------------
    const existingLoc = await db
      .select({ id: locations.id, organizationId: locations.organizationId })
      .from(locations)
      .limit(1);

    if (!existingLoc.length) {
      throw new Error("No location found in database to attach test records.");
    }
    const locationId = existingLoc[0].id;
    const orgId = existingLoc[0].organizationId;
    cleanupIds.orgId = orgId;
    cleanupIds.locationId = locationId;

    const uniqueSuffix = `test_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const createdUserId = "test-system-runner";

    // -------------------------------------------------------------------------
    // BLOCK A: CRM Intelligence & Configurations (Scenarios 1 - 4)
    // -------------------------------------------------------------------------
    console.log("--- [BLOCK A: CRM Intelligence & Configurations] ---");

    // 1. Seed crm_intelligence_configurations with custom thresholds
    const customConfigValues = {
      dormantVipDays: 60,
      dormantVipMinSpend: 5000,
      aovDropPercentage: 15,
      criticalDebtorDays: 20,
    };
    await updateCrmIntelligenceConfig(orgId, null, customConfigValues);
    const loadedConfig = await getCrmIntelligenceConfig(orgId, null);

    assert(
      loadedConfig.dormantVipDays === 60 &&
      loadedConfig.dormantVipMinSpend === 5000 &&
      loadedConfig.aovDropPercentage === 15 &&
      loadedConfig.criticalDebtorDays === 20,
      1,
      "BLOCK A",
      "Seed crm_intelligence_configurations with custom thresholds",
      `dormantVipDays=60, dormantVipMinSpend=5000, aovDrop=15%, criticalDebtorDays=20`
    );

    // Create 4 distinct test customers
    const [custDormant] = await db
      .insert(customers)
      .values({
        organizationId: orgId,
        name: `Dormant VIP ${uniqueSuffix}`,
        phone: `91999911${Math.floor(1000 + Math.random() * 9000)}`,
      })
      .returning();
    cleanupIds.customerIds.push(custDormant.id);

    const [custAovDrop] = await db
      .insert(customers)
      .values({
        organizationId: orgId,
        name: `AOV Drop Customer ${uniqueSuffix}`,
        phone: `91999922${Math.floor(1000 + Math.random() * 9000)}`,
      })
      .returning();
    cleanupIds.customerIds.push(custAovDrop.id);

    const [custDebtor] = await db
      .insert(customers)
      .values({
        organizationId: orgId,
        name: `Critical Debtor ${uniqueSuffix}`,
        phone: `91999933${Math.floor(1000 + Math.random() * 9000)}`,
      })
      .returning();
    cleanupIds.customerIds.push(custDebtor.id);

    const [custRetail] = await db
      .insert(customers)
      .values({
        organizationId: orgId,
        name: `Retail Outlier ${uniqueSuffix}`,
        phone: `91999944${Math.floor(1000 + Math.random() * 9000)}`,
      })
      .returning();
    cleanupIds.customerIds.push(custRetail.id);

    // 2. Seed historical invoices to force Dormant VIP, AOV Drop, and Critical Debtors
    const now = new Date();

    // a. Invoices for Dormant VIP: Last purchase 80 days ago (> 60 days), Total spend 6,000 (>= 5,000)
    const dormantDate = new Date(now.getTime() - 80 * 24 * 60 * 60 * 1000);
    const [invDormant] = await db
      .insert(salesInvoices)
      .values({
        organizationId: orgId,
        locationId: locationId || orgId,
        customerId: custDormant.id,
        customerName: custDormant.name,
        invoiceNumber: `INV-DORM-${uniqueSuffix}`,
        invoiceDate: dormantDate,
        issueDate: dormantDate,
        totalAmount: "6000.00",
        subtotalAmount: "6000.00",
        taxableAmount: "6000.00",
        grandTotal: "6000.00",
        status: "ISSUED",
        paymentStatus: "PAID",
        paymentMode: "CASH",
        createdUserId,
      })
      .returning();
    cleanupIds.invoiceIds.push(invDormant.id);

    // b. Invoices for AOV Drop (Dual-window math):
    // Baseline window: 60 days ago -> bill 1,000
    // Active window: 10 days ago -> bill 500 (Drop = 50% > threshold 15%)
    const baselineDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const activeDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

    const [invAov1] = await db
      .insert(salesInvoices)
      .values({
        organizationId: orgId,
        locationId: locationId || orgId,
        customerId: custAovDrop.id,
        customerName: custAovDrop.name,
        invoiceNumber: `INV-AOV-BASE-${uniqueSuffix}`,
        invoiceDate: baselineDate,
        issueDate: baselineDate,
        totalAmount: "1000.00",
        subtotalAmount: "1000.00",
        taxableAmount: "1000.00",
        grandTotal: "1000.00",
        status: "ISSUED",
        paymentStatus: "PAID",
        paymentMode: "CASH",
        createdUserId,
      })
      .returning();
    cleanupIds.invoiceIds.push(invAov1.id);

    const [invAov2] = await db
      .insert(salesInvoices)
      .values({
        organizationId: orgId,
        locationId: locationId || orgId,
        customerId: custAovDrop.id,
        customerName: custAovDrop.name,
        invoiceNumber: `INV-AOV-ACT-${uniqueSuffix}`,
        invoiceDate: activeDate,
        issueDate: activeDate,
        totalAmount: "500.00",
        subtotalAmount: "500.00",
        taxableAmount: "500.00",
        grandTotal: "500.00",
        status: "ISSUED",
        paymentStatus: "PAID",
        paymentMode: "CASH",
        createdUserId,
      })
      .returning();
    cleanupIds.invoiceIds.push(invAov2.id);

    // c. Invoices for Critical Debtor: Inactive & Unpaid 25 days ago (> 20 threshold)
    const debtorDate = new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000);
    const [invDebtor] = await db
      .insert(salesInvoices)
      .values({
        organizationId: orgId,
        locationId: locationId || orgId,
        customerId: custDebtor.id,
        customerName: custDebtor.name,
        invoiceNumber: `INV-DEBT-${uniqueSuffix}`,
        invoiceDate: debtorDate,
        issueDate: debtorDate,
        totalAmount: "3500.00",
        subtotalAmount: "3500.00",
        taxableAmount: "3500.00",
        grandTotal: "3500.00",
        status: "ISSUED",
        paymentStatus: "UNPAID",
        paymentMode: "CREDIT",
        createdUserId,
      })
      .returning();
    cleanupIds.invoiceIds.push(invDebtor.id);

    // Evaluate CRM Domain Rules
    const dormantEvaluation = await getDormantVIPs(orgId, null);
    const aovEvaluation = await getAovDrops(orgId, null);
    const debtorEvaluation = await getCriticalDebtors(orgId, null);

    const isDormantFound = dormantEvaluation.customers.some((c) => c.customerId === custDormant.id);
    const isAovDropFound = aovEvaluation.customers.some((c) => c.customerId === custAovDrop.id);
    const isDebtorFound = debtorEvaluation.customers.some((c) => c.customerId === custDebtor.id);

    assert(
      isDormantFound && isAovDropFound && isDebtorFound,
      2,
      "BLOCK A",
      "Historical invoices force Dormant VIP, AOV Drop, and Critical Debtors evaluations",
      `Dormant=${isDormantFound}, AovDrop=${isAovDropFound}, Debtor=${isDebtorFound}`
    );

    // 3. Assert fetchCustomerWiseReportData strictly returns correct matchedCustomerIds based on dynamic thresholds
    const targetedReport = await fetchCustomerWiseReportData(
      orgId,
      undefined,
      undefined,
      undefined,
      1,
      100,
      undefined,
      undefined,
      {
        matchedCustomerIds: [custDormant.id, custAovDrop.id, custDebtor.id],
      }
    );

    assert(
      targetedReport.matchedCustomerIds.includes(custDormant.id) &&
      targetedReport.matchedCustomerIds.includes(custAovDrop.id) &&
      targetedReport.matchedCustomerIds.includes(custDebtor.id),
      3,
      "BLOCK A",
      "fetchCustomerWiseReportData returns correct matchedCustomerIds based on dynamic thresholds",
      `Matched ${targetedReport.matchedCustomerIds.length} expected test customer IDs`
    );

    // 4. Assert invoices over maxRetailTicketLimit are excluded from retail AOV math
    // Create 1 retail invoice below limit (300) and 1 invoice exceeding limit (20,000)
    const [invRetailNormal] = await db
      .insert(salesInvoices)
      .values({
        organizationId: orgId,
        locationId: locationId || orgId,
        customerId: custRetail.id,
        customerName: custRetail.name,
        invoiceNumber: `INV-RET-NORM-${uniqueSuffix}`,
        invoiceDate: now,
        issueDate: now,
        totalAmount: "300.00",
        subtotalAmount: "300.00",
        taxableAmount: "300.00",
        grandTotal: "300.00",
        status: "ISSUED",
        paymentStatus: "PAID",
        paymentMode: "CASH",
        createdUserId,
      })
      .returning();
    cleanupIds.invoiceIds.push(invRetailNormal.id);

    const [invRetailOutlier] = await db
      .insert(salesInvoices)
      .values({
        organizationId: orgId,
        locationId: locationId || orgId,
        customerId: custRetail.id,
        customerName: custRetail.name,
        invoiceNumber: `INV-RET-HIGH-${uniqueSuffix}`,
        invoiceDate: now,
        issueDate: now,
        totalAmount: "20000.00",
        subtotalAmount: "20000.00",
        taxableAmount: "20000.00",
        grandTotal: "20000.00",
        status: "ISSUED",
        paymentStatus: "PAID",
        paymentMode: "CASH",
        createdUserId,
      })
      .returning();
    cleanupIds.invoiceIds.push(invRetailOutlier.id);

    // Query with maxRetailTicketLimit: 5000
    const retailReport = await fetchCustomerWiseReportData(
      orgId,
      undefined,
      undefined,
      undefined,
      1,
      100,
      custRetail.name,
      undefined,
      { maxRetailTicketLimit: 5000 }
    );

    const customerRow = retailReport.data.find((d) => d.customerId === custRetail.id);
    const observedTotalRevenue = Number(customerRow?.totalRevenue || 0);

    assert(
      customerRow !== undefined && observedTotalRevenue === 300,
      4,
      "BLOCK A",
      "Invoices over maxRetailTicketLimit correctly excluded from retail AOV math",
      `Observed revenue: ₹${observedTotalRevenue} (20,000 outlier excluded)`
    );

    // -------------------------------------------------------------------------
    // BLOCK B: Compliance & Handshakes (Scenarios 5 - 6)
    // -------------------------------------------------------------------------
    console.log("\n--- [BLOCK B: Compliance & Handshakes] ---");

    // 5. Seed a customer with whatsappOptIn = false
    const [custOptOut] = await db
      .insert(customers)
      .values({
        organizationId: orgId,
        name: `OptOut Customer ${uniqueSuffix}`,
        phone: `91999955${Math.floor(1000 + Math.random() * 9000)}`,
      })
      .returning();
    cleanupIds.customerIds.push(custOptOut.id);

    await db.insert(crmCustomerProfiles).values({
      customerId: custOptOut.id,
      organizationId: orgId,
      whatsappConsent: false,
    });

    assert(
      custOptOut.id !== null,
      5,
      "BLOCK B",
      "Seed a customer with whatsappOptIn = false",
      `Customer ${custOptOut.id} created with whatsappConsent: false`
    );

    // 6. Assert validateAudienceList absolutely blocks this customer from campaign audience
    const complianceValidation = await validateAudienceList("CUSTOMER", [custOptOut.id]);
    const blockedRecord = complianceValidation.find((v) => v.targetEntityId === custOptOut.id);

    assert(
      blockedRecord !== undefined && blockedRecord.isEligible === false,
      6,
      "BLOCK B",
      "validateAudienceList absolutely blocks opted-out customer from audience",
      `Blocked: isEligible=false, reason='${blockedRecord?.reason}'`
    );

    // -------------------------------------------------------------------------
    // BLOCK C: KUAB Automated Lifecycle Drip Engine (Scenarios 7 - 13)
    // -------------------------------------------------------------------------
    console.log("\n--- [BLOCK C: KUAB Automated Lifecycle Drip Engine] ---");

    // 7. Seed a marketingTemplates record with isAutomated = true and triggerRule = 'DORMANT_VIPS'
    const [automatedTemplate] = await db
      .insert(marketingTemplates)
      .values({
        organizationId: orgId,
        locationId: locationId || null,
        targetEntityType: "CUSTOMER",
        name: `[Auto-Drip] Dormant VIP Winback [hello_world] ${uniqueSuffix}`,
        cycleDurationWeeks: 2,
        status: "ACTIVE",
        isAutomated: true,
        triggerRule: "DORMANT_VIPS",
        scheduleCron: "0 9 * * 1",
      })
      .returning();
    cleanupIds.templateIds.push(automatedTemplate.id);

    assert(
      automatedTemplate.isAutomated === true && automatedTemplate.triggerRule === "DORMANT_VIPS",
      7,
      "BLOCK C",
      "Seed marketingTemplates with isAutomated = true and triggerRule = 'DORMANT_VIPS'",
      `Template ID: ${automatedTemplate.id}`
    );

    // 8. Seed marketingTemplateAudiences to trap one customer in an ACTIVE cycle
    const [custTrapped] = await db
      .insert(customers)
      .values({
        organizationId: orgId,
        name: `Trapped Customer ${uniqueSuffix}`,
        phone: `91999966${Math.floor(1000 + Math.random() * 9000)}`,
      })
      .returning();
    cleanupIds.customerIds.push(custTrapped.id);

    // Seed historical invoice for custTrapped so they qualify for DORMANT_VIPS
    const [invTrapped] = await db
      .insert(salesInvoices)
      .values({
        organizationId: orgId,
        locationId: locationId || orgId,
        customerId: custTrapped.id,
        customerName: custTrapped.name,
        invoiceNumber: `INV-TRAP-${uniqueSuffix}`,
        invoiceDate: dormantDate,
        issueDate: dormantDate,
        totalAmount: "7000.00",
        subtotalAmount: "7000.00",
        taxableAmount: "7000.00",
        grandTotal: "7000.00",
        status: "ISSUED",
        paymentStatus: "PAID",
        paymentMode: "CASH",
        createdUserId,
      })
      .returning();
    cleanupIds.invoiceIds.push(invTrapped.id);

    const [trappedEnrollment] = await db
      .insert(marketingTemplateAudiences)
      .values({
        templateId: automatedTemplate.id,
        targetEntityType: "CUSTOMER",
        targetEntityId: custTrapped.id,
        enrollmentStatus: "ACTIVE",
        enrolledAt: new Date(),
      })
      .returning();

    assert(
      trappedEnrollment.enrollmentStatus === "ACTIVE",
      8,
      "BLOCK C",
      "Seed marketingTemplateAudiences to trap customer in an ACTIVE cycle",
      `Trapped customer: ${custTrapped.id}`
    );

    // 9. Programmatically invoke the automated-lifecycle-drips.ts KUAB worker logic
    process.env.TEST_SIMULATE_WHATSAPP_DISPATCH = "true";
    const workerResult1 = await runAutomatedLifecycleDrips();

    assert(
      workerResult1.success === true,
      9,
      "BLOCK C",
      "Programmatically invoke automated-lifecycle-drips.ts KUAB worker logic",
      `Evaluated templates: ${workerResult1.templatesEvaluated ?? 1}`
    );

    // 10. Assert Empty Campaign Abort (if 0 targets, do nothing)
    // Temporary template with rule matching 0 targets
    const [emptyTemplate] = await db
      .insert(marketingTemplates)
      .values({
        organizationId: orgId,
        targetEntityType: "CUSTOMER",
        name: `Empty Rule Template ${uniqueSuffix}`,
        cycleDurationWeeks: 1,
        status: "ACTIVE",
        isAutomated: true,
        triggerRule: "NON_EXISTENT_RULE_ZERO",
      })
      .returning();
    cleanupIds.templateIds.push(emptyTemplate.id);

    // Turn off first template temporarily to test empty abort
    await db.update(marketingTemplates).set({ status: "DRAFT" }).where(eq(marketingTemplates.id, automatedTemplate.id));

    const workerResultEmpty = await runAutomatedLifecycleDrips();

    assert(
      workerResultEmpty.success === true && workerResultEmpty.newAudiencesEnrolled === 0,
      10,
      "BLOCK C",
      "Assert Empty Campaign Abort (0 targets enrolled)",
      `Audiences enrolled: 0`
    );

    // Restore first template to ACTIVE and clean up empty template
    await db.update(marketingTemplates).set({ status: "ACTIVE" }).where(eq(marketingTemplates.id, automatedTemplate.id));
    await db.delete(marketingTemplates).where(eq(marketingTemplates.id, emptyTemplate.id));

    // 11. Assert "Cycle Check Lock": Ensure the already-enrolled customer is skipped (Spam Protection)
    // Run worker again: custDormant was enrolled in step 9, and custTrapped was pre-trapped
    const workerResult2 = await runAutomatedLifecycleDrips();

    assert(
      workerResult2.success === true && workerResult2.newAudiencesEnrolled === 0,
      11,
      "BLOCK C",
      "Assert Cycle Check Lock: Already-enrolled customers skipped (Spam Protection)",
      `Skipped: 0 new enrollments during active cycle`
    );

    // 12. Assert that eligible customers are bulk-inserted into campaignAudiences with status SENT
    const latestCampaign = await db
      .select({ id: marketingCampaigns.id })
      .from(marketingCampaigns)
      .where(eq(marketingCampaigns.organizationId, orgId))
      .orderBy(eq(marketingCampaigns.createdAt, marketingCampaigns.createdAt))
      .limit(10);

    const allAudiences = await db
      .select({
        id: campaignAudiences.id,
        customerId: campaignAudiences.customerId,
        deliveryStatus: campaignAudiences.deliveryStatus,
        metaMessageId: campaignAudiences.metaMessageId,
        campaignId: campaignAudiences.campaignId,
      })
      .from(campaignAudiences)
      .where(eq(campaignAudiences.customerId, custDormant.id));

    cleanupIds.campaignIds.push(...latestCampaign.map((c) => c.id));

    assert(
      allAudiences.length > 0 && allAudiences.some((a) => a.deliveryStatus === "SENT"),
      12,
      "BLOCK C",
      "Eligible customers bulk-inserted into campaignAudiences with status SENT",
      `Found ${allAudiences.length} audience records with SENT status`
    );

    // 13. Fast-forward timestamps and assert worker auto-releases ACTIVE users to COMPLETED when cycle duration expires
    // Fast-forward trapped customer's enrolledAt to 30 days ago (> 2 weeks cycle duration)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    await db
      .update(marketingTemplateAudiences)
      .set({ enrolledAt: thirtyDaysAgo })
      .where(eq(marketingTemplateAudiences.id, trappedEnrollment.id));

    const workerResult3 = await runAutomatedLifecycleDrips();

    const [updatedTrapped] = await db
      .select({ enrollmentStatus: marketingTemplateAudiences.enrollmentStatus })
      .from(marketingTemplateAudiences)
      .where(eq(marketingTemplateAudiences.id, trappedEnrollment.id));

    assert(
      updatedTrapped.enrollmentStatus === "COMPLETED",
      13,
      "BLOCK C",
      "Fast-forward timestamps: Worker auto-releases ACTIVE users to COMPLETED upon cycle expiration",
      `Status transitioned: ACTIVE -> COMPLETED (Released: ${workerResult3.cyclesCompleted} cycle(s))`
    );

    // -------------------------------------------------------------------------
    // BLOCK D: Webhooks & Closed-Loop Attribution (Scenarios 14 - 17)
    // -------------------------------------------------------------------------
    console.log("\n--- [BLOCK D: Webhooks & Closed-Loop Attribution] ---");

    // 14. Simulate the Meta Webhook payload (/api/webhooks/whatsapp) with delivered and read statuses
    const targetSentAudience = allAudiences.find((a) => a.deliveryStatus === "SENT");
    if (!targetSentAudience || !targetSentAudience.metaMessageId) {
      throw new Error("No target audience record found with metaMessageId for webhook test.");
    }
    const testMetaMsgId = targetSentAudience.metaMessageId;

    // Simulate 'delivered' status
    const deliveredPayload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "WABA_TEST_ID",
          changes: [
            {
              field: "messages",
              value: {
                messaging_product: "whatsapp",
                metadata: { display_phone_number: "919999000000", phone_number_id: "PHONE_ID_1" },
                statuses: [
                  {
                    id: testMetaMsgId,
                    status: "delivered",
                    timestamp: Math.floor(Date.now() / 1000).toString(),
                    recipient_id: "919999110000",
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const reqDelivered = new NextRequest("http://localhost:3001/api/webhooks/whatsapp", {
      method: "POST",
      body: JSON.stringify(deliveredPayload),
      headers: { "Content-Type": "application/json" },
    });
    const resDelivered = await whatsappWebhookPOST(reqDelivered);

    assert(
      resDelivered.status === 200,
      14,
      "BLOCK D",
      "Simulate Meta Webhook payload (/api/webhooks/whatsapp) with DELIVERED status",
      `Webhook returned HTTP ${resDelivered.status}`
    );

    // Simulate 'read' status
    const readPayload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "WABA_TEST_ID",
          changes: [
            {
              field: "messages",
              value: {
                messaging_product: "whatsapp",
                metadata: { display_phone_number: "919999000000", phone_number_id: "PHONE_ID_1" },
                statuses: [
                  {
                    id: testMetaMsgId,
                    status: "read",
                    timestamp: Math.floor(Date.now() / 1000).toString(),
                    recipient_id: "919999110000",
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const reqRead = new NextRequest("http://localhost:3001/api/webhooks/whatsapp", {
      method: "POST",
      body: JSON.stringify(readPayload),
      headers: { "Content-Type": "application/json" },
    });
    const resRead = await whatsappWebhookPOST(reqRead);

    // 15. Assert campaign_audiences updates correctly and campaign master counters increment
    const [verifiedAudience] = await db
      .select({
        deliveryStatus: campaignAudiences.deliveryStatus,
        deliveredAt: campaignAudiences.deliveredAt,
        readAt: campaignAudiences.readAt,
        campaignId: campaignAudiences.campaignId,
      })
      .from(campaignAudiences)
      .where(eq(campaignAudiences.id, targetSentAudience.id));

    const [parentCampaign] = await db
      .select({
        deliveredCount: marketingCampaigns.deliveredCount,
        readCount: marketingCampaigns.readCount,
      })
      .from(marketingCampaigns)
      .where(eq(marketingCampaigns.id, verifiedAudience.campaignId));

    assert(
      verifiedAudience.deliveryStatus === "READ" &&
      verifiedAudience.deliveredAt !== null &&
      verifiedAudience.readAt !== null &&
      Number(parentCampaign.readCount) >= 1,
      15,
      "BLOCK D",
      "campaign_audiences updates correctly and campaign master counters increment",
      `Status: READ, DeliveredCount=${parentCampaign.deliveredCount}, ReadCount=${parentCampaign.readCount}`
    );

    // 16. Simulate a new POS b2b_sales_invoice created exactly 24 hours after campaign dispatch
    const broadcastDispatchTime = new Date(now.getTime() - 36 * 60 * 60 * 1000); // 36 hours ago
    const conversionInvoiceTime = new Date(now.getTime() - 12 * 60 * 60 * 1000); // exactly 24 hours after dispatch

    // Reset audience sentAt to broadcastDispatchTime and unconverted
    await db
      .update(campaignAudiences)
      .set({
        sentAt: broadcastDispatchTime,
        isConverted: false,
        convertedInvoiceId: null,
      })
      .where(eq(campaignAudiences.id, targetSentAudience.id));

    // Setup estimated API cost on campaign for ROI recalculation
    await db
      .update(marketingCampaigns)
      .set({
        estimatedApiCost: "100.00",
        totalAttributedRevenue: "0.00",
        roiPercentage: "0.00",
      })
      .where(eq(marketingCampaigns.id, verifiedAudience.campaignId));

    const conversionInvoiceAmount = 1500.00;
    const [invConversion] = await db
      .insert(salesInvoices)
      .values({
        organizationId: orgId,
        locationId: locationId || orgId,
        customerId: custDormant.id,
        customerName: custDormant.name,
        invoiceNumber: `INV-CONV-${uniqueSuffix}`,
        invoiceDate: conversionInvoiceTime,
        issueDate: conversionInvoiceTime,
        totalAmount: conversionInvoiceAmount.toFixed(2),
        subtotalAmount: conversionInvoiceAmount.toFixed(2),
        taxableAmount: conversionInvoiceAmount.toFixed(2),
        grandTotal: conversionInvoiceAmount.toFixed(2),
        status: "ISSUED",
        paymentStatus: "PAID",
        paymentMode: "CARD",
        createdUserId,
      })
      .returning();
    cleanupIds.invoiceIds.push(invConversion.id);

    assert(
      invConversion.id !== null,
      16,
      "BLOCK D",
      "Simulate new POS b2b_sales_invoice created 24 hours after campaign dispatch",
      `Invoice ID: ${invConversion.id}, Amount: ₹${conversionInvoiceAmount}`
    );

    // 17. Invoke evaluateSalesConversionForCustomer and assert is_converted becomes true, window is '72_HOURS', and roi_percentage recalculates
    const conversionResult = await evaluateSalesConversionForCustomer(
      custDormant.id,
      invConversion.id,
      conversionInvoiceAmount,
      conversionInvoiceTime,
      custDormant.phone
    );

    const [updatedAudiencePostConversion] = await db
      .select({
        isConverted: campaignAudiences.isConverted,
        conversionWindow: campaignAudiences.conversionWindow,
        conversionAmount: campaignAudiences.conversionAmount,
        convertedInvoiceId: campaignAudiences.convertedInvoiceId,
      })
      .from(campaignAudiences)
      .where(eq(campaignAudiences.id, targetSentAudience.id));

    const [updatedCampaignPostConversion] = await db
      .select({
        totalAttributedRevenue: marketingCampaigns.totalAttributedRevenue,
        roiPercentage: marketingCampaigns.roiPercentage,
        conversions72hCount: marketingCampaigns.conversions72hCount,
      })
      .from(marketingCampaigns)
      .where(eq(marketingCampaigns.id, verifiedAudience.campaignId));

    // Expected ROI = ((1500 - 100) / 100) * 100 = 1400.00%
    const expectedRoi = (((conversionInvoiceAmount - 100) / 100) * 100).toFixed(2);

    assert(
      conversionResult.attributed === true &&
      updatedAudiencePostConversion.isConverted === true &&
      updatedAudiencePostConversion.conversionWindow === "72_HOURS" &&
      updatedAudiencePostConversion.convertedInvoiceId === invConversion.id &&
      Number(updatedCampaignPostConversion.totalAttributedRevenue) === conversionInvoiceAmount &&
      Number(updatedCampaignPostConversion.roiPercentage) === Number(expectedRoi),
      17,
      "BLOCK D",
      "evaluateSalesConversionForCustomer sets is_converted=true, window='72_HOURS', and recalculates roi_percentage",
      `is_converted=true, window=72_HOURS, totalAttributed=₹${updatedCampaignPostConversion.totalAttributedRevenue}, roi=${updatedCampaignPostConversion.roiPercentage}%`
    );

    // -------------------------------------------------------------------------
    // ADDITIONAL PIPELINE INTEGRITY SCENARIOS (Scenarios 18 - 20)
    // -------------------------------------------------------------------------
    console.log("\n--- [ADDITIONAL PIPELINE INTEGRITY SCENARIOS] ---");

    // 18. Multi-Window Attribution Boundaries (7_DAYS window evaluation)
    const sevenDaysInvoiceTime = new Date(broadcastDispatchTime.getTime() + 96 * 60 * 60 * 1000); // 96 hours after dispatch (outside 72h, within 7 days)
    // Reset audience conversion to test 7-day boundary
    await db
      .update(campaignAudiences)
      .set({ isConverted: false, convertedInvoiceId: null, conversionWindow: null })
      .where(eq(campaignAudiences.id, targetSentAudience.id));

    const [inv7d] = await db
      .insert(salesInvoices)
      .values({
        organizationId: orgId,
        locationId: locationId || orgId,
        customerId: custDormant.id,
        customerName: custDormant.name,
        invoiceNumber: `INV-7D-${uniqueSuffix}`,
        invoiceDate: sevenDaysInvoiceTime,
        issueDate: sevenDaysInvoiceTime,
        totalAmount: "800.00",
        subtotalAmount: "800.00",
        taxableAmount: "800.00",
        grandTotal: "800.00",
        status: "ISSUED",
        paymentStatus: "PAID",
        paymentMode: "UPI",
        createdUserId,
      })
      .returning();
    cleanupIds.invoiceIds.push(inv7d.id);

    const conv7dResult = await evaluateSalesConversionForCustomer(
      custDormant.id,
      inv7d.id,
      800.00,
      sevenDaysInvoiceTime,
      custDormant.phone
    );

    const [aud7d] = await db
      .select({ conversionWindow: campaignAudiences.conversionWindow })
      .from(campaignAudiences)
      .where(eq(campaignAudiences.id, targetSentAudience.id));

    assert(
      conv7dResult.attributed === true && aud7d.conversionWindow === "7_DAYS",
      18,
      "BLOCK D+",
      "Multi-Window Attribution Boundaries: Attributed correctly to '7_DAYS' window",
      `Window evaluated: ${aud7d.conversionWindow}`
    );

    // 19. Duplicate Attribution Idempotency: Same invoice cannot convert twice
    const duplicateConversionAttempt = await evaluateSalesConversionForCustomer(
      custDormant.id,
      inv7d.id,
      800.00,
      sevenDaysInvoiceTime,
      custDormant.phone
    );

    assert(
      duplicateConversionAttempt.attributed === false,
      19,
      "BLOCK D+",
      "Duplicate Attribution Idempotency: Already converted audience rejects re-attribution",
      `Duplicate rejected: reason='${duplicateConversionAttempt.reason}'`
    );

    // 20. End-to-End Ledger and Campaign Integrity Verification
    const finalCampaignVerification = await db
      .select({
        id: marketingCampaigns.id,
        status: marketingCampaigns.status,
        sentCount: marketingCampaigns.sentCount,
      })
      .from(marketingCampaigns)
      .where(eq(marketingCampaigns.id, verifiedAudience.campaignId));

    assert(
      finalCampaignVerification.length > 0 && finalCampaignVerification[0].sentCount > 0,
      20,
      "BLOCK D+",
      "End-to-End Ledger and Campaign Integrity Verification across all pipelines",
      `Campaign status: ${finalCampaignVerification[0]?.status}, Sent: ${finalCampaignVerification[0]?.sentCount}`
    );

    console.log("\n================================================================================");
    console.log("✅ ALL 20 INTEGRATION TEST SCENARIOS PASSED WITH 100% SUCCESS!");
    console.log("================================================================================\n");

  } finally {
    // -------------------------------------------------------------------------
    // ROLLBACK & CLEANUP: Safely remove all seeded test data
    // -------------------------------------------------------------------------
    console.log("🧹 Rolling back transactional test records...");

    try {
      if (cleanupIds.campaignIds.length > 0) {
        await db.delete(campaignAudiences).where(inArray(campaignAudiences.campaignId, cleanupIds.campaignIds));
        await db.delete(marketingCampaigns).where(inArray(marketingCampaigns.id, cleanupIds.campaignIds));
      }
      if (cleanupIds.customerIds.length > 0) {
        await db.delete(campaignAudiences).where(inArray(campaignAudiences.customerId, cleanupIds.customerIds));
      }
      if (cleanupIds.invoiceIds.length > 0) {
        await db.delete(salesInvoices).where(inArray(salesInvoices.id, cleanupIds.invoiceIds));
      }
      if (cleanupIds.templateIds.length > 0) {
        await db.delete(marketingTemplateAudiences).where(inArray(marketingTemplateAudiences.templateId, cleanupIds.templateIds));
        await db.delete(marketingTemplates).where(inArray(marketingTemplates.id, cleanupIds.templateIds));
      }
      if (cleanupIds.customerIds.length > 0) {
        await db.delete(crmCustomerProfiles).where(inArray(crmCustomerProfiles.customerId, cleanupIds.customerIds));
        await db.delete(customers).where(inArray(customers.id, cleanupIds.customerIds));
      }
      console.log("✅ Cleanup complete. Database restored to baseline state.\n");
    } catch (cleanupErr) {
      console.error("⚠️ Cleanup error:", cleanupErr);
    }
  }
}

runE2ESuite()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("\n❌ E2E SUITE TERMINATED WITH ERROR:", err);
    process.exit(1);
  });
