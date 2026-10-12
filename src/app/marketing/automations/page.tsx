import React from "react";
import { db } from "@/db";
import { marketingAutomations } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import AutomationsClient from "./AutomationsClient";
import "../marketing.css";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    organizationId?: string;
    locationId?: string;
  }>;
}

export default async function MarketingAutomationsPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const organizationId = searchParams.organizationId || "";
  const locationId = searchParams.locationId || "";

  if (!organizationId) {
    return (
      <div className="marketing-container" style={{ padding: "2rem" }}>
        <p style={{ color: "#64748b" }}>Please select an organization location from the top bar.</p>
      </div>
    );
  }

  const conditions = [eq(marketingAutomations.organizationId, organizationId)];
  if (locationId && locationId !== "ALL") {
    conditions.push(eq(marketingAutomations.locationId, locationId));
  }

  const automations = await db
    .select()
    .from(marketingAutomations)
    .where(and(...conditions))
    .orderBy(desc(marketingAutomations.createdAt));

  return (
    <div className="marketing-container">
      <AutomationsClient organizationId={organizationId} automations={automations} />
    </div>
  );
}
