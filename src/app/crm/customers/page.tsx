import React, { Suspense } from "react";
import { db } from "@/db";
import { customers, crmCustomerProfiles, locations } from "@/db/schema";
import { eq, and, desc, asc, sql, ilike, or } from "drizzle-orm";
import CustomersClient from "./CustomersClient";
import "../crm.css";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    organizationId?: string;
    locationId?: string;
    page?: string;
    q?: string;
    search?: string;
    category?: string;
    type?: string;
    status?: string;
    sort?: string;
    selectedId?: string;
  }>;
}

export default async function CustomersPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const organizationId = searchParams.organizationId || "";
  const page = parseInt(searchParams.page || "1", 10);
  const search = searchParams.q || searchParams.search || "";
  const categoryFilter = searchParams.category || searchParams.type || "ALL";
  const statusFilter = searchParams.status || "ALL";
  const sortOption = searchParams.sort || "NEWEST";
  const selectedCustomerId = searchParams.selectedId || "";
  const pageSize = 10;

  if (!organizationId) {
    return (
      <div className="crm-container" style={{ padding: "2rem" }}>
        <p style={{ color: "#64748b" }}>Please select an organization location from the top bar.</p>
      </div>
    );
  }

  // 1. Fetch Location list for filters
  const locs = await db
    .select({ id: locations.id, name: locations.name })
    .from(locations)
    .where(eq(locations.organizationId, organizationId));

  // 2. Build where clause
  const conditions = [eq(customers.organizationId, organizationId)];

  const locationId = searchParams.locationId;
  if (locationId && locationId !== "ALL") {
    conditions.push(eq(crmCustomerProfiles.preferredLocationId, locationId));
  }

  if (categoryFilter !== "ALL") {
    conditions.push(eq(crmCustomerProfiles.customerType, categoryFilter));
  }

  if (statusFilter !== "ALL") {
    conditions.push(eq(crmCustomerProfiles.lifecycleStage, statusFilter));
  }

  if (search.trim()) {
    conditions.push(
      or(
        ilike(customers.name, `%${search.trim()}%`),
        ilike(customers.phone, `%${search.trim()}%`),
        ilike(customers.email, `%${search.trim()}%`)
      )!
    );
  }

  // Determine sort order
  let orderByClause = desc(customers.createdAt);
  if (sortOption === "SPEND_DESC") {
    orderByClause = desc(crmCustomerProfiles.monetarySpend);
  } else if (sortOption === "RECENTLY_ADDED" || sortOption === "NEWEST") {
    orderByClause = desc(customers.createdAt);
  } else if (sortOption === "ALPHA_ASC") {
    orderByClause = asc(customers.name);
  }

  // 3. Query Paginated Customers with their CRM Profile
  const offset = (page - 1) * pageSize;

  const rawRows = await db
    .select({
      id: customers.id,
      name: customers.name,
      phone: customers.phone,
      email: customers.email,
      createdAt: customers.createdAt,
      customerType: crmCustomerProfiles.customerType,
      priorityScore: crmCustomerProfiles.priorityScore,
      rfmSegment: crmCustomerProfiles.rfmSegment,
      lifecycleStage: crmCustomerProfiles.lifecycleStage,
      monetarySpend: crmCustomerProfiles.monetarySpend,
      whatsappConsent: crmCustomerProfiles.whatsappConsent,
    })
    .from(customers)
    .leftJoin(crmCustomerProfiles, eq(customers.id, crmCustomerProfiles.customerId))
    .where(and(...conditions))
    .orderBy(orderByClause)
    .limit(pageSize)
    .offset(offset);

  // 4. Total count for URL-state pagination
  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(customers)
    .leftJoin(crmCustomerProfiles, eq(customers.id, crmCustomerProfiles.customerId))
    .where(and(...conditions));

  const totalCount = Number(countResult?.count || 0);
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  // Active customer for 360 timeline
  const activeId = selectedCustomerId || (rawRows[0]?.id ?? "");

  return (
    <div className="crm-container">
      <CustomersClient
        organizationId={organizationId}
        customers={rawRows}
        locations={locs}
        currentPage={page}
        totalPages={totalPages}
        totalCount={totalCount}
        searchQuery={search}
        selectedType={categoryFilter}
        selectedCustomerId={activeId}
      />
    </div>
  );
}
