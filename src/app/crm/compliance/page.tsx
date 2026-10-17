import React from "react";
import { db } from "@/db";
import { customers, crmCustomerProfiles, crmConsentLogs } from "@/db/schema";
import { eq, and, desc, sql, ilike, or } from "drizzle-orm";
import ComplianceClient from "./ComplianceClient";
import "../crm.css";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    organizationId?: string;
    locationId?: string;
    page?: string;
    search?: string;
    channel?: string;
  }>;
}

export default async function CompliancePage(props: PageProps) {
  const searchParams = await props.searchParams;
  const organizationId = searchParams.organizationId || "";
  const locationId = searchParams.locationId;
  const page = parseInt(searchParams.page || "1", 10);
  const search = searchParams.search || "";
  const channelFilter = searchParams.channel || "ALL";
  const pageSize = 10;

  if (!organizationId) {
    return (
      <div className="crm-container" style={{ padding: "2rem" }}>
        <p style={{ color: "#64748b" }}>Please select an organization location from the top bar.</p>
      </div>
    );
  }

  const offset = (page - 1) * pageSize;
  const isLocFiltered = !!(locationId && locationId !== "ALL" && locationId !== "all");

  const conditions = [eq(customers.organizationId, organizationId)];

  if (isLocFiltered) {
    conditions.push(eq(crmCustomerProfiles.preferredLocationId, locationId));
  }

  if (search.trim()) {
    conditions.push(
      or(
        ilike(customers.name, `%${search.trim()}%`),
        ilike(customers.phone, `%${search.trim()}%`)
      )!
    );
  }

  // 1. Fetch Customer Master Consent Ledger
  const consentListQuery = db
    .select({
      id: customers.id,
      name: customers.name,
      phone: customers.phone,
      email: customers.email,
      whatsappConsent: crmCustomerProfiles.whatsappConsent,
      smsConsent: crmCustomerProfiles.smsConsent,
      consentUpdatedAt: crmCustomerProfiles.consentUpdatedAt,
      createdAt: customers.createdAt,
    })
    .from(customers);

  const consentList = isLocFiltered
    ? await consentListQuery
        .innerJoin(crmCustomerProfiles, eq(customers.id, crmCustomerProfiles.customerId))
        .where(and(...conditions))
        .orderBy(desc(customers.createdAt))
        .limit(pageSize)
        .offset(offset)
    : await consentListQuery
        .leftJoin(crmCustomerProfiles, eq(customers.id, crmCustomerProfiles.customerId))
        .where(and(...conditions))
        .orderBy(desc(customers.createdAt))
        .limit(pageSize)
        .offset(offset);

  // 2. Fetch Recent Audit Logs for Consent Activity
  const auditLogs = await db
    .select({
      id: crmConsentLogs.id,
      customerId: crmConsentLogs.customerId,
      channel: crmConsentLogs.channel,
      consentGranted: crmConsentLogs.consentGranted,
      source: crmConsentLogs.source,
      createdAt: crmConsentLogs.createdAt,
      customerName: customers.name,
      customerPhone: customers.phone,
    })
    .from(crmConsentLogs)
    .leftJoin(customers, eq(crmConsentLogs.customerId, customers.id))
    .where(eq(crmConsentLogs.organizationId, organizationId))
    .orderBy(desc(crmConsentLogs.createdAt))
    .limit(10);

  const countQuery = db
    .select({ count: sql<number>`count(*)` })
    .from(customers);

  const [countRes] = isLocFiltered
    ? await countQuery
        .innerJoin(crmCustomerProfiles, eq(customers.id, crmCustomerProfiles.customerId))
        .where(and(...conditions))
    : await countQuery.where(and(...conditions));

  const totalCount = Number(countRes?.count || 0);
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="crm-container">
      <ComplianceClient
        organizationId={organizationId}
        consentList={consentList}
        auditLogs={auditLogs}
        currentPage={page}
        totalPages={totalPages}
        totalCount={totalCount}
        searchQuery={search}
        channelFilter={channelFilter}
      />
    </div>
  );
}
