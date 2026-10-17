import React from "react";
import { db } from "@/db";
import { crmTickets, customers, locations } from "@/db/schema";
import { eq, and, desc, sql, ilike } from "drizzle-orm";
import ServiceClient from "./ServiceClient";
import "../crm.css";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    organizationId?: string;
    locationId?: string;
    page?: string;
    status?: string;
    urgency?: string;
  }>;
}

export default async function ServicePage(props: PageProps) {
  const searchParams = await props.searchParams;
  const organizationId = searchParams.organizationId || "";
  const locationId = searchParams.locationId;
  const page = parseInt(searchParams.page || "1", 10);
  const status = searchParams.status || "OPEN";
  const urgency = searchParams.urgency || "ALL";
  const pageSize = 10;

  if (!organizationId) {
    return (
      <div className="crm-container" style={{ padding: "2rem" }}>
        <p style={{ color: "#64748b" }}>Please select an organization location from the top bar.</p>
      </div>
    );
  }

  const offset = (page - 1) * pageSize;
  const conditions = [eq(crmTickets.organizationId, organizationId)];

  if (locationId && locationId !== "ALL") {
    conditions.push(eq(crmTickets.locationId, locationId));
  }
  if (status !== "ALL") {
    conditions.push(eq(crmTickets.status, status));
  }
  if (urgency !== "ALL") {
    conditions.push(eq(crmTickets.urgency, urgency));
  }

  const tickets = await db
    .select({
      id: crmTickets.id,
      ticketNumber: crmTickets.ticketNumber,
      subject: crmTickets.subject,
      description: crmTickets.description,
      status: crmTickets.status,
      urgency: crmTickets.urgency,
      category: crmTickets.category,
      resolvedAt: crmTickets.resolvedAt,
      resolutionNotes: crmTickets.resolutionNotes,
      createdAt: crmTickets.createdAt,
      customerId: crmTickets.customerId,
      customerName: customers.name,
      customerPhone: customers.phone,
    })
    .from(crmTickets)
    .leftJoin(customers, eq(crmTickets.customerId, customers.id))
    .where(and(...conditions))
    .orderBy(desc(crmTickets.createdAt))
    .limit(pageSize)
    .offset(offset);

  const [countRes] = await db
    .select({ count: sql<number>`count(*)` })
    .from(crmTickets)
    .where(and(...conditions));

  const totalCount = Number(countRes?.count || 0);
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  // Open vs Resolved count summary (isolated by locationId)
  const isLocFiltered = !!(locationId && locationId !== "ALL" && locationId !== "all");
  const openConditions = [
    eq(crmTickets.organizationId, organizationId),
    eq(crmTickets.status, "OPEN"),
    isLocFiltered ? eq(crmTickets.locationId, locationId) : undefined,
  ].filter(Boolean) as any[];

  const resolvedConditions = [
    eq(crmTickets.organizationId, organizationId),
    eq(crmTickets.status, "RESOLVED"),
    isLocFiltered ? eq(crmTickets.locationId, locationId) : undefined,
  ].filter(Boolean) as any[];

  const [openCountRes] = await db
    .select({ count: sql<number>`count(*)` })
    .from(crmTickets)
    .where(and(...openConditions));

  const [resolvedCountRes] = await db
    .select({ count: sql<number>`count(*)` })
    .from(crmTickets)
    .where(and(...resolvedConditions));

  const locs = await db
    .select({ id: locations.id, name: locations.name })
    .from(locations)
    .where(eq(locations.organizationId, organizationId));

  return (
    <div className="crm-container">
      <ServiceClient
        organizationId={organizationId}
        locationId={locationId || undefined}
        tickets={tickets}
        locations={locs}
        currentPage={page}
        totalPages={totalPages}
        totalCount={totalCount}
        selectedStatus={status}
        selectedUrgency={urgency}
        openTicketsCount={Number(openCountRes?.count || 0)}
        resolvedTicketsCount={Number(resolvedCountRes?.count || 0)}
      />
    </div>
  );
}
