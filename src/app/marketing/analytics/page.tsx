import React from "react";
import { db } from "@/db";
import { marketingCampaigns, campaignAudiences } from "@/db/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import AnalyticsClient from "./AnalyticsClient";
import "../marketing.css";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    organizationId?: string;
    locationId?: string;
  }>;
}

export default async function MarketingAnalyticsPage(props: PageProps) {
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

  // Fetch all campaigns with closed-loop conversion metrics (Location filtered if selected)
  const conditions = [eq(marketingCampaigns.organizationId, organizationId)];
  if (locationId && locationId !== "ALL") {
    conditions.push(eq(marketingCampaigns.locationId, locationId));
  }

  const campaigns = await db
    .select()
    .from(marketingCampaigns)
    .where(and(...conditions))
    .orderBy(desc(marketingCampaigns.createdAt));

  // Compute aggregated attribution window totals
  const totalApiSpend = campaigns.reduce((acc, c) => acc + Number(c.estimatedApiCost || 0), 0);
  const totalAttributedRevenue = campaigns.reduce(
    (acc, c) => acc + Number(c.totalAttributedRevenue || 0),
    0
  );

  const total72hRev = campaigns.reduce((acc, c) => acc + Number(c.conversions72hRevenue || 0), 0);
  const total7dRev = campaigns.reduce((acc, c) => acc + Number(c.conversions7dRevenue || 0), 0);
  const total30dRev = campaigns.reduce((acc, c) => acc + Number(c.conversions30dRevenue || 0), 0);

  const total72hCount = campaigns.reduce((acc, c) => acc + (c.conversions72hCount || 0), 0);
  const total7dCount = campaigns.reduce((acc, c) => acc + (c.conversions7dCount || 0), 0);
  const total30dCount = campaigns.reduce((acc, c) => acc + (c.conversions30dCount || 0), 0);

  return (
    <div className="marketing-container">
      <AnalyticsClient
        organizationId={organizationId}
        campaigns={campaigns}
        totalApiSpend={totalApiSpend}
        totalAttributedRevenue={totalAttributedRevenue}
        total72hRev={total72hRev}
        total7dRev={total7dRev}
        total30dRev={total30dRev}
        total72hCount={total72hCount}
        total7dCount={total7dCount}
        total30dCount={total30dCount}
      />
    </div>
  );
}
