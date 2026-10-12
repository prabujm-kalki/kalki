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
  }>;
}

export default async function ScoringPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const organizationId = searchParams.organizationId || "";
  const locationId = searchParams.locationId;
  const page = parseInt(searchParams.page || "1", 10);
  const stage = searchParams.stage || "ALL";
  const minScore = parseInt(searchParams.minScore || "0", 10);
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

  if (locationId && locationId !== "ALL") {
    conditions.push(eq(crmCustomerProfiles.preferredLocationId, locationId));
  }

  if (stage !== "ALL") {
    conditions.push(eq(crmCustomerProfiles.lifecycleStage, stage));
  }

  const scoringList = await db
    .select({
      id: crmCustomerProfiles.id,
      customerId: crmCustomerProfiles.customerId,
      customerName: customers.name,
      customerPhone: customers.phone,
      priorityScore: crmCustomerProfiles.priorityScore,
      lifecycleStage: crmCustomerProfiles.lifecycleStage,
      churnRiskPercentage: crmCustomerProfiles.churnRiskPercentage,
      predictedNextVisitDays: crmCustomerProfiles.predictedNextVisitDays,
      monetarySpend: crmCustomerProfiles.monetarySpend,
      rfmSegment: crmCustomerProfiles.rfmSegment,
      lastCalculatedAt: crmCustomerProfiles.lastCalculatedAt,
    })
    .from(crmCustomerProfiles)
    .innerJoin(customers, eq(crmCustomerProfiles.customerId, customers.id))
    .where(and(...conditions))
    .orderBy(desc(crmCustomerProfiles.priorityScore))
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
      />
    </div>
  );
}
