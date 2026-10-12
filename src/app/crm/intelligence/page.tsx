import React from "react";
import { db } from "@/db";
import { customers, crmCustomerProfiles } from "@/db/schema";
import { eq, and, desc, sql, ilike } from "drizzle-orm";
import IntelligenceClient from "./IntelligenceClient";
import "../crm.css";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    organizationId?: string;
    locationId?: string;
    page?: string;
    segment?: string;
    recencyMax?: string;
    minSpend?: string;
  }>;
}

export default async function IntelligencePage(props: PageProps) {
  const searchParams = await props.searchParams;
  const organizationId = searchParams.organizationId || "";
  const page = parseInt(searchParams.page || "1", 10);
  const selectedSegment = searchParams.segment || "ALL";
  const recencyMax = parseInt(searchParams.recencyMax || "365", 10);
  const minSpend = parseFloat(searchParams.minSpend || "0");
  const pageSize = 10;

  if (!organizationId) {
    return (
      <div className="crm-container" style={{ padding: "2rem" }}>
        <p style={{ color: "#64748b" }}>Please select an organization location from the top bar.</p>
      </div>
    );
  }

  // 1. Fetch Segment Aggregation Summary for RFM Grid
  const locationId = searchParams.locationId;
  const statsConditions = [eq(crmCustomerProfiles.organizationId, organizationId)];
  if (locationId && locationId !== "ALL") {
    statsConditions.push(eq(crmCustomerProfiles.preferredLocationId, locationId));
  }

  const segmentStats = await db
    .select({
      segment: crmCustomerProfiles.rfmSegment,
      count: sql<number>`count(*)`,
      totalSpend: sql<number>`coalesce(sum(${crmCustomerProfiles.monetarySpend}::numeric), 0)`,
      avgFrequency: sql<number>`coalesce(avg(${crmCustomerProfiles.frequencyOrders}), 0)`,
    })
    .from(crmCustomerProfiles)
    .where(and(...statsConditions))
    .groupBy(crmCustomerProfiles.rfmSegment);

  // 2. Fetch Paginated Customer RFM Cohort List
  const offset = (page - 1) * pageSize;
  const conditions = [eq(crmCustomerProfiles.organizationId, organizationId)];
  if (locationId && locationId !== "ALL") {
    conditions.push(eq(crmCustomerProfiles.preferredLocationId, locationId));
  }

  if (selectedSegment !== "ALL") {
    conditions.push(eq(crmCustomerProfiles.rfmSegment, selectedSegment));
  }

  const cohortList = await db
    .select({
      id: crmCustomerProfiles.id,
      customerId: crmCustomerProfiles.customerId,
      customerName: customers.name,
      customerPhone: customers.phone,
      customerEmail: customers.email,
      rfmSegment: crmCustomerProfiles.rfmSegment,
      recencyDays: crmCustomerProfiles.recencyDays,
      frequencyOrders: crmCustomerProfiles.frequencyOrders,
      monetarySpend: crmCustomerProfiles.monetarySpend,
      priorityScore: crmCustomerProfiles.priorityScore,
      lifecycleStage: crmCustomerProfiles.lifecycleStage,
      lastCalculatedAt: crmCustomerProfiles.lastCalculatedAt,
    })
    .from(crmCustomerProfiles)
    .innerJoin(customers, eq(crmCustomerProfiles.customerId, customers.id))
    .where(and(...conditions))
    .orderBy(desc(crmCustomerProfiles.monetarySpend))
    .limit(pageSize)
    .offset(offset);

  const [totalResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(crmCustomerProfiles)
    .where(and(...conditions));

  const totalCount = Number(totalResult?.count || 0);
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="crm-container">
      <IntelligenceClient
        organizationId={organizationId}
        segmentStats={segmentStats}
        cohortList={cohortList}
        currentPage={page}
        totalPages={totalPages}
        totalCount={totalCount}
        selectedSegment={selectedSegment}
        recencyMax={recencyMax}
        minSpend={minSpend}
      />
    </div>
  );
}
