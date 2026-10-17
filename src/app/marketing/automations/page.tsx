import React from "react";
import { db } from "@/db";
import {
  marketingAutomations,
  marketingTemplates,
  whatsappTemplates,
  organizations,
} from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import AutomationsClient from "./AutomationsClient";
import "../marketing.css";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    organizationId?: string;
    locationId?: string;
    targetRule?: string;
    openCreate?: string;
  }>;
}

export default async function MarketingAutomationsPage(props: PageProps) {
  const searchParams = await props.searchParams;
  let organizationId = searchParams.organizationId || "";
  const locationId = searchParams.locationId || "";
  const targetRule = searchParams.targetRule || "";
  const openCreate = searchParams.openCreate === "true";

  if (!organizationId) {
    const defaultOrg = await db.select({ id: organizations.id }).from(organizations).limit(1);
    if (defaultOrg.length > 0) {
      organizationId = defaultOrg[0].id;
    }
  }

  if (!organizationId) {
    return (
      <div className="marketing-container" style={{ padding: "2rem" }}>
        <p style={{ color: "#64748b" }}>Please select an organization location from the top bar.</p>
      </div>
    );
  }

  // 1. Fetch Lifecycle Dynamic Drip Automated Templates
  const templateConditions = [
    eq(marketingTemplates.organizationId, organizationId),
    eq(marketingTemplates.isAutomated, true),
  ];
  if (locationId && locationId !== "ALL") {
    templateConditions.push(eq(marketingTemplates.locationId, locationId));
  }

  const automatedTemplates = await db
    .select()
    .from(marketingTemplates)
    .where(and(...templateConditions))
    .orderBy(desc(marketingTemplates.createdAt));

  // 2. Fetch Meta Cloud WhatsApp Templates for template mapping
  const metaTemplates = await db
    .select({
      id: whatsappTemplates.id,
      name: whatsappTemplates.name,
      displayName: whatsappTemplates.displayName,
      category: whatsappTemplates.category,
      language: whatsappTemplates.language,
      status: whatsappTemplates.status,
      bodyText: whatsappTemplates.bodyText,
    })
    .from(whatsappTemplates)
    .where(eq(whatsappTemplates.organizationId, organizationId))
    .orderBy(desc(whatsappTemplates.createdAt));

  // 3. Fetch Event-triggered Journeys
  const autoConditions = [eq(marketingAutomations.organizationId, organizationId)];
  if (locationId && locationId !== "ALL") {
    autoConditions.push(eq(marketingAutomations.locationId, locationId));
  }

  const automations = await db
    .select()
    .from(marketingAutomations)
    .where(and(...autoConditions))
    .orderBy(desc(marketingAutomations.createdAt));

  return (
    <div className="marketing-container">
      <AutomationsClient
        organizationId={organizationId}
        locationId={locationId || null}
        targetRule={targetRule}
        openCreate={openCreate}
        automatedTemplates={automatedTemplates}
        metaTemplates={metaTemplates}
        automations={automations}
      />
    </div>
  );
}
