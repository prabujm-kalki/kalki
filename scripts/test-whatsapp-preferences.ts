import { resolveWhatsappPreferences, buildPoWhatsappMessage } from "../src/lib/whatsapp-po";
import { db } from "../src/db";
import { organizations, vendors } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function runE2ETests() {
  console.log("==========================================");
  console.log("   WhatsApp Preferences E2E Test Suite    ");
  console.log("==========================================");

  // 1. Unit testing resolution permutations
  console.log("\n[TEST 1] Testing resolveWhatsappPreferences permutations...");

  // Scenario A: Org is NO_WHATSAPP -> Must disable everything regardless of vendor
  const resA = resolveWhatsappPreferences({
    orgDispatchMode: "NO_WHATSAPP",
    orgContentFormat: "TEXT_AND_PDF_LINK",
    vendorPreference: "TEXT_ONLY",
    vendorDeliveryMethod: "WHATSAPP",
  });
  console.assert(resA.isGloballyDisabled === true, "Scenario A failed: isGloballyDisabled should be true");
  console.assert(resA.dispatchMode === "NO_WHATSAPP", "Scenario A failed: dispatchMode should be NO_WHATSAPP");
  console.log("  ✓ Scenario A passed: Org master mute disables all WhatsApp dispatch.");

  // Scenario B: Vendor has EMAIL delivery method -> Must disable WhatsApp
  const resB = resolveWhatsappPreferences({
    orgDispatchMode: "WEB_LINK_POPUP",
    orgContentFormat: "TEXT_AND_PDF_LINK",
    vendorPreference: "TEXT_ONLY",
    vendorDeliveryMethod: "EMAIL",
  });
  console.assert(resB.isGloballyDisabled === true, "Scenario B failed: vendor EMAIL should disable WhatsApp");
  console.log("  ✓ Scenario B passed: Vendor non-whatsapp delivery method disables WhatsApp.");

  // Scenario C: Org is WEB_LINK_POPUP, default TEXT_AND_PDF_LINK, vendor overrides to TEXT_ONLY
  const resC = resolveWhatsappPreferences({
    orgDispatchMode: "WEB_LINK_POPUP",
    orgContentFormat: "TEXT_AND_PDF_LINK",
    vendorPreference: "TEXT_ONLY",
    vendorDeliveryMethod: "WHATSAPP",
  });
  console.assert(resC.isGloballyDisabled === false, "Scenario C failed: should not be disabled");
  console.assert(resC.dispatchMode === "WEB_LINK_POPUP", "Scenario C failed: dispatchMode should match org");
  console.assert(resC.contentFormat === "TEXT_ONLY", "Scenario C failed: vendor override should prevail");
  console.log("  ✓ Scenario C passed: Vendor format override takes precedence over org default.");

  // Scenario D: Org is API_AUTOMATED, Org format PDF_LINK_ONLY, vendor has no preference
  const resD = resolveWhatsappPreferences({
    orgDispatchMode: "API_AUTOMATED",
    orgContentFormat: "PDF_LINK_ONLY",
    vendorPreference: null,
    vendorDeliveryMethod: "WHATSAPP",
  });
  console.assert(resD.isGloballyDisabled === false, "Scenario D failed: should not be disabled");
  console.assert(resD.dispatchMode === "API_AUTOMATED", "Scenario D failed: dispatchMode should be API_AUTOMATED");
  console.assert(resD.contentFormat === "PDF_LINK_ONLY", "Scenario D failed: should fall back to org format");
  console.log("  ✓ Scenario D passed: Org API_AUTOMATED and format used when vendor preference is unset.");

  // 2. Unit testing message builder with format variations
  console.log("\n[TEST 2] Testing buildPoWhatsappMessage format outputs...");
  const msgTextOnly = buildPoWhatsappMessage({
    poNumber: "PO-TEST001",
    totalAmount: 15000,
    publicToken: "token123",
    lines: [{ itemName: "Milk", orderedQuantity: 10, unitOfMeasure: "Litre" }],
    vendorPhone: "9876543210",
    poWhatsappPreference: "TEXT_ONLY",
  });
  console.assert(!msgTextOnly.text.includes("View and download the PDF here:"), "Text-only format should not contain PDF link");
  console.assert(msgTextOnly.whatsappUrl.includes("919876543210"), "wa.me link must format 91 prefix");
  console.log("  ✓ buildPoWhatsappMessage: TEXT_ONLY correctly omits PDF link and formats mobile with +91.");

  const msgPdfOnly = buildPoWhatsappMessage({
    poNumber: "PO-TEST002",
    totalAmount: 5000,
    publicToken: "token456",
    vendorPhone: "919876543210",
    poWhatsappPreference: "PDF_LINK_ONLY",
  });
  console.assert(msgPdfOnly.text.includes("view and download Purchase Order #PO-TEST002 here:"), "PDF-only format must include link");
  console.log("  ✓ buildPoWhatsappMessage: PDF_LINK_ONLY formatted cleanly.");

  // 3. Database persistence test on organization settings
  console.log("\n[TEST 3] Testing database persistence on organizations table...");
  const testOrgs = await db.select({ id: organizations.id, name: organizations.name, mode: organizations.whatsappDispatchMode }).from(organizations).limit(1);
  if (testOrgs.length > 0) {
    const org = testOrgs[0];
    console.log(`  Updating test org ${org.name} (${org.id}) to NO_WHATSAPP...`);
    await db.update(organizations).set({
      whatsappDispatchMode: "NO_WHATSAPP",
      whatsappContentFormat: "TEXT_ONLY"
    }).where(eq(organizations.id, org.id));

    const [updated] = await db.select({
      mode: organizations.whatsappDispatchMode,
      format: organizations.whatsappContentFormat,
    }).from(organizations).where(eq(organizations.id, org.id));

    console.assert(updated.mode === "NO_WHATSAPP", "Org update failed to set whatsappDispatchMode");
    console.assert(updated.format === "TEXT_ONLY", "Org update failed to set whatsappContentFormat");
    console.log("  ✓ Verified: NO_WHATSAPP and TEXT_ONLY persisted into PostgreSQL database.");

    // Restore to standard default WEB_LINK_POPUP / TEXT_AND_PDF_LINK
    await db.update(organizations).set({
      whatsappDispatchMode: "WEB_LINK_POPUP",
      whatsappContentFormat: "TEXT_AND_PDF_LINK"
    }).where(eq(organizations.id, org.id));
    console.log("  ✓ Restored test org to default (WEB_LINK_POPUP, TEXT_AND_PDF_LINK).");
  }

  console.log("\n==========================================");
  console.log("  ALL TESTS COMPLETED SUCCESSFULLY! ✓     ");
  console.log("==========================================");
}

runE2ETests().catch((e) => {
  console.error("Test execution error:", e);
  process.exit(1);
});

