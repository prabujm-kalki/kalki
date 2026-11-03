import { db } from "@/db";
import { events, crmLeads, locations } from "@/db/schema";
import { eq, and, sql, gte, lte } from "drizzle-orm";
import { DashboardScopeContext, EventsPulseData, CateringOrderItem } from "./types";

export async function getEventsPulse(context: DashboardScopeContext): Promise<EventsPulseData> {
  const { organizationId, locationId } = context;

  const defaultResult: EventsPulseData = {
    upcoming48hCount: 0,
    upcoming48hOrders: [],
    openEnquiriesCount: 0,
  };

  if (!organizationId) return defaultResult;

  try {
    const now = new Date();
    const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const eventFilters = [
      eq(events.organizationId, organizationId),
      gte(events.eventDate, now),
      lte(events.eventDate, in48Hours),
    ];
    if (locationId && locationId !== "ALL") {
      eventFilters.push(eq(events.locationId, locationId));
    }

    const upcomingRaw = await db
      .select({
        id: events.id,
        title: events.title,
        functionType: events.functionType,
        eventDate: events.eventDate,
        timeSlot: events.timeSlot,
        expectedPax: events.expectedPax,
        status: events.status,
        contactName: events.contactName,
        contactPhone: events.contactPhone,
        locationId: events.locationId,
        locationName: locations.name,
      })
      .from(events)
      .leftJoin(locations, eq(events.locationId, locations.id))
      .where(and(...eventFilters))
      .orderBy(events.eventDate)
      .limit(6);

    const upcoming48hOrders: CateringOrderItem[] = upcomingRaw.map((e) => ({
      id: e.id,
      title: e.title,
      functionType: e.functionType,
      eventDate: e.eventDate.toISOString(),
      timeSlot: e.timeSlot,
      expectedPax: e.expectedPax || 50,
      status: e.status,
      contactName: e.contactName,
      contactPhone: e.contactPhone,
      locationId: e.locationId,
      locationName: e.locationName,
    }));

    // 2. Count open enquiries / leads
    const leadFilters = [
      eq(crmLeads.organizationId, organizationId),
      eq(crmLeads.stage, "NEW_ENQUIRY"),
    ];

    const [leadRes] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(crmLeads)
      .where(and(...leadFilters));

    return {
      upcoming48hCount: upcoming48hOrders.length,
      upcoming48hOrders,
      openEnquiriesCount: leadRes?.count || 0,
    };
  } catch (err) {
    console.error("Error fetching getEventsPulse:", err);
    return defaultResult;
  }
}
