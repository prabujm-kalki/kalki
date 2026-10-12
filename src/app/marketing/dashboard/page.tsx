import React from "react";
import { db } from "@/db";
import { marketingCampaigns, campaignAudiences } from "@/db/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import DashboardClient from "./DashboardClient";
import "../marketing.css";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    organizationId?: string;
    locationId?: string;
  }>;
}

export default async function MarketingDashboardPage(props: PageProps) {
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

  // 1. Fetch Executive KPI Aggregations (Location filtered if selected)
  const conditions = [eq(marketingCampaigns.organizationId, organizationId)];
  if (locationId && locationId !== "ALL") {
    conditions.push(eq(marketingCampaigns.locationId, locationId));
  }

  const campaigns = await db
    .select()
    .from(marketingCampaigns)
    .where(and(...conditions))
    .orderBy(desc(marketingCampaigns.createdAt));

  const totalApiSpend = campaigns.reduce((acc, c) => acc + Number(c.estimatedApiCost || 0), 0);
  const totalAttributedRevenue = campaigns.reduce((acc, c) => acc + Number(c.totalAttributedRevenue || 0), 0);
  const totalSent = campaigns.reduce((acc, c) => acc + Number(c.sentCount || 0), 0);
  const totalDelivered = campaigns.reduce((acc, c) => acc + Number(c.deliveredCount || 0), 0);
  const totalRead = campaigns.reduce((acc, c) => acc + Number(c.readCount || 0), 0);
  const activeCount = campaigns.filter((c) => c.status === "RUNNING").length;

  return (
    <div className="marketing-container">
      <DashboardClient
        organizationId={organizationId}
        campaigns={campaigns}
        totalApiSpend={totalApiSpend}
        totalAttributedRevenue={totalAttributedRevenue}
        totalSent={totalSent}
        totalDelivered={totalDelivered}
        totalRead={totalRead}
        activeCount={activeCount}
      />
    </div>
  );
}
