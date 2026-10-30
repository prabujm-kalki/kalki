import { db } from "../src/db";
import { organizations, locations, customers, items } from "../src/db/schema";
import { eq } from "drizzle-orm";
import {
  createQuotation,
  fetchQuotations,
  fetchQuotationById,
  updateQuotation,
  markQuotationAsSent,
  fetchPublicQuotation,
  convertQuotationToInvoice,
} from "../src/app/sales/quotations/actions";
import { buildQuotationWhatsappMessage } from "../src/lib/whatsapp-quotation";

async function runE2ETest() {
  console.log("=== STARTING END-TO-END TEST FOR SALES QUOTATIONS ===");

  // 1. Fetch an existing Organization, Location, Customer, and Item
  const org = (await db.select().from(organizations).limit(1))[0];
  if (!org) throw new Error("No organization found in DB");
  console.log(`✓ Organization: ${org.name} (${org.id})`);

  const loc = (await db.select().from(locations).where(eq(locations.organizationId, org.id)).limit(1))[0];
  if (!loc) throw new Error("No location found in DB");
  console.log(`✓ Location: ${loc.name} (${loc.id})`);

  let customer = (await db.select().from(customers).where(eq(customers.organizationId, org.id)).limit(1))[0];
  if (!customer) {
    console.log("Creating mock test customer...");
    const [c] = await db.insert(customers).values({
      organizationId: org.id,
      name: "Acme Enterprises",
      phone: "9876543210",
      taxId: "33AAAAA0000A1Z5",
      address: "123 Business Boulevard, Chennai",
    }).returning();
    customer = c;
  }
  console.log(`✓ Customer: ${customer.name} (Phone: ${customer.phone || '9876543210'})`);

  let item = (await db.select().from(items).limit(1))[0];
  if (!item) {
    throw new Error("No existing item found in DB");
  }
  console.log(`✓ Item: ${item.nameEn || item.nameTa} (${item.id})`);

  // 2. Test createQuotation (Draft)
  console.log("\n--- STEP 1: CREATE QUOTATION ---");
  const createRes = await createQuotation({
    organizationId: org.id,
    locationId: loc.id,
    docType: "QUOTATION",
    customerId: customer.id,
    customerName: customer.name,
    customerPhone: customer.phone || "9876543210",
    customerGstin: customer.taxId || "33AAAAA0000A1Z5",
    billingAddress: customer.address || "123 Business Boulevard",
    issueDate: new Date(),
    validUntil: new Date(Date.now() + 14 * 86400000),
    paymentTerms: "50% Advance, Balance on delivery",
    notes: "Special festive discount applied.",
    termsAndConditions: "Rates valid for 14 days.",
    lines: [
      {
        itemId: item.id,
        itemName: item.nameEn || "Sample Product",
        hsnCode: "0901",
        uom: item.unit || "Unit",
        quantity: 10,
        unitRate: 250.00,
        discountPercent: 10, // 10% disc => ₹2250 taxable
        gstRate: 5,         // 5% gst => ₹112.50
      },
    ],
  });

  if (!createRes.success || !createRes.data) {
    throw new Error(`Failed to create quotation: ${createRes.error}`);
  }
  const quotation = createRes.data;
  console.log(`✓ Created Quotation #${quotation.quotationNumber}`);
  console.log(`  Status: ${quotation.status}`);
  console.log(`  Subtotal: ₹${quotation.subtotalAmount}`);
  console.log(`  Discount: ₹${quotation.discountAmount}`);
  console.log(`  Grand Total: ₹${quotation.grandTotal}`);
  console.log(`  Public Token: ${quotation.publicToken}`);

  // 3. Test WhatsApp Message Builder
  console.log("\n--- STEP 2: BUILD WHATSAPP MESSAGE ---");
  const wa = buildQuotationWhatsappMessage({
    quotationNumber: quotation.quotationNumber,
    docType: quotation.docType,
    totalAmount: quotation.grandTotal,
    publicToken: quotation.publicToken,
    customerName: quotation.customerName,
    customerPhone: quotation.customerPhone,
    validUntil: quotation.validUntil,
    lines: [
      {
        itemName: item.nameEn,
        quantity: 10,
        uom: "Pack",
        unitRate: 250,
      },
    ],
  });
  console.log(`✓ Target Phone Formatted: ${wa.phoneDigits}`);
  console.log(`✓ Generated WhatsApp URL: ${wa.whatsappUrl.substring(0, 80)}...`);
  console.log(`✓ Message Preview:\n${wa.text}\n`);

  // 4. Test markQuotationAsSent
  console.log("--- STEP 3: MARK QUOTATION AS SENT ---");
  const sentRes = await markQuotationAsSent(quotation.id);
  if (!sentRes.success) throw new Error("Failed to mark quotation as sent");
  
  const fetchedAfterSent = await fetchQuotationById(quotation.id);
  console.log(`✓ Updated Status: ${fetchedAfterSent.data?.status}`);
  console.log(`✓ Is Sent To Customer: ${fetchedAfterSent.data?.isSentToCustomer}`);
  console.log(`✓ Sent At: ${fetchedAfterSent.data?.sentAt}`);

  // 5. Test Public Quotation Viewer (Customer facing link)
  console.log("\n--- STEP 4: PUBLIC QUOTATION ENDPOINT / VIEW ---");
  const publicRes = await fetchPublicQuotation(quotation.publicToken!);
  if (!publicRes.success || !publicRes.data) {
    throw new Error("Failed to load public quotation by token");
  }
  console.log(`✓ Public Customer View successfully verified.`);
  console.log(`  Company: ${publicRes.data.organization?.name}`);
  console.log(`  Line items count: ${publicRes.data.lines?.length}`);

  // 6. Test Edit Rates
  console.log("\n--- STEP 5: EDIT QUOTATION RATES ---");
  const editRes = await updateQuotation({
    id: quotation.id,
    organizationId: org.id,
    locationId: loc.id,
    customerId: customer.id,
    customerName: customer.name,
    customerPhone: customer.phone || "9876543210",
    validUntil: new Date(Date.now() + 10 * 86400000),
    paymentTerms: "100% advance payment",
    notes: "Rates renegotiated with client.",
    lines: [
      {
        itemId: item.id,
        itemName: item.nameEn || "Sample Product",
        uom: item.unit || "Unit",
        quantity: 20, // increased to 20
        unitRate: 240.00, // renegotiated rate to 240
        discountPercent: 5,
        gstRate: 5,
      },
    ],
  });
  if (!editRes.success) throw new Error("Failed to update quotation rates");

  const editedQuote = await fetchQuotationById(quotation.id);
  console.log(`✓ Successfully updated quotation:`);
  console.log(`  New Qty: ${editedQuote.data?.lines[0]?.quantity}`);
  console.log(`  New Unit Rate: ₹${editedQuote.data?.lines[0]?.unitRate}`);
  console.log(`  New Grand Total: ₹${editedQuote.data?.grandTotal}`);

  // 7. Test Convert Quotation into Sales Invoice
  console.log("\n--- STEP 6: CONVERT TO SALES INVOICE ---");
  const convertRes = await convertQuotationToInvoice(quotation.id);
  if (!convertRes.success || !convertRes.data) {
    throw new Error(`Failed to convert quotation: ${convertRes.error}`);
  }
  console.log(`✓ Quotation Converted!`);
  console.log(`  Created Sales Invoice #: ${convertRes.data.invoiceNumber}`);
  console.log(`  Invoice ID: ${convertRes.data.invoiceId}`);
  console.log(`  Invoice Grand Total: ₹${convertRes.data.grandTotal}`);

  const finalQuote = await fetchQuotationById(quotation.id);
  console.log(`✓ Final Quotation Status: ${finalQuote.data?.status}`);
  console.log(`✓ Linked Converted Invoice ID: ${finalQuote.data?.convertedInvoiceId}`);

  // 8. Test fetchQuotations listing & filtering
  console.log("\n--- STEP 7: LISTING & STATUS FILTERING ---");
  const listRes = await fetchQuotations(org.id, loc.id, {
    status: "CONVERTED",
  });
  console.log(`✓ Filtered CONVERTED quotations count: ${listRes.data?.length}`);

  console.log("\n=======================================================");
  console.log("🎉 ALL END-TO-END TESTS PASSED WITH 100% SUCCESS!");
  console.log("=======================================================\n");
}

runE2ETest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n❌ E2E Test Failed:", err);
    process.exit(1);
  });
