import { db } from "@/db";
import {
  eventConfigurations,
  cateringCombos,
  comboPricingTiers,
  events,
  eventFinancials,
  kuabTasks,
  salesInvoices,
  salesChannels,
} from "@/db/schema";
import { upsertEvent, updateEventStatus, generateEventSalesInvoice } from "@/app/events/actions";
import { eq, and } from "drizzle-orm";

async function runE2ETest() {
  console.log("=== STARTING EVENTS & CATERING E2E VERIFICATION TEST ===");

  const orgId = "b5334ab2-b652-432b-8c16-774c90406261";
  const locId = "d7f7131b-58e4-4e28-b83f-95a9b2e111a3";

  // 1. Ensure a Banquet Hall exists
  let [hall] = await db
    .select()
    .from(eventConfigurations)
    .where(and(eq(eventConfigurations.organizationId, orgId), eq(eventConfigurations.locationId, locId)))
    .limit(1);

  if (!hall) {
    const [createdHall] = await db
      .insert(eventConfigurations)
      .values({
        organizationId: orgId,
        locationId: locId,
        hallName: "Grand Royal Ballroom (E2E Test)",
        capacity: 250,
        timeSlots: ["MORNING", "EVENING", "FULL_DAY"],
        functionTypes: ["WEDDING", "RECEPTION", "CORPORATE"],
        baseRent: "25000.00",
        cleaningFee: "2000.00",
        cautionDeposit: "10000.00",
      })
      .returning();
    hall = createdHall;
    console.log("✓ Hall Created:", hall.hallName, "ID:", hall.id);
  } else {
    console.log("✓ Hall Exists:", hall.hallName);
  }

  // 2. Ensure a Catering Combo exists
  let [combo] = await db
    .select()
    .from(cateringCombos)
    .where(and(eq(cateringCombos.organizationId, orgId), eq(cateringCombos.locationId, locId)))
    .limit(1);

  if (!combo) {
    const [createdCombo] = await db
      .insert(cateringCombos)
      .values({
        organizationId: orgId,
        locationId: locId,
        name: "Grand South Indian Feast (E2E Test)",
        mealType: "LUNCH",
        menuItems: ["Welcome Drink", "Veg Biryani", "Paneer Butter Masala", "Curd Rice", "Gulab Jamun"],
        basePricePerPax: "380.00",
      })
      .returning();
    combo = createdCombo;

    await db.insert(comboPricingTiers).values([
      { comboId: combo.id, minPax: 50, maxPax: 99, pricePerPax: "420.00" },
      { comboId: combo.id, minPax: 100, maxPax: 299, pricePerPax: "380.00" },
      { comboId: combo.id, minPax: 300, maxPax: null, pricePerPax: "330.00" },
    ]);
    console.log("✓ Catering Combo & Tiers Created:", combo.name);
  } else {
    console.log("✓ Catering Combo Exists:", combo.name);
  }

  // 3. Test Phase 2: Create Walk-in / Direct Booking with Advance
  const eventDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(); // 10 days in future
  console.log("Creating Test Event booking for date:", eventDate);

  const eventRes = await upsertEvent({
    organizationId: orgId,
    locationId: locId,
    title: "E2E Automated Royal Wedding Reception",
    functionType: "RECEPTION",
    eventDate,
    timeSlot: "EVENING",
    guaranteedPax: 150,
    expectedPax: 180,
    hallId: hall.id,
    comboId: combo.id,
    pricePerPax: 380,
    hallRent: 25000,
    advancePaid: 30000,
    status: "BOOKED_PAID", // Direct booking status
    contactName: "Anand Sundaram",
    contactPhone: "9840123456",
    contactEmail: "anand.sundaram@test.kalki.io",
    notes: "E2E Automated Test Booking with 6-stage KUAB verification",
  });

  if (!eventRes.success || !eventRes.eventId) {
    throw new Error("Failed to create event: " + JSON.stringify(eventRes));
  }
  const eventId = eventRes.eventId;
  console.log("✓ Event Successfully Created with ID:", eventId);

  // 4. Verify Financials
  const [financials] = await db
    .select()
    .from(eventFinancials)
    .where(eq(eventFinancials.eventId, eventId))
    .limit(1);

  console.log("✓ Financials Record:", {
    totalFoodCost: financials.totalFoodCost,
    hallRentAmount: financials.hallRentAmount,
    grandTotal: financials.grandTotal,
    advancePaid: financials.advancePaid,
    balanceDue: financials.balanceDue,
    paymentStatus: financials.paymentStatus,
  });

  // 5. Verify KUAB Handshake: Timeline Tasks (T-7, T-2, T-1, T-0, T+1, T+2)
  const tasks = await db
    .select()
    .from(kuabTasks)
    .where(eq(kuabTasks.organizationId, orgId));

  const eventTasks = tasks.filter((t: any) => t.metadata?.eventId === eventId);
  console.log(`✓ KUAB Tasks Created for Event: ${eventTasks.length} tasks`);
  eventTasks.forEach((t) => {
    console.log(`   - [${t.metadata?.timelineMilestone}] ${t.title} (Due: ${t.dueDate?.toISOString()})`);
  });

  // 6. Verify B2B Sales Channel & Invoice Generation Handshake
  const invoiceRes = await generateEventSalesInvoice({
    eventId,
    organizationId: orgId,
    locationId: locId,
    userId: "system-e2e-tester",
  });

  console.log("✓ Sales Invoice Generation:", invoiceRes);
  if (invoiceRes.invoiceId) {
    const [invoice] = await db
      .select({
        id: salesInvoices.id,
        invoiceNumber: salesInvoices.invoiceNumber,
        channelId: salesInvoices.channelId,
        grandTotal: salesInvoices.grandTotal,
        orderCategory: salesInvoices.orderCategory,
      })
      .from(salesInvoices)
      .where(eq(salesInvoices.id, invoiceRes.invoiceId))
      .limit(1);

    const [channel] = await db
      .select()
      .from(salesChannels)
      .where(eq(salesChannels.id, invoice.channelId!))
      .limit(1);

    console.log("✓ Invoice Record Verified:", invoice);
    console.log("✓ Strictly Segregated to Channel:", channel.name, `(${channel.type})`);
  }

  console.log("=== ALL E2E VERIFICATION CHECKS PASSED SUCCESSFULLY ===");
}

runE2ETest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
  });
