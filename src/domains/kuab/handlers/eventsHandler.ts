import { db } from "@/db";
import { kuabTasks, events } from "@/db/schema";
import { eq } from "drizzle-orm";

export interface EventConfirmedPayload {
  organizationId: string;
  locationId: string;
  eventId: string;
  eventTitle: string;
  eventDate: string | Date;
  guaranteedPax: number;
  contactName: string;
  contactPhone: string;
}

/**
 * Handles the Complete KUAB Handshake when an Event moves to CONFIRMED / BOOKED:
 * Spawns a timeline of 6 automated tasks to the KUAB Event Bus:
 * 1. T-7 Days: "Allocate Service Personnel & Wait Staff"
 * 2. T-2 Days (48h): "Kitchen Prep: Soak batters, marinate"
 * 3. T-1 Day (24h): "Purchasing: Order perishable groceries, Ice Cream, Pan Beeda"
 * 4. T-0 (Event Day): "Floor Manager: Execution and Quality Check"
 * 5. T+1 Day: "Finance: Clear pending billing/due balance"
 * 6. T+2 Days: "CRM: Send WhatsApp Feedback/Review message"
 */
export async function handleEventConfirmed(payload: EventConfirmedPayload) {
  const { organizationId, locationId, eventId, eventTitle, eventDate, guaranteedPax, contactName, contactPhone } = payload;

  const eventTime = new Date(eventDate).getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  // Task due dates
  const tMinus7Days = new Date(eventTime - 7 * dayMs);
  const tMinus2Days = new Date(eventTime - 2 * dayMs);
  const tMinus1Day = new Date(eventTime - 1 * dayMs);
  const t0EventDay = new Date(eventTime);
  const tPlus1Day = new Date(eventTime + 1 * dayMs);
  const tPlus2Days = new Date(eventTime + 2 * dayMs);

  // 1. T-7 Days: Allocate Staff
  const [staffTask] = await db
    .insert(kuabTasks)
    .values({
      organizationId,
      title: `[Service Staff] Allocate Personnel & Wait Staff - ${eventTitle}`,
      description: `Roster banquet servers, captains, and cleaners for ${guaranteedPax} Pax event. Contact: ${contactName} (${contactPhone}).`,
      status: "PENDING",
      dueDate: tMinus7Days,
      metadata: {
        eventId,
        locationId,
        department: "OPERATIONS",
        roleName: "Banquet Captain / HR",
        timelineMilestone: "T-7_DAYS",
        pax: guaranteedPax,
      },
    })
    .returning();

  // 2. T-2 Days (48h): Kitchen Prep
  const [kitchenTask] = await db
    .insert(kuabTasks)
    .values({
      organizationId,
      title: `[Kitchen] Prep: Soak batters, marinate ingredients - ${eventTitle}`,
      description: `Soak Idli/Dosa batter, prepare spice pastes, marinate for ${guaranteedPax} Pax catering event. Contact: ${contactName} (${contactPhone}).`,
      status: "PENDING",
      dueDate: tMinus2Days,
      metadata: {
        eventId,
        locationId,
        department: "KITCHEN",
        roleName: "Kitchen In-Charge",
        timelineMilestone: "T-2_DAYS_48H",
        pax: guaranteedPax,
      },
    })
    .returning();

  // 3. T-1 Day (24h): Purchasing
  const [purchasingTask] = await db
    .insert(kuabTasks)
    .values({
      organizationId,
      title: `[Purchasing] Order perishable groceries, Ice Cream, Pan Beeda - ${eventTitle}`,
      description: `Place and verify vendor POs for vegetables, milk, curds, ice cream, pan beeda and disposables for ${guaranteedPax} Pax catering event.`,
      status: "PENDING",
      dueDate: tMinus1Day,
      metadata: {
        eventId,
        locationId,
        department: "PURCHASING",
        roleName: "Purchasing Manager",
        timelineMilestone: "T-1_DAY_24H",
        pax: guaranteedPax,
      },
    })
    .returning();

  // 4. T-0 (Event Day): Floor Manager
  const [floorTask] = await db
    .insert(kuabTasks)
    .values({
      organizationId,
      title: `[Floor Operations] Execution, Buffet Setup & Quality Check - ${eventTitle}`,
      description: `Verify buffet counter display, food temperature, hand-wash area, live counters, and dining readiness for ${guaranteedPax} Pax.`,
      status: "PENDING",
      dueDate: t0EventDay,
      metadata: {
        eventId,
        locationId,
        department: "OPERATIONS",
        roleName: "Floor Manager",
        timelineMilestone: "T-0_EVENT_DAY",
        pax: guaranteedPax,
      },
    })
    .returning();

  // 5. T+1 Day: Finance
  const [financeTask] = await db
    .insert(kuabTasks)
    .values({
      organizationId,
      title: `[Finance] Clear pending billing / settle due balance - ${eventTitle}`,
      description: `Verify advance adjustments, generate final B2B invoice, collect balance receivable from client ${contactName} (${contactPhone}).`,
      status: "PENDING",
      dueDate: tPlus1Day,
      metadata: {
        eventId,
        locationId,
        department: "FINANCE",
        roleName: "Accountant / Cashier",
        timelineMilestone: "T+1_DAY",
        pax: guaranteedPax,
      },
    })
    .returning();

  // 6. T+2 Days: CRM Feedback
  const [crmTask] = await db
    .insert(kuabTasks)
    .values({
      organizationId,
      title: `[CRM] Send WhatsApp Feedback & Review Request - ${eventTitle}`,
      description: `Dispatch automated review link & catering satisfaction survey on WhatsApp to ${contactName} (${contactPhone}).`,
      status: "PENDING",
      dueDate: tPlus2Days,
      metadata: {
        eventId,
        locationId,
        department: "CRM",
        roleName: "CRM Executive",
        timelineMilestone: "T+2_DAYS",
        pax: guaranteedPax,
      },
    })
    .returning();

  // Update events table with primary task references
  await db
    .update(events)
    .set({
      kuabKitchenTaskId: kitchenTask.id,
      kuabPurchasingTaskId: purchasingTask.id,
      updatedAt: new Date(),
    })
    .where(eq(events.id, eventId));

  return {
    success: true,
    tasks: {
      staffTaskId: staffTask.id,
      kitchenTaskId: kitchenTask.id,
      purchasingTaskId: purchasingTask.id,
      floorTaskId: floorTask.id,
      financeTaskId: financeTask.id,
      crmTaskId: crmTask.id,
    },
  };
}
