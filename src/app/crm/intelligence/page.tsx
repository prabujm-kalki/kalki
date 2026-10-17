import React from "react";
import { db } from "@/db";
import { customers, crmCustomerProfiles } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import IntelligenceClient from "./IntelligenceClient";
import {
  getDormantVIPs,
  getAovDrops,
  getCriticalDebtors,
  getCrmIntelligenceConfig,
} from "@/domains/crm/crmService";
import "../crm.css";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    organizationId?: string;
    locationId?: string;
    page?: string;
    segment?: string;
    dynamicRule?: string;
    recencyMax?: string;
    minSpend?: string;
  }>;
}

export default async function IntelligencePage(props: PageProps) {
  const searchParams = await props.searchParams;
  const organizationId = searchParams.organizationId || "";
  const locationId = searchParams.locationId;
  const page = parseInt(searchParams.page || "1", 10);
  const selectedSegment = searchParams.segment || "ALL";
  const dynamicRule = searchParams.dynamicRule || "";
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

  // 1. Fetch Dynamic List Alerts (Anomaly Detection)
  const [dormantVips, aovDrops, criticalDebtors, configValues] = await Promise.all([
    getDormantVIPs(organizationId, locationId),
    getAovDrops(organizationId, locationId),
    getCriticalDebtors(organizationId, locationId),
    getCrmIntelligenceConfig(organizationId, locationId),
  ]);

  const alertCards = [
    {
      rule: "DORMANT_VIPS",
      title: dormantVips.title,
      description: dormantVips.description,
      badge: dormantVips.badge,
      count: dormantVips.count,
      type: "critical",
    },
    {
      rule: "AOV_DROPS",
      title: aovDrops.title,
      description: aovDrops.description,
      badge: aovDrops.badge,
      count: aovDrops.count,
      type: "warning",
    },
    {
      rule: "CRITICAL_DEBTORS",
      title: criticalDebtors.title,
      description: criticalDebtors.description,
      badge: criticalDebtors.badge,
      count: criticalDebtors.count,
      type: "critical",
    },
  ];

  // 2. Fetch Segment Aggregation Summary for RFM Grid
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

  // 3. Handle Dynamic Rule View or RFM Cohort View
  let cohortList: any[] = [];
  let totalCount = 0;

  if (dynamicRule) {
    let sourceCustomers: any[] = [];
    if (dynamicRule === "DORMANT_VIPS") sourceCustomers = dormantVips.customers;
    else if (dynamicRule === "AOV_DROPS") sourceCustomers = aovDrops.customers;
    else if (dynamicRule === "CRITICAL_DEBTORS") sourceCustomers = criticalDebtors.customers;

    totalCount = sourceCustomers.length;
    const offset = (page - 1) * pageSize;
    const pagedSlice = sourceCustomers.slice(offset, offset + pageSize);

    cohortList = pagedSlice.map((c) => ({
      id: c.customerId || c.customerName,
      customerId: c.customerId || "",
      customerName: c.customerName,
      customerPhone: c.customerPhone,
      customerEmail: null,
      rfmSegment: dynamicRule.replace("_", " "),
      recencyDays: 0,
      frequencyOrders: Number(c.totalOrders || 0),
      monetarySpend: String(c.totalSpend || 0),
      priorityScore: 90,
      lifecycleStage: dynamicRule,
      lastCalculatedAt: c.lastPurchaseDate ? new Date(c.lastPurchaseDate) : new Date(),
    }));
  } else {
    const offset = (page - 1) * pageSize;
    const conditions = [eq(crmCustomerProfiles.organizationId, organizationId)];
    if (locationId && locationId !== "ALL") {
      conditions.push(eq(crmCustomerProfiles.preferredLocationId, locationId));
    }

    if (selectedSegment !== "ALL") {
      conditions.push(eq(crmCustomerProfiles.rfmSegment, selectedSegment));
    }

    cohortList = await db
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

    totalCount = Number(totalResult?.count || 0);
  }

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="crm-container">
      <IntelligenceClient
        organizationId={organizationId}
        locationId={locationId || null}
        alertCards={alertCards}
        dynamicRule={dynamicRule}
        segmentStats={segmentStats}
        cohortList={cohortList}
        currentPage={page}
        totalPages={totalPages}
        totalCount={totalCount}
        selectedSegment={selectedSegment}
        recencyMax={recencyMax}
        minSpend={minSpend}
        configValues={configValues}
      />
    </div>
  );
}
