"use server";

import { db } from "@/db";
import {
  events,
  eventConfigurations,
  cateringCombos,
  comboPricingTiers,
  eventFinancials,
  salesChannels,
  salesInvoices,
  salesInvoiceLines,
  customers,
  crmCustomerProfiles,
  crmLeads,
  salesReceipts,
  salesReceiptAllocations,
  journalEntries,
  journalLineItems,
  accounts,
} from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { emitEvent } from "@/domains/kuab/service";
import { sendWhatsAppTextMessage } from "@/lib/whatsapp";

// Helper: Ensure B2B Catering or Hall Booking Sales Channel exists
export async function getOrCreateCateringSalesChannel(organizationId: string, locationId?: string) {
  const existing = await db
    .select()
    .from(salesChannels)
    .where(
      and(
        eq(salesChannels.organizationId, organizationId),
        eq(salesChannels.name, "B2B Catering / Hall Booking")
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  const [created] = await db
    .insert(salesChannels)
    .values({
      organizationId,
      locationId: locationId || null,
      name: "B2B Catering / Hall Booking",
      type: "B2B",
      fulfillmentType: "SCHEDULED",
      requiresDispatch: false,
      isActive: true,
    })
    .returning();

  return created;
}

/**
 * Maps an event status to the corresponding CRM B2B Lead Stage:
 * ENQUIRY -> NEW_ENQUIRY
 * LIKELY -> CONTACTED
 * CONFIRMED_NO_ADVANCE -> QUOTE_SENT
 * BOOKED_PAID -> WON
 * AT_RISK -> CONTACTED
 * CANCELLED -> LOST
 * COMPLETED / COMPLETED_PENDING -> WON
 */
export async function mapEventStatusToLeadStage(eventStatus: string): Promise<string> {
  switch (eventStatus) {
    case "ENQUIRY":
      return "NEW_ENQUIRY";
    case "LIKELY":
      return "CONTACTED";
    case "CONFIRMED_NO_ADVANCE":
      return "QUOTE_SENT";
    case "BOOKED_PAID":
    case "COMPLETED":
    case "COMPLETED_PENDING":
      return "WON";
    case "AT_RISK":
      return "CONTACTED";
    case "CANCELLED":
      return "LOST";
    default:
      return "NEW_ENQUIRY";
  }
}

/**
 * Creates or synchronizes a corresponding CRM B2B Catering Lead for every event.
 */
export async function syncEventToCrmLead(params: {
  eventId: string;
  leadId?: string | null;
  organizationId: string;
  locationId: string;
  customerId?: string | null;
  title: string;
  contactName: string;
  contactPhone: string;
  contactEmail?: string | null;
  eventDate: Date;
  estimatedValue: number;
  eventStatus: string;
  notes?: string | null;
}): Promise<string | null> {
  const {
    eventId,
    leadId,
    organizationId,
    locationId,
    customerId,
    title,
    contactName,
    contactPhone,
    contactEmail,
    eventDate,
    estimatedValue,
    eventStatus,
    notes,
  } = params;

  const stage = await mapEventStatusToLeadStage(eventStatus);

  if (leadId) {
    // Update existing linked lead
    await db
      .update(crmLeads)
      .set({
        title,
        customerId: customerId || null,
        contactName,
        contactPhone,
        contactEmail: contactEmail || null,
        estimatedValue: estimatedValue.toFixed(2),
        eventDate,
        stage,
        notes: notes || null,
        updatedAt: new Date(),
      })
      .where(eq(crmLeads.id, leadId));
    return leadId;
  }

  // Check if a lead already exists for this title / event
  const [existingLead] = await db
    .select()
    .from(crmLeads)
    .where(
      and(
        eq(crmLeads.organizationId, organizationId),
        eq(crmLeads.contactPhone, contactPhone),
        eq(crmLeads.title, title)
      )
    )
    .limit(1);

  if (existingLead) {
    await db
      .update(crmLeads)
      .set({
        customerId: customerId || existingLead.customerId,
        stage,
        estimatedValue: estimatedValue.toFixed(2),
        eventDate,
        updatedAt: new Date(),
      })
      .where(eq(crmLeads.id, existingLead.id));

    // Link back to event
    await db.update(events).set({ leadId: existingLead.id }).where(eq(events.id, eventId));
    return existingLead.id;
  }

  // Create new CRM Lead in B2B / Catering pipeline
  const [createdLead] = await db
    .insert(crmLeads)
    .values({
      organizationId,
      locationId: locationId || null,
      customerId: customerId || null,
      title: title.trim(),
      leadType: "CATERING",
      contactName: contactName.trim(),
      contactPhone: contactPhone.trim(),
      contactEmail: contactEmail?.trim() || null,
      estimatedValue: estimatedValue.toFixed(2),
      eventDate,
      stage,
      notes: notes?.trim() || `Auto-linked from Events & Catering booking: ${title}`,
    })
    .returning();

  // Link lead ID back to event
  await db.update(events).set({ leadId: createdLead.id }).where(eq(events.id, eventId));
  return createdLead.id;
}

// ----------------------------------------------------
// 1. EVENT CONFIGURATIONS (Halls, Combos, Tiers)
// ----------------------------------------------------

export async function getEventConfigurations(organizationId: string, locationId: string) {
  const halls = await db
    .select()
    .from(eventConfigurations)
    .where(
      and(
        eq(eventConfigurations.organizationId, organizationId),
        eq(eventConfigurations.locationId, locationId)
      )
    )
    .orderBy(desc(eventConfigurations.createdAt));

  const combos = await db
    .select()
    .from(cateringCombos)
    .where(
      and(
        eq(cateringCombos.organizationId, organizationId),
        eq(cateringCombos.locationId, locationId)
      )
    )
    .orderBy(desc(cateringCombos.createdAt));

  const tiers = await db
    .select()
    .from(comboPricingTiers)
    .orderBy(comboPricingTiers.minPax);

  return { halls, combos, tiers };
}

export async function upsertHallConfiguration(params: {
  id?: string;
  organizationId: string;
  locationId: string;
  hallName: string;
  capacity: number;
  timeSlots: string[];
  functionTypes: string[];
  baseRent: number;
  cleaningFee: number;
  cautionDeposit: number;
}) {
  if (params.id) {
    await db
      .update(eventConfigurations)
      .set({
        hallName: params.hallName,
        capacity: params.capacity,
        timeSlots: params.timeSlots,
        functionTypes: params.functionTypes,
        baseRent: params.baseRent.toString(),
        cleaningFee: params.cleaningFee.toString(),
        cautionDeposit: params.cautionDeposit.toString(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(eventConfigurations.id, params.id),
          eq(eventConfigurations.organizationId, params.organizationId),
          eq(eventConfigurations.locationId, params.locationId)
        )
      );
  } else {
    await db.insert(eventConfigurations).values({
      organizationId: params.organizationId,
      locationId: params.locationId,
      hallName: params.hallName,
      capacity: params.capacity,
      timeSlots: params.timeSlots,
      functionTypes: params.functionTypes,
      baseRent: params.baseRent.toString(),
      cleaningFee: params.cleaningFee.toString(),
      cautionDeposit: params.cautionDeposit.toString(),
    });
  }

  revalidatePath("/settings/events");
  revalidatePath("/events");
  return { success: true };
}

export async function upsertCateringCombo(params: {
  id?: string;
  organizationId: string;
  locationId: string;
  name: string;
  mealType: string;
  description?: string;
  menuItems: string[];
  basePricePerPax: number;
  tiers?: { minPax: number; maxPax?: number | null; pricePerPax: number }[];
}) {
  let comboId = params.id;

  if (comboId) {
    await db
      .update(cateringCombos)
      .set({
        name: params.name,
        mealType: params.mealType,
        description: params.description || null,
        menuItems: params.menuItems,
        basePricePerPax: params.basePricePerPax.toString(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(cateringCombos.id, comboId),
          eq(cateringCombos.organizationId, params.organizationId),
          eq(cateringCombos.locationId, params.locationId)
        )
      );

    // Replace pricing tiers
    if (params.tiers) {
      await db.delete(comboPricingTiers).where(eq(comboPricingTiers.comboId, comboId));
    }
  } else {
    const [created] = await db
      .insert(cateringCombos)
      .values({
        organizationId: params.organizationId,
        locationId: params.locationId,
        name: params.name,
        mealType: params.mealType,
        description: params.description || null,
        menuItems: params.menuItems,
        basePricePerPax: params.basePricePerPax.toString(),
      })
      .returning();
    comboId = created.id;
  }

  if (params.tiers && params.tiers.length > 0 && comboId) {
    for (const t of params.tiers) {
      await db.insert(comboPricingTiers).values({
        comboId,
        minPax: t.minPax,
        maxPax: t.maxPax ?? null,
        pricePerPax: t.pricePerPax.toString(),
      });
    }
  }

  revalidatePath("/settings/events");
  revalidatePath("/events");
  return { success: true, comboId };
}

export async function deleteHallConfiguration(params: {
  id: string;
  organizationId: string;
  locationId: string;
}) {
  await db
    .delete(eventConfigurations)
    .where(
      and(
        eq(eventConfigurations.id, params.id),
        eq(eventConfigurations.organizationId, params.organizationId),
        eq(eventConfigurations.locationId, params.locationId)
      )
    );

  revalidatePath("/settings/events");
  revalidatePath("/events");
  return { success: true };
}

export async function deleteCateringCombo(params: {
  id: string;
  organizationId: string;
  locationId: string;
}) {
  await db
    .delete(cateringCombos)
    .where(
      and(
        eq(cateringCombos.id, params.id),
        eq(cateringCombos.organizationId, params.organizationId),
        eq(cateringCombos.locationId, params.locationId)
      )
    );

  revalidatePath("/settings/events");
  revalidatePath("/events");
  return { success: true };
}

// ----------------------------------------------------
// 2. EVENTS CRUD & WORKFLOW
// ----------------------------------------------------

export async function getEvents(organizationId: string, locationId: string) {
  const query = db
    .select({
      event: events,
      hall: eventConfigurations,
      combo: cateringCombos,
      financials: eventFinancials,
      customer: customers,
    })
    .from(events)
    .leftJoin(eventConfigurations, eq(events.hallId, eventConfigurations.id))
    .leftJoin(cateringCombos, eq(events.comboId, cateringCombos.id))
    .leftJoin(eventFinancials, eq(events.id, eventFinancials.eventId))
    .leftJoin(customers, eq(events.customerId, customers.id))
    .where(
      and(
        eq(events.organizationId, organizationId),
        eq(events.locationId, locationId)
      )
    )
    .orderBy(events.eventDate);

  const results = await query;
  return results;
}

export async function upsertEvent(params: {
  id?: string;
  organizationId: string;
  locationId: string;
  title: string;
  functionType: string;
  eventDate: string; // ISO
  timeSlot: string;
  guaranteedPax: number;
  expectedPax: number;
  hallId?: string | null;
  comboId?: string | null;
  pricePerPax?: number;
  hallRent?: number;
  contactName: string;
  contactPhone: string;
  contactEmail?: string;
  specialInstructions?: string;
  dietaryRestrictions?: string;
  notes?: string;
  status?: string;
  // Financial inputs
  advancePaid?: number;
  discountAmount?: number;
}) {
  const pax = params.guaranteedPax || 50;
  let pPerPax = params.pricePerPax || 0;
  let hRent = params.hallRent || 0;

  // Auto-resolve combo pricing tier if comboId specified and pricePerPax not manually set
  if (params.comboId && (!pPerPax || pPerPax === 0)) {
    const tiers = await db
      .select()
      .from(comboPricingTiers)
      .where(eq(comboPricingTiers.comboId, params.comboId))
      .orderBy(comboPricingTiers.minPax);

    let matchedTier = null;
    for (const tier of tiers) {
      if (pax >= tier.minPax && (tier.maxPax === null || pax <= tier.maxPax)) {
        matchedTier = tier;
        break;
      }
    }

    if (matchedTier) {
      pPerPax = Number(matchedTier.pricePerPax);
    } else {
      const [combo] = await db
        .select()
        .from(cateringCombos)
        .where(eq(cateringCombos.id, params.comboId))
        .limit(1);
      if (combo) pPerPax = Number(combo.basePricePerPax);
    }
  }

  // Auto-resolve hall rent if hallId specified and hallRent not manually set
  if (params.hallId && (!hRent || hRent === 0)) {
    const [hall] = await db
      .select()
      .from(eventConfigurations)
      .where(eq(eventConfigurations.id, params.hallId))
      .limit(1);
    if (hall) hRent = Number(hall.baseRent);
  }

  // 1. Customer Handoff & Tagging (CRM integration)
  let customerId: string | null = null;
  if (params.contactPhone) {
    const [existingCustomer] = await db
      .select()
      .from(customers)
      .where(
        and(
          eq(customers.organizationId, params.organizationId),
          eq(customers.phone, params.contactPhone.trim())
        )
      )
      .limit(1);

    if (existingCustomer) {
      customerId = existingCustomer.id;
    } else {
      const [newCustomer] = await db
        .insert(customers)
        .values({
          organizationId: params.organizationId,
          name: params.contactName,
          phone: params.contactPhone.trim(),
          email: params.contactEmail || null,
        })
        .returning();
      customerId = newCustomer.id;
    }

    // Ensure customer has CRM Profile with tag ["HIGH_VALUE_CATERING"]
    if (customerId) {
      const [crmProfile] = await db
        .select()
        .from(crmCustomerProfiles)
        .where(eq(crmCustomerProfiles.customerId, customerId))
        .limit(1);

      if (crmProfile) {
        const currentTags: string[] = Array.isArray(crmProfile.tags) ? (crmProfile.tags as string[]) : [];
        if (!currentTags.includes("HIGH_VALUE_CATERING")) {
          await db
            .update(crmCustomerProfiles)
            .set({
              tags: [...currentTags, "HIGH_VALUE_CATERING"],
              updatedAt: new Date(),
            })
            .where(eq(crmCustomerProfiles.id, crmProfile.id));
        }
      } else {
        await db.insert(crmCustomerProfiles).values({
          organizationId: params.organizationId,
          customerId,
          tags: ["HIGH_VALUE_CATERING"],
          rfmSegment: "NEW",
          lifecycleStage: "NEW",
          priorityScore: 80, // High-value prospect
        });
      }
    }
  }

  const foodCost = pax * pPerPax;
  const grandTotal = foodCost + hRent - (params.discountAmount || 0);
  const advance = params.advancePaid || 0;
  const balance = Math.max(0, grandTotal - advance);
  const paymentStatus = advance >= grandTotal ? "PAID" : advance > 0 ? "PARTIAL" : "UNPAID";

  let eventId = params.id;
  const initialStatus = params.status || (advance > 0 ? "BOOKED_PAID" : "ENQUIRY");

  if (eventId) {
    await db
      .update(events)
      .set({
        title: params.title,
        functionType: params.functionType,
        eventDate: new Date(params.eventDate),
        timeSlot: params.timeSlot,
        guaranteedPax: pax,
        expectedPax: params.expectedPax || pax,
        hallId: params.hallId || null,
        comboId: params.comboId || null,
        pricePerPax: pPerPax.toString(),
        hallRent: hRent.toString(),
        contactName: params.contactName,
        contactPhone: params.contactPhone,
        contactEmail: params.contactEmail || null,
        specialInstructions: params.specialInstructions || null,
        dietaryRestrictions: params.dietaryRestrictions || null,
        notes: params.notes || null,
        customerId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(events.id, eventId),
          eq(events.organizationId, params.organizationId),
          eq(events.locationId, params.locationId)
        )
      );

    // Update financials
    await db
      .update(eventFinancials)
      .set({
        totalFoodCost: foodCost.toString(),
        hallRentAmount: hRent.toString(),
        discountAmount: (params.discountAmount || 0).toString(),
        grandTotal: grandTotal.toString(),
        advancePaid: advance.toString(),
        balanceDue: balance.toString(),
        paymentStatus,
        updatedAt: new Date(),
      })
      .where(eq(eventFinancials.eventId, eventId));
  } else {
    const [newEvent] = await db
      .insert(events)
      .values({
        organizationId: params.organizationId,
        locationId: params.locationId,
        customerId,
        hallId: params.hallId || null,
        comboId: params.comboId || null,
        title: params.title,
        functionType: params.functionType,
        eventDate: new Date(params.eventDate),
        timeSlot: params.timeSlot,
        guaranteedPax: pax,
        expectedPax: params.expectedPax || pax,
        pricePerPax: pPerPax.toString(),
        hallRent: hRent.toString(),
        status: initialStatus,
        contactName: params.contactName,
        contactPhone: params.contactPhone,
        contactEmail: params.contactEmail || null,
        specialInstructions: params.specialInstructions || null,
        dietaryRestrictions: params.dietaryRestrictions || null,
        notes: params.notes || null,
      })
      .returning();

    eventId = newEvent.id;

    // Insert financials
    await db.insert(eventFinancials).values({
      organizationId: params.organizationId,
      eventId,
      totalFoodCost: foodCost.toString(),
      hallRentAmount: hRent.toString(),
      discountAmount: (params.discountAmount || 0).toString(),
      grandTotal: grandTotal.toString(),
      advancePaid: advance.toString(),
      balanceDue: balance.toString(),
      paymentStatus,
    });

    // WhatsApp Auto-Responder (Phase 2): When logged as ENQUIRY
    if (initialStatus === "ENQUIRY" && params.contactPhone) {
      try {
        const welcomeMessage = `Namaste ${params.contactName}! 🙏\n\nThank you for inquiring with Kalki Events & Catering for your ${params.functionType.toLowerCase()} on ${new Date(params.eventDate).toLocaleDateString()}.\n\nWe have received your requirement for ${pax} guests. Our banquet and catering event coordinators are reviewing your date. Here is our menu catalog & catering packages: https://kalki.menu/catering\n\nFor instant queries, feel free to reply directly to this message.`;
        await sendWhatsAppTextMessage(params.contactPhone, welcomeMessage, params.organizationId);
      } catch (waErr) {
        console.error("[Events Auto-Responder Error]:", waErr);
      }
    }
  }

  // Synchronize / Link with CRM B2B & Catering Sub-module
  try {
    const existingEvt = eventId
      ? (await db.select({ leadId: events.leadId }).from(events).where(eq(events.id, eventId)).limit(1))[0]
      : null;

    await syncEventToCrmLead({
      eventId,
      leadId: existingEvt?.leadId || null,
      organizationId: params.organizationId,
      locationId: params.locationId,
      customerId,
      title: `${params.title} (${pax} Pax)`,
      contactName: params.contactName,
      contactPhone: params.contactPhone,
      contactEmail: params.contactEmail,
      eventDate: new Date(params.eventDate),
      estimatedValue: grandTotal,
      eventStatus: initialStatus,
      notes: params.notes || `Function: ${params.functionType} | Slot: ${params.timeSlot}`,
    });
  } catch (syncErr) {
    console.error("[Events-CRM-Sync Error]:", syncErr);
  }

  // If status is CONFIRMED_NO_ADVANCE or BOOKED_PAID, trigger KUAB Event Bus handshake
  if (initialStatus === "CONFIRMED_NO_ADVANCE" || initialStatus === "BOOKED_PAID") {
    await updateEventStatus({
      eventId,
      organizationId: params.organizationId,
      locationId: params.locationId,
      newStatus: initialStatus,
    });
  }

  // Automatic Invoice & Receipt Handshake: If advance payment was made, generate invoice & finance receipt immediately
  if (advance > 0 || initialStatus === "BOOKED_PAID") {
    try {
      await generateEventSalesInvoice({
        eventId,
        organizationId: params.organizationId,
        locationId: params.locationId,
        userId: "00000000-0000-0000-0000-000000000000",
      });
    } catch (genErr) {
      console.error("[upsertEvent Auto-Invoice Error]:", genErr);
    }
  }

  try {
    revalidatePath("/events");
    revalidatePath("/crm/leads");
    revalidatePath("/sales/invoices");
    revalidatePath("/finance/sales-receivables/receipts");
    revalidatePath("/finance/sales-receivables/invoices");
  } catch {
    // Graceful fallback when invoked outside Next.js request context (e.g. standalone scripts/tests)
  }
  return { success: true, eventId };
}

// ----------------------------------------------------
// 3. KUAB EVENT BUS HANDSHAKE & STATUS TRANSITIONS
// ----------------------------------------------------

export async function updateEventStatus(params: {
  eventId: string;
  organizationId: string;
  locationId: string;
  newStatus: string;
}) {
  const { eventId, organizationId, locationId, newStatus } = params;

  const [event] = await db
    .select()
    .from(events)
    .where(
      and(
        eq(events.id, eventId),
        eq(events.organizationId, organizationId),
        eq(events.locationId, locationId)
      )
    )
    .limit(1);

  if (!event) return { success: false, error: "Event not found" };

  const isConfirmedTransition =
    (newStatus === "CONFIRMED_NO_ADVANCE" || newStatus === "BOOKED_PAID") &&
    !event.confirmedAt;

  await db
    .update(events)
    .set({
      status: newStatus,
      confirmedAt: isConfirmedTransition ? new Date() : event.confirmedAt,
      updatedAt: new Date(),
    })
    .where(eq(events.id, eventId));

  // Sync updated status to linked CRM Lead
  const targetLeadStage = await mapEventStatusToLeadStage(newStatus);
  try {
    if (event.leadId) {
      await db
        .update(crmLeads)
        .set({
          stage: targetLeadStage,
          updatedAt: new Date(),
        })
        .where(eq(crmLeads.id, event.leadId));
    } else {
      // If lead was not linked yet, find or create
      await syncEventToCrmLead({
        eventId: event.id,
        organizationId: event.organizationId,
        locationId: event.locationId,
        customerId: event.customerId,
        title: `${event.title} (${event.guaranteedPax} Pax)`,
        contactName: event.contactName,
        contactPhone: event.contactPhone,
        contactEmail: event.contactEmail,
        eventDate: event.eventDate,
        estimatedValue: Number(event.pricePerPax || 0) * event.guaranteedPax + Number(event.hallRent || 0),
        eventStatus: newStatus,
        notes: event.notes,
      });
    }
  } catch (crmErr) {
    console.error("[updateEventStatus CRM Sync Error]:", crmErr);
  }

  // KUAB Handshake: Trigger Kitchen & Purchasing Tasks if transitioning to Confirmed
  if (isConfirmedTransition) {
    await emitEvent({
      organizationId,
      eventType: "EVENT_CONFIRMED",
      sourceModule: "EVENTS_CATERING",
      payload: {
        organizationId,
        locationId,
        eventId,
        eventTitle: event.title,
        eventDate: event.eventDate,
        guaranteedPax: event.guaranteedPax,
        contactName: event.contactName,
        contactPhone: event.contactPhone,
      },
    });
  }

  try {
    revalidatePath("/events");
    revalidatePath("/crm/leads");
  } catch {
    // Graceful fallback
  }
  return { success: true, newStatus };
}

// ----------------------------------------------------
// 4. FINANCIAL HANDSHAKE (Sales Channel Segregation)
// ----------------------------------------------------

export async function generateEventSalesInvoice(params: {
  eventId: string;
  organizationId: string;
  locationId: string;
  userId: string;
}) {
  const { eventId, organizationId, locationId, userId } = params;

  // 1. Fetch Event & Financials
  const [event] = await db
    .select()
    .from(events)
    .where(
      and(
        eq(events.id, eventId),
        eq(events.organizationId, organizationId),
        eq(events.locationId, locationId)
      )
    )
    .limit(1);

  if (!event) return { success: false, error: "Event not found" };

  const [financial] = await db
    .select()
    .from(eventFinancials)
    .where(eq(eventFinancials.eventId, eventId))
    .limit(1);

  if (!financial) return { success: false, error: "Financial record not found" };

  if (financial.invoiceId) {
    return { success: true, invoiceId: financial.invoiceId, message: "Invoice already generated." };
  }

  // 2. Fetch or Create "B2B Catering / Hall Booking" Sales Channel
  const cateringChannel = await getOrCreateCateringSalesChannel(organizationId, locationId);

  // 3. Ensure Customer ID exists
  let customerId = event.customerId;
  if (!customerId) {
    const [c] = await db
      .insert(customers)
      .values({
        organizationId,
        name: event.contactName,
        phone: event.contactPhone,
        email: event.contactEmail || null,
      })
      .returning();
    customerId = c.id;
    await db.update(events).set({ customerId }).where(eq(events.id, eventId));
  }

  const invoiceNumber = `INV-EVT-${Date.now().toString().slice(-6)}`;
  const grandTotal = Number(financial.grandTotal);
  const advancePaid = Number(financial.advancePaid || 0);
  const balanceDue = Math.max(0, grandTotal - advancePaid);
  const paymentStatus = balanceDue <= 0 ? "PAID" : advancePaid > 0 ? "PARTIAL" : "UNPAID";

  // 4. Generate Sales Invoice strictly segregated to the B2B Catering channel
  const [invoice] = await db
    .insert(salesInvoices)
    .values({
      organizationId,
      locationId,
      channelId: cateringChannel.id, // STRICT CHANNEL SEGREGATION
      customerId,
      customerName: event.contactName,
      invoiceNumber,
      invoiceDate: new Date(),
      issueDate: new Date(),
      totalAmount: grandTotal.toString(),
      subtotalAmount: grandTotal.toString(),
      taxableAmount: grandTotal.toString(),
      grandTotal: grandTotal.toString(),
      advancePaid: advancePaid.toFixed(2),
      balanceDue: balanceDue.toFixed(2),
      paymentStatus,
      paymentMode: advancePaid > 0 ? "ADVANCE_SETTLED" : "ON_ACCOUNT",
      status: "ISSUED",
      createdUserId: userId,
      orderCategory: "CATERING_AND_EVENTS",
    })
    .returning();

  // 5. Add Invoice Lines (Food Catering & Hall Rent)
  if (Number(financial.totalFoodCost) > 0) {
    await db.insert(salesInvoiceLines).values({
      invoiceId: invoice.id,
      description: `Catering Package for ${event.title} (${event.guaranteedPax} Pax)`,
      unitPrice: event.pricePerPax,
      totalAmount: financial.totalFoodCost,
      itemId: "00000000-0000-0000-0000-000000000001", // Virtual Catering Service Item
      itemDescription: `Catering - ${event.guaranteedPax} Pax`,
      uom: "PAX",
      quantity: event.guaranteedPax.toString(),
      unitRate: event.pricePerPax,
      gstRate: "0.00",
      taxableAmount: financial.totalFoodCost,
      lineTotal: financial.totalFoodCost,
    });
  }

  if (Number(financial.hallRentAmount) > 0) {
    await db.insert(salesInvoiceLines).values({
      invoiceId: invoice.id,
      description: `Hall Rent Booking - ${event.timeSlot}`,
      unitPrice: financial.hallRentAmount,
      totalAmount: financial.hallRentAmount,
      itemId: "00000000-0000-0000-0000-000000000002", // Virtual Hall Rent Service Item
      itemDescription: `Hall Rent - ${event.timeSlot}`,
      uom: "SLOT",
      quantity: "1.000",
      unitRate: financial.hallRentAmount,
      gstRate: "0.00",
      taxableAmount: financial.hallRentAmount,
      lineTotal: financial.hallRentAmount,
    });
  }

  // 6. If Advance Payment exists, generate Finance Receipt and Double-Entry Journal Entry
  let receiptId: string | null = null;
  if (advancePaid > 0) {
    try {
      const receiptNumber = `REC-EVT-${Date.now().toString().slice(-6)}`;
      const [receipt] = await db
        .insert(salesReceipts)
        .values({
          organizationId,
          locationId,
          customerId,
          receiptNumber,
          receiptDate: new Date(),
          amount: advancePaid.toFixed(2),
          paymentMethod: "ADVANCE_PAYMENT",
          referenceNumber: invoiceNumber,
          notes: `Advance payment for Booking: ${event.title} (${invoiceNumber})`,
        })
        .returning();
      receiptId = receipt.id;

      // Allocate advance receipt to this invoice
      await db.insert(salesReceiptAllocations).values({
        receiptId: receipt.id,
        invoiceId: invoice.id,
        amountApplied: advancePaid.toFixed(2),
      });

      // Post Double-Entry Journal into General Ledger
      const allAccounts = await db
        .select()
        .from(accounts)
        .where(eq(accounts.organizationId, organizationId));

      const arAccount = allAccounts.find(
        (a) =>
          a.controlAccountType === "ACCOUNTS_RECEIVABLE" ||
          a.controlAccountType === "CUSTOMER_RECEIVABLE" ||
          a.code === "1210" ||
          a.code === "AR-CTRL" ||
          a.name.toLowerCase().includes("accounts receivable")
      );

      const cashAccount = allAccounts.find(
        (a) =>
          a.controlAccountType === "CASH_AND_BANK" ||
          a.controlAccountType === "CASH" ||
          a.code === "1110" ||
          a.code === "1130" ||
          a.code === "CASH-001" ||
          a.code === "BANK-001" ||
          a.name.toLowerCase().includes("cash in hand") ||
          a.name.toLowerCase().includes("bank")
      );

      if (arAccount && cashAccount) {
        const entryNumber = `JE-REC-${Date.now().toString().slice(-6)}`;
        const [je] = await db
          .insert(journalEntries)
          .values({
            organizationId,
            entryNumber,
            entryDate: new Date().toISOString().split("T")[0],
            narration: `Event Advance Receipt: ${event.title} (Ref: ${invoiceNumber})`,
            sourceModule: "RECEIVABLES",
            sourceReferenceId: receipt.id,
            totalAmount: advancePaid.toFixed(2),
            status: "POSTED",
            createdById: userId,
          })
          .returning();

        await db.insert(journalLineItems).values([
          {
            journalEntryId: je.id,
            accountId: cashAccount.id,
            locationId,
            partyId: customerId,
            partyType: "CUSTOMER",
            debit: advancePaid.toFixed(2),
            credit: "0",
            narration: `Advance received for ${event.title}`,
          },
          {
            journalEntryId: je.id,
            accountId: arAccount.id,
            locationId,
            partyId: customerId,
            partyType: "CUSTOMER",
            debit: "0",
            credit: advancePaid.toFixed(2),
            narration: `AR offset for advance on ${invoiceNumber}`,
          },
        ]);
      }
    } catch (rcptErr) {
      console.error("[generateEventSalesInvoice Receipt Error]:", rcptErr);
    }
  }

  // 7. Link invoice back to event financials
  await db
    .update(eventFinancials)
    .set({
      invoiceId: invoice.id,
      channelId: cateringChannel.id,
      paymentStatus,
      updatedAt: new Date(),
    })
    .where(eq(eventFinancials.eventId, eventId));

  try {
    revalidatePath("/events");
    revalidatePath("/sales/invoices");
    revalidatePath("/finance/sales-receivables/receipts");
    revalidatePath("/finance/sales-receivables/invoices");
  } catch {
    // Graceful fallback
  }
  return { success: true, invoiceId: invoice.id, invoiceNumber, receiptId };
}
