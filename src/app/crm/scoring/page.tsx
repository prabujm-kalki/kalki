import React from "react";
import { db } from "@/db";
import { customers, crmCustomerProfiles } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import ScoringClient from "./ScoringClient";
import "../crm.css";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    organizationId?: string;
    locationId?: string;
    page?: string;
    stage?: string;
    minScore?: string;
    rWeight?: string;
    fWeight?: string;
    mWeight?: string;
  }>;
}

export default async function ScoringPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const organizationId = searchParams.organizationId || "";
  const locationId = searchParams.locationId;
  const page = parseInt(searchParams.page || "1", 10);
  const stage = searchParams.stage || "ALL";
  const minScore = parseInt(searchParams.minScore || "0", 10);
  const rWeight = parseInt(searchParams.rWeight || "35", 10);
  const fWeight = parseInt(searchParams.fWeight || "35", 10);
  const mWeight = parseInt(searchParams.mWeight || "30", 10);
  const pageSize = 10;

  if (!organizationId) {
    return (
      <div className="crm-container" style={{ padding: "2rem" }}>
        <p style={{ color: "#64748b" }}>Please select an organization location from the top bar.</p>
      </div>
    );
  }

  const offset = (page - 1) * pageSize;
  const conditions = [eq(crmCustomerProfiles.organizationId, organizationId)];

  if (locationId && locationId !== "ALL" && locationId !== "all") {
    conditions.push(eq(crmCustomerProfiles.preferredLocationId, locationId));
  }

  if (stage !== "ALL") {
    conditions.push(eq(crmCustomerProfiles.lifecycleStage, stage));
  }

  // Dynamic priority score formula based on weighted RFM factors (0 - 100)
  // Recency score (0-100): 100 if recency <= 7 days, smoothly decreases as days increase
  // Frequency score (0-100): 100 if frequency >= 10 orders, linear scale up to 10
  // Monetary score (0-100): 100 if spend >= 10,000, linear scale up to 10,000
  const totalWeight = (rWeight + fWeight + mWeight) || 100;
  const dynamicScoreSql = sql<number>`
    LEAST(100, GREATEST(0, ROUND(
      (
        (${rWeight} * GREATEST(0, (100 - LEAST(100, ${crmCustomerProfiles.recencyDays} * 100 / 120)))) +
        (${fWeight} * LEAST(100, ${crmCustomerProfiles.frequencyOrders} * 10)) +
        (${mWeight} * LEAST(100, (${crmCustomerProfiles.monetarySpend}::numeric / 100)))
      ) / ${totalWeight}
    )))
  `;

  const scoringList = await db
    .select({
      id: crmCustomerProfiles.id,
      customerId: crmCustomerProfiles.customerId,
      customerName: customers.name,
      customerPhone: customers.phone,
      priorityScore: dynamicScoreSql,
      lifecycleStage: crmCustomerProfiles.lifecycleStage,
      churnRiskPercentage: crmCustomerProfiles.churnRiskPercentage,
      predictedNextVisitDays: crmCustomerProfiles.predictedNextVisitDays,
      monetarySpend: crmCustomerProfiles.monetarySpend,
      rfmSegment: crmCustomerProfiles.rfmSegment,
      recencyDays: crmCustomerProfiles.recencyDays,
      frequencyOrders: crmCustomerProfiles.frequencyOrders,
      lastCalculatedAt: crmCustomerProfiles.lastCalculatedAt,
    })
    .from(crmCustomerProfiles)
    .innerJoin(customers, eq(crmCustomerProfiles.customerId, customers.id))
    .where(and(...conditions))
    .orderBy(desc(dynamicScoreSql))
    .limit(pageSize)
    .offset(offset);

  const [countRes] = await db
    .select({ count: sql<number>`count(*)` })
    .from(crmCustomerProfiles)
    .where(and(...conditions));

  const totalCount = Number(countRes?.count || 0);
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="crm-container">
      <ScoringClient
        organizationId={organizationId}
        scoringList={scoringList}
        currentPage={page}
        totalPages={totalPages}
        totalCount={totalCount}
        selectedStage={stage}
        minScore={minScore}
        initialRWeight={rWeight}
        initialFWeight={fWeight}
        initialMWeight={mWeight}
      />
    </div>
  );
}
