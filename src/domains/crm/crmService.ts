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
} from "@/db/schema";
import { eq, and, desc, sql, ilike, or } from "drizzle-orm";
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

    revalidatePath("/crm/leads");
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
