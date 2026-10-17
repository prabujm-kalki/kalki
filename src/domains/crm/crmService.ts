"use server";

import { db } from "@/db";
import {
  customers,
  crmCustomerProfiles,
  crmLeads,
  crmTickets,
  crmConsentLogs,
  salesInvoices,
  whatsappCommunications,
  locations,
  kuabEvents,
  kuabTasks,
  marketingCampaigns,
  campaignAudiences,
  crmIntelligenceConfigurations,
  events,
} from "@/db/schema";
import { eq, and, desc, sql, ilike, or, lte, gte } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// ---------------------------------------------------------------------------
// 1. CUSTOMERS 360 & LIFECYCLE
// ---------------------------------------------------------------------------

export async function addCustomer(params: {
  organizationId: string;
  name: string;
  phone?: string;
  email?: string;
  customerType?: string;
  preferredLocationId?: string;
}) {
  try {
    const { organizationId, name, phone, email, customerType = "RETAIL", preferredLocationId } = params;
    if (!name.trim()) return { success: false, error: "Customer name is required" };

    const [newCustomer] = await db
      .insert(customers)
      .values({
        organizationId,
        name: name.trim(),
        phone: phone?.trim() || null,
        email: email?.trim() || null,
      })
      .returning();

    // Create companion CRM Profile
    await db.insert(crmCustomerProfiles).values({
      organizationId,
      customerId: newCustomer.id,
      customerType,
      preferredLocationId: preferredLocationId || null,
      priorityScore: 50,
      lifecycleStage: "NEW",
      rfmSegment: "NEW",
    });

    revalidatePath("/crm/customers");
    return { success: true, customer: newCustomer };
  } catch (err: any) {
    console.error("[addCustomer Error]:", err);
    return { success: false, error: err?.message || "Failed to add customer" };
  }
}

export async function mergeDuplicateCustomers(params: {
  organizationId: string;
  primaryCustomerId: string;
  duplicateCustomerIds: string[];
}) {
  try {
    const { primaryCustomerId, duplicateCustomerIds } = params;
    if (!primaryCustomerId || !duplicateCustomerIds.length) {
      return { success: false, error: "Primary customer and duplicate IDs are required" };
    }

    // Reassign invoices to primary customer
    for (const dupId of duplicateCustomerIds) {
      await db
        .update(salesInvoices)
        .set({ customerId: primaryCustomerId })
        .where(eq(salesInvoices.customerId, dupId));

      await db
        .update(whatsappCommunications)
        .set({ customerId: primaryCustomerId })
        .where(eq(whatsappCommunications.customerId, dupId));

      await db
        .update(crmTickets)
        .set({ customerId: primaryCustomerId })
        .where(eq(crmTickets.customerId, dupId));

      await db
        .update(crmLeads)
        .set({ customerId: primaryCustomerId })
        .where(eq(crmLeads.customerId, dupId));

      // Remove duplicate CRM profile & customer
      await db.delete(crmCustomerProfiles).where(eq(crmCustomerProfiles.customerId, dupId));
      await db.delete(customers).where(eq(customers.id, dupId));
    }

    revalidatePath("/crm/customers");
    return { success: true };
  } catch (err: any) {
    console.error("[mergeDuplicateCustomers Error]:", err);
    return { success: false, error: err?.message || "Merge duplicates failed" };
  }
}

export async function getCustomerTimeline(customerId: string) {
  try {
    if (!customerId) return { success: false, events: [] };

    // 1. Sales Invoices
    const invoices = await db
      .select({
        id: salesInvoices.id,
        invoiceNumber: salesInvoices.invoiceNumber,
        grandTotal: salesInvoices.grandTotal,
        date: salesInvoices.invoiceDate,
      })
      .from(salesInvoices)
      .where(eq(salesInvoices.customerId, customerId))
      .orderBy(desc(salesInvoices.invoiceDate))
      .limit(20);

    // 2. WhatsApp Communications
    const messages = await db
      .select({
        id: whatsappCommunications.id,
        direction: whatsappCommunications.direction,
        status: whatsappCommunications.status,
        content: whatsappCommunications.content,
        date: whatsappCommunications.createdAt,
      })
      .from(whatsappCommunications)
      .where(eq(whatsappCommunications.customerId, customerId))
      .orderBy(desc(whatsappCommunications.createdAt))
      .limit(20);

    // 3. Service Tickets
    const tickets = await db
      .select({
        id: crmTickets.id,
        ticketNumber: crmTickets.ticketNumber,
        subject: crmTickets.subject,
        status: crmTickets.status,
        date: crmTickets.createdAt,
      })
      .from(crmTickets)
      .where(eq(crmTickets.customerId, customerId))
      .orderBy(desc(crmTickets.createdAt))
      .limit(20);

    const events = [
      ...invoices.map((i) => ({
        type: "INVOICE",
        title: `POS Bill: ${i.invoiceNumber}`,
        subtitle: `Amount: ₹${Number(i.grandTotal || 0).toLocaleString("en-IN")}`,
        timestamp: i.date || new Date(),
      })),
      ...messages.map((m) => ({
        type: "WHATSAPP",
        title: `WhatsApp ${m.direction === "INBOUND" ? "Received" : "Sent"}`,
        subtitle: m.content || `Status: ${m.status}`,
        timestamp: m.date,
      })),
      ...tickets.map((t) => ({
        type: "TICKET",
        title: `Ticket: ${t.ticketNumber}`,
        subtitle: `${t.subject} (${t.status})`,
        timestamp: t.date,
      })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return { success: true, events };
  } catch (err: any) {
    console.error("[getCustomerTimeline Error]:", err);
    return { success: false, events: [], error: err?.message };
  }
}

// ---------------------------------------------------------------------------
// 2. RFM & INTELLIGENCE ENGINE
// ---------------------------------------------------------------------------

export async function recalculateRfmSegments(organizationId: string) {
  try {
    const custs = await db
      .select({
        id: customers.id,
        phone: customers.phone,
      })
      .from(customers)
      .where(eq(customers.organizationId, organizationId));

    const now = new Date();

    for (const c of custs) {
      // Calculate POS sales statistics
      const invs = await db
        .select({
          grandTotal: salesInvoices.grandTotal,
          date: salesInvoices.invoiceDate,
          locationId: salesInvoices.locationId,
        })
        .from(salesInvoices)
        .where(eq(salesInvoices.customerId, c.id));

      const frequency = invs.length;
      const monetary = invs.reduce((acc, i) => acc + Number(i.grandTotal || 0), 0);

      // Determine most frequent / primary location
      const locCounts: Record<string, number> = {};
      for (const inv of invs) {
        if (inv.locationId) {
          locCounts[inv.locationId] = (locCounts[inv.locationId] || 0) + 1;
        }
      }
      let preferredLocationId: string | null = null;
      let maxCount = 0;
      for (const [locId, count] of Object.entries(locCounts)) {
        if (count > maxCount) {
          maxCount = count;
          preferredLocationId = locId;
        }
      }

      let recencyDays = 999;
      if (invs.length > 0) {
        const mostRecent = invs
          .map((i) => (i.date ? new Date(i.date).getTime() : 0))
          .sort((a, b) => b - a)[0];
        if (mostRecent > 0) {
          recencyDays = Math.floor((now.getTime() - mostRecent) / (1000 * 60 * 60 * 24));
        }
      }

      // RFM Segment logic
      let segment = "NEW";
      let lifecycle = "NEW";
      let priority = 50;

      if (frequency >= 5 && monetary >= 5000 && recencyDays <= 30) {
        segment = "CHAMPIONS";
        lifecycle = "ACTIVE";
        priority = 95;
      } else if (frequency >= 3 && recencyDays <= 45) {
        segment = "LOYAL";
        lifecycle = "ACTIVE";
        priority = 80;
      } else if (recencyDays > 60 && recencyDays <= 120 && frequency >= 2) {
        segment = "AT_RISK";
        lifecycle = "AT_RISK";
        priority = 70;
      } else if (recencyDays > 120) {
        segment = "DORMANT";
        lifecycle = "DORMANT";
        priority = 35;
      }

      await db
        .insert(crmCustomerProfiles)
        .values({
          organizationId,
          customerId: c.id,
          preferredLocationId,
          recencyDays,
          frequencyOrders: frequency,
          monetarySpend: monetary.toFixed(2),
          rfmSegment: segment,
          lifecycleStage: lifecycle,
          priorityScore: priority,
          lastCalculatedAt: now,
        })
        .onConflictDoUpdate({
          target: crmCustomerProfiles.customerId,
          set: {
            preferredLocationId: preferredLocationId ?? sql`${crmCustomerProfiles.preferredLocationId}`,
            recencyDays,
            frequencyOrders: frequency,
            monetarySpend: monetary.toFixed(2),
            rfmSegment: segment,
            lifecycleStage: lifecycle,
            priorityScore: priority,
            lastCalculatedAt: now,
            updatedAt: now,
          },
        });
    }

    revalidatePath("/crm/intelligence");
    revalidatePath("/crm/scoring");
    return { success: true, count: custs.length };
  } catch (err: any) {
    console.error("[recalculateRfmSegments Error]:", err);
    return { success: false, error: err?.message || "Failed to recalculate segments" };
  }
}

// ---------------------------------------------------------------------------
// 3. LEADS PIPELINE & KUAB AUTOMATION BUS INTEGRATION
// ---------------------------------------------------------------------------

export async function createCrmLead(params: {
  organizationId: string;
  locationId?: string;
  title: string;
  leadType: string;
  contactName: string;
  contactPhone: string;
  contactEmail?: string;
  estimatedValue?: number;
  eventDate?: string;
  notes?: string;
}) {
  try {
    const {
      organizationId,
      locationId,
      title,
      leadType,
      contactName,
      contactPhone,
      contactEmail,
      estimatedValue = 0,
      eventDate,
      notes,
    } = params;

    if (!title.trim() || !contactName.trim() || !contactPhone.trim()) {
      return { success: false, error: "Title, contact name, and phone are required." };
    }

    const [lead] = await db
      .insert(crmLeads)
      .values({
        organizationId,
        locationId: locationId || null,
        title: title.trim(),
        leadType,
        contactName: contactName.trim(),
        contactPhone: contactPhone.trim(),
        contactEmail: contactEmail?.trim() || null,
        estimatedValue: estimatedValue.toFixed(2),
        eventDate: eventDate ? new Date(eventDate) : null,
        notes: notes?.trim() || null,
        stage: "NEW_ENQUIRY",
      })
      .returning();

    revalidatePath("/crm/leads");
    return { success: true, lead };
  } catch (err: any) {
    console.error("[createCrmLead Error]:", err);
    return { success: false, error: err?.message || "Failed to create lead" };
  }
}

export async function updateLeadStage(leadId: string, stage: string) {
  try {
    await db
      .update(crmLeads)
      .set({ stage, updatedAt: new Date() })
      .where(eq(crmLeads.id, leadId));

    // Reverse sync to linked Event if this lead corresponds to an event
    const stageToEventStatus: Record<string, string> = {
      NEW_ENQUIRY: "ENQUIRY",
      CONTACTED: "LIKELY",
      QUOTE_SENT: "CONFIRMED_NO_ADVANCE",
      WON: "BOOKED_PAID",
      LOST: "CANCELLED",
    };

    const targetEventStatus = stageToEventStatus[stage];
    if (targetEventStatus) {
      await db
        .update(events)
        .set({ status: targetEventStatus, updatedAt: new Date() })
        .where(eq(events.leadId, leadId));
    }

    try {
      revalidatePath("/crm/leads");
      revalidatePath("/events");
    } catch {}
    return { success: true };
  } catch (err: any) {
    console.error("[updateLeadStage Error]:", err);
    return { success: false, error: err?.message || "Failed to update lead stage" };
  }
}

export async function scheduleLeadFollowUpViaKuab(params: {
  organizationId: string;
  leadId: string;
  followUpDate: string;
  notes?: string;
}) {
  try {
    const { organizationId, leadId, followUpDate, notes } = params;

    const [lead] = await db.select().from(crmLeads).where(eq(crmLeads.id, leadId)).limit(1);
    if (!lead) return { success: false, error: "Lead not found" };

    // Emit Event to Kalki Universal Automation Bus (KUAB)
    const [kuabTask] = await db
      .insert(kuabTasks)
      .values({
        organizationId,
        title: `Follow up Lead: ${lead.contactName} (${lead.title})`,
        description: notes || `Phone: ${lead.contactPhone} - Val: ₹${lead.estimatedValue}`,
        status: "PENDING",
        dueDate: new Date(followUpDate),
      })
      .returning();

    // Link KUAB task back to Lead record
    await db
      .update(crmLeads)
      .set({ kuabFollowUpTaskId: kuabTask.id, updatedAt: new Date() })
      .where(eq(crmLeads.id, leadId));

    revalidatePath("/crm/leads");
    return { success: true, taskId: kuabTask.id };
  } catch (err: any) {
    console.error("[scheduleLeadFollowUpViaKuab Error]:", err);
    return { success: false, error: err?.message || "Failed to schedule follow-up via KUAB" };
  }
}

// ---------------------------------------------------------------------------
// 4. CONSENT CENTER & COMPLIANCE
// ---------------------------------------------------------------------------

export async function updateConsent(params: {
  organizationId: string;
  customerId: string;
  channel: "WHATSAPP" | "SMS";
  consentGranted: boolean;
  source: string;
}) {
  try {
    const { organizationId, customerId, channel, consentGranted, source } = params;

    // Log to Consent Audit Ledger
    await db.insert(crmConsentLogs).values({
      organizationId,
      customerId,
      channel,
      consentGranted,
      source,
    });

    // Update customer CRM Profile
    await db
      .insert(crmCustomerProfiles)
      .values({
        organizationId,
        customerId,
        whatsappConsent: channel === "WHATSAPP" ? consentGranted : true,
        smsConsent: channel === "SMS" ? consentGranted : true,
        consentUpdatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: crmCustomerProfiles.customerId,
        set: {
          ...(channel === "WHATSAPP" ? { whatsappConsent: consentGranted } : {}),
          ...(channel === "SMS" ? { smsConsent: consentGranted } : {}),
          consentUpdatedAt: new Date(),
        },
      });

    revalidatePath("/crm/compliance");
    return { success: true };
  } catch (err: any) {
    console.error("[updateConsent Error]:", err);
    return { success: false, error: err?.message || "Failed to update consent" };
  }
}

// ---------------------------------------------------------------------------
// 5. CUSTOMER SERVICE TICKETS
// ---------------------------------------------------------------------------

export async function createTicket(params: {
  organizationId: string;
  locationId?: string;
  customerId?: string;
  subject: string;
  description: string;
  urgency?: string;
  category?: string;
}) {
  try {
    const {
      organizationId,
      locationId,
      customerId,
      subject,
      description,
      urgency = "MEDIUM",
      category = "BILLING",
    } = params;

    if (!subject.trim() || !description.trim()) {
      return { success: false, error: "Subject and description are required" };
    }

    const ticketNumber = `TCK-${Date.now().toString().slice(-6)}`;

    const [ticket] = await db
      .insert(crmTickets)
      .values({
        organizationId,
        locationId: locationId || null,
        customerId: customerId || null,
        ticketNumber,
        subject: subject.trim(),
        description: description.trim(),
        urgency,
        category,
        status: "OPEN",
      })
      .returning();

    revalidatePath("/crm/service");
    return { success: true, ticket };
  } catch (err: any) {
    console.error("[createTicket Error]:", err);
    return { success: false, error: err?.message || "Failed to create ticket" };
  }
}

export async function resolveTicket(ticketId: string, resolutionNotes: string) {
  try {
    await db
      .update(crmTickets)
      .set({
        status: "RESOLVED",
        resolvedAt: new Date(),
        resolutionNotes: resolutionNotes.trim(),
        updatedAt: new Date(),
      })
      .where(eq(crmTickets.id, ticketId));

    revalidatePath("/crm/service");
    return { success: true };
  } catch (err: any) {
    console.error("[resolveTicket Error]:", err);
    return { success: false, error: err?.message || "Failed to resolve ticket" };
  }
}

// ---------------------------------------------------------------------------
// 5. CRM INTELLIGENCE HUB & DYNAMIC LIST EVALUATION
// ---------------------------------------------------------------------------

export interface CrmConfigValues {
  dormantVipDays: number;
  dormantVipMinSpend: number;
  aovDropPercentage: number;
  criticalDebtorDays: number;
  newVipMinSpend: number;
  anomalyAovMultiplier: number;
  concentrationTopCount: number;
}

export async function getCrmIntelligenceConfig(organizationId: string, locationId?: string | null): Promise<CrmConfigValues> {
  let row: any = null;
  if (locationId && locationId !== "ALL") {
    const [locRow] = await db
      .select()
      .from(crmIntelligenceConfigurations)
      .where(
        and(
          eq(crmIntelligenceConfigurations.organizationId, organizationId),
          eq(crmIntelligenceConfigurations.locationId, locationId)
        )
      )
      .limit(1);
    row = locRow;
  }

  if (!row) {
    const [orgRow] = await db
      .select()
      .from(crmIntelligenceConfigurations)
      .where(
        and(
          eq(crmIntelligenceConfigurations.organizationId, organizationId),
          sql`${crmIntelligenceConfigurations.locationId} IS NULL`
        )
      )
      .limit(1);
    row = orgRow;
  }

  return {
    dormantVipDays: row?.dormantVipDays ?? 90,
    dormantVipMinSpend: Number(row?.dormantVipMinSpend ?? 10000),
    aovDropPercentage: Number(row?.aovDropPercentage ?? 5.0),
    criticalDebtorDays: row?.criticalDebtorDays ?? 30,
    newVipMinSpend: Number(row?.newVipMinSpend ?? 10000),
    anomalyAovMultiplier: Number(row?.anomalyAovMultiplier ?? 3.0),
    concentrationTopCount: row?.concentrationTopCount ?? 5,
  };
}

export async function updateCrmIntelligenceConfig(
  organizationId: string,
  locationId: string | null,
  values: Partial<CrmConfigValues>
) {
  try {
    const existing = await db
      .select({ id: crmIntelligenceConfigurations.id })
      .from(crmIntelligenceConfigurations)
      .where(
        and(
          eq(crmIntelligenceConfigurations.organizationId, organizationId),
          locationId ? eq(crmIntelligenceConfigurations.locationId, locationId) : sql`${crmIntelligenceConfigurations.locationId} IS NULL`
        )
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(crmIntelligenceConfigurations)
        .set({
          ...(values.dormantVipDays !== undefined && { dormantVipDays: values.dormantVipDays }),
          ...(values.dormantVipMinSpend !== undefined && { dormantVipMinSpend: values.dormantVipMinSpend.toFixed(2) }),
          ...(values.aovDropPercentage !== undefined && { aovDropPercentage: values.aovDropPercentage.toFixed(2) }),
          ...(values.criticalDebtorDays !== undefined && { criticalDebtorDays: values.criticalDebtorDays }),
          ...(values.newVipMinSpend !== undefined && { newVipMinSpend: values.newVipMinSpend.toFixed(2) }),
          ...(values.anomalyAovMultiplier !== undefined && { anomalyAovMultiplier: values.anomalyAovMultiplier.toFixed(2) }),
          ...(values.concentrationTopCount !== undefined && { concentrationTopCount: values.concentrationTopCount }),
          updatedAt: new Date(),
        })
        .where(eq(crmIntelligenceConfigurations.id, existing[0].id));
    } else {
      await db.insert(crmIntelligenceConfigurations).values({
        organizationId,
        locationId: locationId || null,
        dormantVipDays: values.dormantVipDays ?? 90,
        dormantVipMinSpend: (values.dormantVipMinSpend ?? 10000).toFixed(2),
        aovDropPercentage: (values.aovDropPercentage ?? 5.0).toFixed(2),
        criticalDebtorDays: values.criticalDebtorDays ?? 30,
        newVipMinSpend: (values.newVipMinSpend ?? 10000).toFixed(2),
        anomalyAovMultiplier: (values.anomalyAovMultiplier ?? 3.0).toFixed(2),
        concentrationTopCount: values.concentrationTopCount ?? 5,
      });
    }

    revalidatePath("/crm/intelligence");
    return { success: true };
  } catch (err: any) {
    console.error("[updateCrmIntelligenceConfig Error]:", err);
    return { success: false, error: err?.message };
  }
}

/**
 * Evaluates Dormant VIP customers dynamically.
 */
export async function getDormantVIPs(organizationId: string, locationId?: string | null) {
  const config = await getCrmIntelligenceConfig(organizationId, locationId);
  const dormantThresholdDate = new Date();
  dormantThresholdDate.setDate(dormantThresholdDate.getDate() - config.dormantVipDays);

  const baseWhere = [
    eq(salesInvoices.organizationId, organizationId),
    sql`${salesInvoices.status} != 'CANCELLED' AND ${salesInvoices.paymentStatus} != 'CANCELLED'`,
    sql`TRIM(${salesInvoices.customerName}) != '' AND ${salesInvoices.customerName} IS NOT NULL`,
  ];
  if (locationId && locationId !== "ALL") {
    baseWhere.push(eq(salesInvoices.locationId, locationId));
  }

  const nameCol = sql<string>`COALESCE(NULLIF(TRIM(${salesInvoices.customerName}), ''), 'Guest')`;
  const phoneCol = sql<string>`COALESCE(NULLIF(TRIM(${customers.phone}), ''), '-')`;

  const results = await db
    .select({
      customerId: sql<string>`MAX(CAST(${salesInvoices.customerId} AS TEXT))`,
      customerName: nameCol,
      customerPhone: phoneCol,
      totalSpend: sql<number>`SUM(CAST(${salesInvoices.grandTotal} AS NUMERIC))`,
      totalOrders: sql<number>`COUNT(${salesInvoices.id})`,
      lastPurchaseDate: sql<string>`MAX(${salesInvoices.invoiceDate})`,
    })
    .from(salesInvoices)
    .leftJoin(customers, eq(salesInvoices.customerId, customers.id))
    .where(and(...baseWhere))
    .groupBy(nameCol, phoneCol)
    .having(
      sql`MAX(${salesInvoices.invoiceDate}) < ${dormantThresholdDate} AND (COUNT(${salesInvoices.id}) >= 3 OR SUM(CAST(${salesInvoices.grandTotal} AS NUMERIC)) >= ${config.dormantVipMinSpend})`
    );

  const totalAtRisk = results.reduce((sum, r) => sum + Number(r.totalSpend), 0);

  return {
    rule: "DORMANT_VIPS",
    title: `${results.length} Dormant VIPs (> ${config.dormantVipDays} Days Inactive)`,
    description: `Revenue at risk: ₹${totalAtRisk.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`,
    badge: "Retention Risk",
    count: results.length,
    customers: results,
  };
}

/**
 * Evaluates Customers experiencing Average Order Value (AOV) drops.
 */
export async function getAovDrops(organizationId: string, locationId?: string | null) {
  const config = await getCrmIntelligenceConfig(organizationId, locationId);
  const now = new Date();
  const activeStart = new Date(now);
  activeStart.setDate(activeStart.getDate() - 30);

  const baselineStart = new Date(activeStart);
  baselineStart.setDate(baselineStart.getDate() - 90);

  const baseWhere = [
    eq(salesInvoices.organizationId, organizationId),
    sql`${salesInvoices.status} != 'CANCELLED' AND ${salesInvoices.paymentStatus} != 'CANCELLED'`,
    sql`TRIM(${salesInvoices.customerName}) != '' AND ${salesInvoices.customerName} IS NOT NULL`,
  ];
  if (locationId && locationId !== "ALL") {
    baseWhere.push(eq(salesInvoices.locationId, locationId));
  }

  const nameCol = sql<string>`COALESCE(NULLIF(TRIM(${salesInvoices.customerName}), ''), 'Guest')`;
  const phoneCol = sql<string>`COALESCE(NULLIF(TRIM(${customers.phone}), ''), '-')`;

  const results = await db
    .select({
      customerId: sql<string>`MAX(CAST(${salesInvoices.customerId} AS TEXT))`,
      customerName: nameCol,
      customerPhone: phoneCol,
      recentAov: sql<number>`AVG(CASE WHEN ${salesInvoices.invoiceDate} >= ${activeStart} THEN CAST(${salesInvoices.grandTotal} AS NUMERIC) END)`,
      baselineAov: sql<number>`AVG(CASE WHEN ${salesInvoices.invoiceDate} >= ${baselineStart} AND ${salesInvoices.invoiceDate} < ${activeStart} THEN CAST(${salesInvoices.grandTotal} AS NUMERIC) END)`,
      totalSpend: sql<number>`SUM(CAST(${salesInvoices.grandTotal} AS NUMERIC))`,
      totalOrders: sql<number>`COUNT(${salesInvoices.id})`,
      lastPurchaseDate: sql<string>`MAX(${salesInvoices.invoiceDate})`,
    })
    .from(salesInvoices)
    .leftJoin(customers, eq(salesInvoices.customerId, customers.id))
    .where(and(...baseWhere))
    .groupBy(nameCol, phoneCol)
    .having(
      sql`AVG(CASE WHEN ${salesInvoices.invoiceDate} >= ${baselineStart} AND ${salesInvoices.invoiceDate} < ${activeStart} THEN CAST(${salesInvoices.grandTotal} AS NUMERIC) END) > 0 
          AND AVG(CASE WHEN ${salesInvoices.invoiceDate} >= ${activeStart} THEN CAST(${salesInvoices.grandTotal} AS NUMERIC) END) > 0`
    );

  const dropRatio = (100 - config.aovDropPercentage) / 100;
  const filtered = results.filter((r) => Number(r.recentAov) < Number(r.baselineAov) * dropRatio);

  return {
    rule: "AOV_DROPS",
    title: `Basket Value Dropped > ${config.aovDropPercentage}% for ${filtered.length} Customers`,
    description: `Underperforming vs their 90-day historical baseline spend`,
    badge: "Upsell Deficit",
    count: filtered.length,
    customers: filtered,
  };
}

/**
 * Evaluates Critical Debtors with overdue outstanding invoices.
 */
export async function getCriticalDebtors(organizationId: string, locationId?: string | null) {
  const config = await getCrmIntelligenceConfig(organizationId, locationId);
  const debtorThresholdDate = new Date();
  debtorThresholdDate.setDate(debtorThresholdDate.getDate() - config.criticalDebtorDays);

  const baseWhere = [
    eq(salesInvoices.organizationId, organizationId),
    sql`${salesInvoices.paymentStatus} != 'PAID' AND ${salesInvoices.status} != 'CANCELLED'`,
    sql`TRIM(${salesInvoices.customerName}) != '' AND ${salesInvoices.customerName} IS NOT NULL`,
    lte(salesInvoices.invoiceDate, debtorThresholdDate),
  ];
  if (locationId && locationId !== "ALL") {
    baseWhere.push(eq(salesInvoices.locationId, locationId));
  }

  const nameCol = sql<string>`COALESCE(NULLIF(TRIM(${salesInvoices.customerName}), ''), 'Guest')`;
  const phoneCol = sql<string>`COALESCE(NULLIF(TRIM(${customers.phone}), ''), '-')`;

  const results = await db
    .select({
      customerId: sql<string>`MAX(CAST(${salesInvoices.customerId} AS TEXT))`,
      customerName: nameCol,
      customerPhone: phoneCol,
      totalSpend: sql<number>`SUM(CAST(${salesInvoices.grandTotal} AS NUMERIC))`,
      totalOrders: sql<number>`COUNT(${salesInvoices.id})`,
      lastPurchaseDate: sql<string>`MAX(${salesInvoices.invoiceDate})`,
    })
    .from(salesInvoices)
    .leftJoin(customers, eq(salesInvoices.customerId, customers.id))
    .where(and(...baseWhere))
    .groupBy(nameCol, phoneCol);

  const totalOverdue = results.reduce((sum, r) => sum + Number(r.totalSpend), 0);

  return {
    rule: "CRITICAL_DEBTORS",
    title: `${results.length} Accounts > ${config.criticalDebtorDays} Days Overdue`,
    description: `Outstanding balance: ₹${totalOverdue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`,
    badge: "Credit Risk",
    count: results.length,
    customers: results,
  };
}

/**
 * Master evaluator for a dynamic list by triggerRule key.
 */
export async function getDynamicListEvaluation(
  organizationId: string,
  triggerRule: string,
  locationId?: string | null
) {
  switch (triggerRule) {
    case "DORMANT_VIPS":
      return await getDormantVIPs(organizationId, locationId);
    case "AOV_DROPS":
      return await getAovDrops(organizationId, locationId);
    case "CRITICAL_DEBTORS":
      return await getCriticalDebtors(organizationId, locationId);
    default:
      return {
        rule: triggerRule,
        title: "No Matching Rule",
        description: "Unrecognized trigger rule",
        badge: "None",
        count: 0,
        customers: [],
      };
  }
}

