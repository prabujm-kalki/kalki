import React from "react";
import { db } from "@/db";
import { crmLeads, locations } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import LeadsClient from "./LeadsClient";
import "../crm.css";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    organizationId?: string;
    locationId?: string;
    leadType?: string;
  }>;
}

export default async function LeadsPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const organizationId = searchParams.organizationId || "";
  const locationId = searchParams.locationId;
  const leadType = searchParams.leadType || "ALL";

  if (!organizationId) {
    return (
      <div className="crm-container" style={{ padding: "2rem" }}>
        <p style={{ color: "#64748b" }}>Please select an organization location from the top bar.</p>
      </div>
    );
  }

  const conditions = [eq(crmLeads.organizationId, organizationId)];
  if (locationId && locationId !== "ALL") {
    conditions.push(eq(crmLeads.locationId, locationId));
  }
  if (leadType !== "ALL") {
    conditions.push(eq(crmLeads.leadType, leadType));
  }

  const rawLeads = await db
    .select({
      id: crmLeads.id,
      title: crmLeads.title,
      leadType: crmLeads.leadType,
      contactName: crmLeads.contactName,
      contactPhone: crmLeads.contactPhone,
      contactEmail: crmLeads.contactEmail,
      stage: crmLeads.stage,
      estimatedValue: crmLeads.estimatedValue,
      eventDate: crmLeads.eventDate,
      notes: crmLeads.notes,
      kuabFollowUpTaskId: crmLeads.kuabFollowUpTaskId,
      createdAt: crmLeads.createdAt,
    })
    .from(crmLeads)
    .where(and(...conditions))
    .orderBy(desc(crmLeads.createdAt));

  const locs = await db
    .select({ id: locations.id, name: locations.name })
    .from(locations)
    .where(eq(locations.organizationId, organizationId));

  return (
    <div className="crm-container">
      <LeadsClient
        organizationId={organizationId}
        leads={rawLeads}
        locations={locs}
        selectedType={leadType}
      />
    </div>
  );
}
