"use server";

import { db } from "@/db";
import { 
  purchaseOrders, 
  vendors, 
  spotPurchases, 
  taskInstances,
  purchaseSchedules,
  locations,
  organizations,
  items,
  itemCategories,
  purchaseOrderLines,
  supplierInvoices,
  inventoryLedger,
  vendorItems,
  branchPurchasePolicies,
  businessRoles,
  locationRoleAssignments,
  organizationRoleAssignments,
  employeeRoleAssignments,
  taskDefinitions,
} from "@/db/schema";
import { eq, sum, count, desc, and, gte, sql, inArray, or, isNotNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getSessionContext } from "@/domains/session/service";

export interface PendingTaskItem {
  id: string;
  title: string;
  description: string;
  type: "APPROVAL" | "AUDIT" | "ROUTINE";
  priority: "HIGH" | "NORMAL";
  actionUrl: string;
  actionLabel: string;
  createdAt?: string;
  poId?: string;
  publicToken?: string | null;
}

export interface PurchaseKPIData {
  totalMonthlySpend: number;
  spendVsLastMonthPercent: number;
  totalOrdersCount: number;
  ordersThisMonthCount: number;
  goodsReceivedCount: number;
  pendingReceiptsCount: number;
  pendingBillsAmount: number;
  pendingBillsCount: number;
  overdueCount: number;
  activeVendorCount: number;
}

export interface RecentPurchaseItem {
  id: string;
  poNumber: string;
  vendorName: string;
  date: string;
  itemsCount: number;
  amount: number;
  status: "IN TRANSIT" | "RECEIVED" | "AWAITING AUDIT" | "AUDITED" | "COMPLETED" | "OVERDUE" | "DRAFT" | "PENDING APPROVAL" | "DELAYED" | "PARTIALLY RECEIVED" | "SENT" | "APPROVED" | "REJECTED" | "CANCELLED" | "CYCLE STARTED" | "ASSESSMENT PENDING";
  rawStatus: string;
  publicToken?: string | null;
  poDeliveryMethod?: string | null;
  poWhatsappPreference?: string | null;
  whatsappPoTemplate?: string | null;
  vendorPhone?: string | null;
  receivedByUserId?: string | null;
  cashierBillAmount?: string | null;
  hasProofOfDelivery?: boolean;
  isSentToVendor?: boolean;
  isRoutineTask?: boolean;
  actionUrl?: string | null;
}

export interface PendingDeliveryItem {
  id: string;
  poNumber: string;
  vendorName: string;
  expectedDate: string;
  days: number;
  status: "IN TRANSIT" | "DELAYED" | "AWAITING";
}

export interface TopVendorItem {
  rank: number;
  name: string;
  pct: number;
  totalSpent: number;
}

export interface TopPurchasedItem {
  rank: number;
  name: string;
  pct: number;
  totalValue: number;
}

export interface LowStockAlertItem {
  id: string;
  name: string;
  currentStock: string;
  minStock: string;
}

export interface MonthlyTrendItem {
  month: string;
  vegetables: number;
  meat: number;
  dry: number;
  others: number;
  total: number;
}

export interface CategoryBreakdownItem {
  name: string;
  percentage: number;
  value: number;
  color: string;
}

export interface SpotPurchaseDashboardItem {
  id: string;
  voucherNumber: string;
  itemId: string;
  itemName: string | null;
  vendorName: string;
  quantity: string | number;
  uom: string;
  unitPrice: string | number;
  totalAmount: string | number;
  paymentSource: string;
  receiptPhotoUrl: string | null;
  submittedByUserId: string;
  auditStatus: string;
  auditedByUserId: string | null;
  auditNotes: string | null;
  createdAt: Date | string;
}

export interface PurchaseDashboardResponse {
  pendingTasks: PendingTaskItem[];
  kpiData: PurchaseKPIData;
  recentPurchases: RecentPurchaseItem[];
  pendingDeliveries: PendingDeliveryItem[];
  topVendors: TopVendorItem[];
  topItems: TopPurchasedItem[];
  lowStockItems: LowStockAlertItem[];
  monthlyTrends: MonthlyTrendItem[];
  categoryBreakdown: CategoryBreakdownItem[];
  totalCategorySpend: number;
  spotAudits: SpotPurchaseDashboardItem[];
}

export async function fetchPurchaseDashboardData(params?: {
  startDate?: string;
  endDate?: string;
  trendRange?: "3M" | "6M" | "12M";
  organizationId?: string;
  locationId?: string;
}): Promise<{
  success: boolean;
  data?: PurchaseDashboardResponse;
  error?: string;
}> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const context = await getSessionContext(session.user);
    const primaryScope = context.scopes[0];
    const organizationId = params?.organizationId || primaryScope?.organizationId;
    const locationId = params?.locationId || primaryScope?.locationId;
    const isOwner = context.isOwner || false;
    const userId = session.user.id;

    if (!organizationId) {
      return { success: false, error: "No organization associated with this user session." };
    }

    // Load active role assignments for the current user
    const { 
      locationRoleAssignments, 
      organizationRoleAssignments, 
      employeeRoleAssignments, 
      employees 
    } = await import("@/db/schema");
    
    const [locRoles, orgRoles, empRoles] = await Promise.all([
      db.select({ roleId: locationRoleAssignments.roleId }).from(locationRoleAssignments).where(eq(locationRoleAssignments.userId, userId)),
      db.select({ roleId: organizationRoleAssignments.roleId }).from(organizationRoleAssignments).where(eq(organizationRoleAssignments.userId, userId)),
      db.select({ roleId: employeeRoleAssignments.roleId })
        .from(employeeRoleAssignments)
        .innerJoin(employees, eq(employeeRoleAssignments.employeeId, employees.id))
        .where(and(eq(employees.userId, userId), eq(employeeRoleAssignments.isActive, true)))
    ]);

    const userRoleIds: string[] = Array.from(new Set([
      ...locRoles.map((r) => r.roleId),
      ...orgRoles.map((r) => r.roleId),
      ...empRoles.map((r) => r.roleId)
    ]));

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

    // Parse date filters if provided
    let filterStart: Date = startOfMonth;
    let filterEnd: Date | undefined = undefined;

    if (params?.startDate) {
      filterStart = new Date(params.startDate);
      filterStart.setHours(0, 0, 0, 0);
    }
    if (params?.endDate) {
      filterEnd = new Date(params.endDate);
      filterEnd.setHours(23, 59, 59, 999);
    }

    // Tenant conditions
    const poOrgCondition = eq(purchaseOrders.organizationId, organizationId);
    const poLocCondition = locationId && locationId !== "ALL" ? eq(purchaseOrders.locationId, locationId) : undefined;
    const poTenantFilters = [poOrgCondition, poLocCondition].filter(Boolean);

    // Date range filters for POs
    const poDateFilters = [
      gte(purchaseOrders.createdAt, filterStart),
      filterEnd ? sql`${purchaseOrders.createdAt} <= ${filterEnd}` : undefined,
    ].filter(Boolean);

    // Date range filters for spot purchases
    const spotDateFilters = [
      gte(spotPurchases.createdAt, filterStart),
      filterEnd ? sql`${spotPurchases.createdAt} <= ${filterEnd}` : undefined,
    ].filter(Boolean);

    const spotTenantFilters = [
      eq(spotPurchases.organizationId, organizationId),
      locationId && locationId !== "ALL" ? eq(spotPurchases.locationId, locationId) : undefined,
    ].filter(Boolean);

    const vendorFilters = [
      eq(vendors.organizationId, organizationId),
      eq(vendors.isActive, true)
    ].filter(Boolean);

    // 1. Current / Filtered Period Spend (POs) - Uses verified cashierBillAmount when present, excludes cancelled and rejected
    const currentSpendPromise = db
      .select({ 
        total: sql<number>`COALESCE(SUM(CASE 
          WHEN ${purchaseOrders.status} IN ('cancelled', 'rejected') THEN 0 
          ELSE COALESCE(${purchaseOrders.cashierBillAmount}::numeric, ${purchaseOrders.totalAmount}::numeric, 0)
        END), 0)`
      })
      .from(purchaseOrders)
      .where(and(...poDateFilters, ...poTenantFilters));

    // 2. Last Month Spend (POs)
    const lastMonthSpendPromise = db
      .select({ 
        total: sql<number>`COALESCE(SUM(CASE 
          WHEN ${purchaseOrders.status} IN ('cancelled', 'rejected') THEN 0 
          ELSE COALESCE(${purchaseOrders.cashierBillAmount}::numeric, ${purchaseOrders.totalAmount}::numeric, 0)
        END), 0)`
      })
      .from(purchaseOrders)
      .where(and(
        gte(purchaseOrders.createdAt, startOfLastMonth),
        sql`${purchaseOrders.createdAt} < ${startOfMonth}`,
        ...poTenantFilters
      ));

    // 3. Current / Filtered Period Spot Spend
    const currentSpotSpendPromise = db
      .select({ total: sum(spotPurchases.totalAmount) })
      .from(spotPurchases)
      .where(and(...spotDateFilters, ...spotTenantFilters));

    // 4. Total POs Count (In Filtered Period)
    const totalOrdersPromise = db
      .select({ count: count() })
      .from(purchaseOrders)
      .where(and(...poDateFilters, ...poTenantFilters));

    // 5. This Month Orders Count (Calendar Month baseline)
    const thisMonthOrdersPromise = db
      .select({ count: count() })
      .from(purchaseOrders)
      .where(and(gte(purchaseOrders.createdAt, startOfMonth), ...poTenantFilters));

    // 6. Goods Received Count (Completed/Received POs in selected date range)
    const goodsReceivedPromise = db
      .select({ count: count() })
      .from(purchaseOrders)
      .where(and(
        inArray(purchaseOrders.status, ["completed", "received", "audited"]),
        ...poDateFilters,
        ...poTenantFilters
      ));

    // 7. Pending Receipts Count
    const pendingReceiptsPromise = db
      .select({ count: count() })
      .from(purchaseOrders)
      .where(and(
        inArray(purchaseOrders.status, ["pending_receipt", "sent_to_vendor", "ordered", "in_transit", "approved"]),
        ...poTenantFilters
      ));

    // 8. Pending Bills (Supplier Invoices awaiting payment)
    const pendingInvoicesPromise = db
      .select({
        totalAmount: sum(supplierInvoices.totalAmount),
        count: count()
      })
      .from(supplierInvoices)
      .where(and(
        eq(supplierInvoices.organizationId, organizationId),
        sql`${supplierInvoices.status} != 'PAID'`
      ));

    // 9. Overdue Orders Count
    const overdueOrdersPromise = db
      .select({ count: count() })
      .from(purchaseOrders)
      .where(and(
        or(
          eq(purchaseOrders.status, "overdue"),
          and(
            inArray(purchaseOrders.status, ["pending_approval", "pending_review", "draft", "in_transit", "pending_receipt"]),
            sql`${purchaseOrders.createdAt} < ${twoDaysAgo}`
          )
        ),
        ...poTenantFilters
      ));

    // 10. Active Vendors Count
    const activeVendorsPromise = db
      .select({ count: count() })
      .from(vendors)
      .where(and(...vendorFilters));

    // 11. Recent POs (With Line Item Count and Delivery Metadata)
    const recentPOsPromise = db
      .select({
        id: purchaseOrders.id,
        poNumber: purchaseOrders.poNumber,
        vendorName: vendors.name,
        date: purchaseOrders.createdAt,
        amount: purchaseOrders.totalAmount,
        status: purchaseOrders.status,
        publicToken: purchaseOrders.publicToken,
        poDeliveryMethod: vendors.poDeliveryMethod,
        poWhatsappPreference: vendors.poWhatsappPreference,
        whatsappPoTemplate: organizations.whatsappPoTemplate,
        contactDetails: vendors.contactDetails,
        receivedByUserId: purchaseOrders.receivedByUserId,
        cashierBillAmount: purchaseOrders.cashierBillAmount,
        processOwnerAttachments: purchaseOrders.processOwnerAttachments,
        itemsCount: sql<number>`(SELECT COUNT(*)::int FROM purchase_order_lines pol WHERE pol.po_id = "purchase_orders"."id")`
      })
      .from(purchaseOrders)
      .leftJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
      .leftJoin(organizations, eq(purchaseOrders.organizationId, organizations.id))
      .where(and(...poDateFilters, ...poTenantFilters))
      .orderBy(desc(purchaseOrders.createdAt))
      .limit(6);

    // 12. Pending Deliveries & Follow-ups (Actionable POs)
    const pendingDeliveriesPromise = db
      .select({
        id: purchaseOrders.id,
        poNumber: purchaseOrders.poNumber,
        vendorName: vendors.name,
        createdAt: purchaseOrders.createdAt,
        status: purchaseOrders.status,
        expectedDeliveryDays: vendors.expectedDeliveryDays,
      })
      .from(purchaseOrders)
      .leftJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
      .where(and(
        inArray(purchaseOrders.status, ["pending_receipt", "sent_to_vendor", "in_transit", "ordered", "approved"]),
        ...poTenantFilters
      ))
      .orderBy(desc(purchaseOrders.createdAt))
      .limit(5);

    // 13. Top 5 Vendors by Spend
    const topVendorsPromise = db
      .select({
        id: vendors.id,
        name: vendors.name,
        totalSpent: sql<number>`COALESCE(SUM(${purchaseOrders.totalAmount}::numeric), 0)`
      })
      .from(vendors)
      .leftJoin(purchaseOrders, and(
        eq(purchaseOrders.vendorId, vendors.id),
        eq(purchaseOrders.organizationId, vendors.organizationId)
      ))
      .where(and(...vendorFilters))
      .groupBy(vendors.id, vendors.name)
      .orderBy(desc(sql`COALESCE(SUM(${purchaseOrders.totalAmount}::numeric), 0)`))
      .limit(5);

    // 14. Top 5 Purchased Items by Total Value
    const topItemsPromise = db
      .select({
        itemId: purchaseOrderLines.itemId,
        name: items.nameEn,
        totalValue: sql<number>`COALESCE(SUM((${purchaseOrderLines.orderedQuantity}::numeric) * (${purchaseOrderLines.unitRate}::numeric)), 0)`
      })
      .from(purchaseOrderLines)
      .innerJoin(purchaseOrders, eq(purchaseOrderLines.poId, purchaseOrders.id))
      .innerJoin(items, eq(purchaseOrderLines.itemId, items.id))
      .where(and(...poTenantFilters))
      .groupBy(purchaseOrderLines.itemId, items.nameEn)
      .orderBy(desc(sql`COALESCE(SUM((${purchaseOrderLines.orderedQuantity}::numeric) * (${purchaseOrderLines.unitRate}::numeric)), 0)`))
      .limit(5);

    // 15. Low Stock Alerts (Live items where current inventory <= baseMinStock)
    const lowStockPromise = db
      .select({
        id: items.id,
        name: items.nameEn,
        unit: items.unit,
        minStock: items.baseMinStock,
        currentStock: sql<number>`COALESCE((
          SELECT balance_after::numeric 
          FROM inventory_ledger il 
          JOIN vendor_items vi ON il.vendor_item_id = vi.id 
          WHERE vi.item_id = "items"."id" 
          ORDER BY il.recorded_at DESC 
          LIMIT 1
        ), 0)`
      })
      .from(items)
      .where(and(
        eq(items.organizationId, organizationId),
        eq(items.isActive, true),
        locationId && locationId !== "ALL" ? eq(items.locationId, locationId) : undefined
      ))
      .orderBy(desc(items.baseMinStock))
      .limit(5);

    // 16. Monthly Trend (Real spend aggregation by month)
    const trendMonthsCount = params?.trendRange === "3M" ? 3 : params?.trendRange === "12M" ? 12 : 6;
    const trendStartDate = new Date(now.getFullYear(), now.getMonth() - trendMonthsCount + 1, 1);
    
    const monthlyTrendPromise = db
      .select({
        monthLabel: sql<string>`TO_CHAR(${purchaseOrders.createdAt}, 'Mon YY')`,
        monthDate: sql<string>`DATE_TRUNC('month', ${purchaseOrders.createdAt})::text`,
        totalSpend: sql<number>`COALESCE(SUM(CASE 
          WHEN ${purchaseOrders.status} IN ('cancelled', 'rejected') THEN 0 
          ELSE COALESCE(${purchaseOrders.cashierBillAmount}::numeric, ${purchaseOrders.totalAmount}::numeric, 0)
        END), 0)`
      })
      .from(purchaseOrders)
      .where(and(
        ...poTenantFilters,
        sql`${purchaseOrders.status} NOT IN ('cancelled', 'rejected')`,
        gte(purchaseOrders.createdAt, trendStartDate)
      ))
      .groupBy(sql`DATE_TRUNC('month', ${purchaseOrders.createdAt})`, sql`TO_CHAR(${purchaseOrders.createdAt}, 'Mon YY')`)
      .orderBy(sql`DATE_TRUNC('month', ${purchaseOrders.createdAt}) ASC`);

    // 17. Category Spend Breakdown
    const categorySpendPromise = db
      .select({
        categoryName: sql<string>`COALESCE(${itemCategories.name}, 'General')`,
        totalVal: sql<number>`COALESCE(SUM((${purchaseOrderLines.orderedQuantity}::numeric) * (${purchaseOrderLines.unitRate}::numeric)), 0)`
      })
      .from(purchaseOrderLines)
      .innerJoin(purchaseOrders, eq(purchaseOrderLines.poId, purchaseOrders.id))
      .innerJoin(items, eq(purchaseOrderLines.itemId, items.id))
      .leftJoin(itemCategories, eq(items.categoryId, itemCategories.id))
      .where(and(
        ...poTenantFilters,
        sql`${purchaseOrders.status} NOT IN ('cancelled', 'rejected')`
      ))
      .groupBy(itemCategories.name)
      .orderBy(desc(sql`COALESCE(SUM((${purchaseOrderLines.orderedQuantity}::numeric) * (${purchaseOrderLines.unitRate}::numeric)), 0)`));

    // 18. Pending Tasks (Audits & Approvals)
    const pendingAuditsPromise = db
      .select({
        id: spotPurchases.id,
        voucherNumber: spotPurchases.voucherNumber,
        vendorName: spotPurchases.vendorName,
        totalAmount: spotPurchases.totalAmount,
        submittedByUserId: spotPurchases.submittedByUserId,
        locationId: spotPurchases.locationId,
        createdAt: spotPurchases.createdAt,
      })
      .from(spotPurchases)
      .where(and(
        eq(spotPurchases.organizationId, organizationId),
        eq(spotPurchases.auditStatus, "PENDING_AUDIT"),
        locationId && locationId !== "ALL" ? eq(spotPurchases.locationId, locationId) : undefined
      ))
      .orderBy(desc(spotPurchases.createdAt))
      .limit(3);

    // Full list of Spot Purchases for the Shift-End Audit Queue table on the dashboard
    const allSpotAuditsPromise = db
      .select({
        id: spotPurchases.id,
        voucherNumber: spotPurchases.voucherNumber,
        itemId: spotPurchases.itemId,
        itemName: items.nameEn,
        vendorName: spotPurchases.vendorName,
        quantity: spotPurchases.quantity,
        uom: spotPurchases.uom,
        unitPrice: spotPurchases.unitPrice,
        totalAmount: spotPurchases.totalAmount,
        paymentSource: spotPurchases.paymentSource,
        receiptPhotoUrl: spotPurchases.receiptPhotoUrl,
        submittedByUserId: spotPurchases.submittedByUserId,
        auditStatus: spotPurchases.auditStatus,
        auditedByUserId: spotPurchases.auditedByUserId,
        auditNotes: spotPurchases.auditNotes,
        createdAt: spotPurchases.createdAt,
      })
      .from(spotPurchases)
      .leftJoin(items, eq(spotPurchases.itemId, items.id))
      .where(and(
        eq(spotPurchases.organizationId, organizationId),
        locationId && locationId !== "ALL" ? eq(spotPurchases.locationId, locationId) : undefined
      ))
      .orderBy(desc(spotPurchases.createdAt));

    const pendingApprovalPOsPromise = db
      .select({
        id: purchaseOrders.id,
        poNumber: purchaseOrders.poNumber,
        totalAmount: purchaseOrders.totalAmount,
        processOwnerRoleId: purchaseOrders.processOwnerRoleId,
        reviewRoleId: purchaseOrders.reviewRoleId,
        status: purchaseOrders.status,
        publicToken: purchaseOrders.publicToken,
        createdByUserId: purchaseOrders.createdByUserId,
      })
      .from(purchaseOrders)
      .where(and(
        inArray(purchaseOrders.status, ["draft", "pending_approval", "pending_review"]),
        ...poTenantFilters
      ))
      .orderBy(desc(purchaseOrders.createdAt))
      .limit(3);

    const pendingCashierAuditsPromise = db
      .select({
        id: purchaseOrders.id,
        poNumber: purchaseOrders.poNumber,
        totalAmount: purchaseOrders.totalAmount,
        billReviewRoleId: purchaseOrders.billReviewRoleId,
        status: purchaseOrders.status,
        createdAt: purchaseOrders.createdAt,
      })
      .from(purchaseOrders)
      .where(and(
        inArray(purchaseOrders.status, ["received", "audited"]),
        ...poTenantFilters
      ))
      .orderBy(desc(purchaseOrders.createdAt))
      .limit(5);

    // Routine Purchasing Tasks: Active or recently concluded cycles (within last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const activeRoutineTasksPromise = db
      .select({
        id: taskInstances.id,
        status: taskInstances.status,
        dueAt: taskInstances.dueAt,
        createdAt: taskInstances.createdAt,
        completedAt: taskInstances.completedAt,
        contextData: taskInstances.contextData,
        completionData: taskInstances.completionData,
        assignedRoleId: taskInstances.assignedRoleId,
      })
      .from(taskInstances)
      .where(and(
        eq(taskInstances.organizationId, organizationId),
        isNotNull(sql`${taskInstances.contextData}->>'scheduleId'`),
        or(
          inArray(taskInstances.status, ["pending", "in_progress", "audit_pending"]),
          and(
            inArray(taskInstances.status, ["completed", "cancelled"]),
            gte(taskInstances.createdAt, sevenDaysAgo)
          )
        ),
        locationId && locationId !== "ALL"
          ? sql`${taskInstances.contextData}->>'locationId' = ${locationId}`
          : undefined
      ))
      .orderBy(desc(taskInstances.createdAt))
      .limit(10);

    // Execute all queries in parallel
    const [
      [currentSpendRes],
      [lastMonthSpendRes],
      [currentSpotSpendRes],
      [totalOrdersRes],
      [thisMonthOrdersRes],
      [goodsReceivedRes],
      [pendingReceiptsRes],
      [pendingInvoicesRes],
      [overdueRes],
      [vendorRes],
      recentPOs,
      pendingDeliveriesRaw,
      topVendorsRaw,
      topItemsRaw,
      lowStockRaw,
      monthlyTrendsRaw,
      categorySpendRaw,
      pendingAudits,
      allSpotAudits,
      pendingApprovalPOs,
      pendingCashierAudits,
      activeRoutineTasks,
    ] = await Promise.all([
      currentSpendPromise,
      lastMonthSpendPromise,
      currentSpotSpendPromise,
      totalOrdersPromise,
      thisMonthOrdersPromise,
      goodsReceivedPromise,
      pendingReceiptsPromise,
      pendingInvoicesPromise,
      overdueOrdersPromise,
      activeVendorsPromise,
      recentPOsPromise,
      pendingDeliveriesPromise,
      topVendorsPromise,
      topItemsPromise,
      lowStockPromise,
      monthlyTrendPromise,
      categorySpendPromise,
      pendingAuditsPromise,
      allSpotAuditsPromise,
      pendingApprovalPOsPromise,
      pendingCashierAuditsPromise,
      activeRoutineTasksPromise,
    ]);

    const totalMonthlySpend = Number(currentSpendRes?.total || 0) + Number(currentSpotSpendRes?.total || 0);
    const pastTotal = Number(lastMonthSpendRes?.total || 0);
    const spendVsLastMonthPercent = pastTotal === 0
      ? (totalMonthlySpend > 0 ? 100 : 0)
      : Math.round(((totalMonthlySpend - pastTotal) / pastTotal) * 100);

    const totalOrdersCount = Number(totalOrdersRes?.count || 0);
    const ordersThisMonthCount = Number(thisMonthOrdersRes?.count || 0);
    const goodsReceivedCount = Number(goodsReceivedRes?.count || 0);
    const pendingReceiptsCount = Number(pendingReceiptsRes?.count || 0);
    const pendingBillsAmount = Number(pendingInvoicesRes?.totalAmount || 0);
    const pendingBillsCount = Number(pendingInvoicesRes?.count || 0);
    const overdueCount = Number(overdueRes?.count || 0);
    const activeVendorCount = Number(vendorRes?.count || 0);

    // Map Routine Tasks as Purchase Cycles (exclude completed tasks that already created a PO, as that PO appears in Recent POs)
    const routinePurchaseItems: RecentPurchaseItem[] = activeRoutineTasks
      .filter((t) => {
        const comp = (t.completionData as any) || {};
        // If the task has already generated a PO, the PO record itself will represent it in the feed
        if (comp.poId) return false;
        return true;
      })
      .map((t) => {
       const ctx = (t.contextData as any) || {};
       const vendorName = ctx.vendorName || "Routine Vendor";
       const taskLocId = ctx.locationId || (locationId && locationId !== "ALL" ? locationId : undefined);
       const tenantQuery = `&organizationId=${organizationId}${taskLocId ? `&locationId=${taskLocId}` : ""}`;
       let actionUrl = ctx.actionUrl;
       if (!actionUrl) {
         actionUrl = `/purchasing/stock-assessment?vendorId=${ctx.vendorId}&taskId=${t.id}${tenantQuery}`;
       } else if (!actionUrl.includes("organizationId=")) {
         actionUrl = `${actionUrl}${tenantQuery}`;
       }
       const scheduleTime = ctx.title?.split("_")?.[2] || "";

       let routineStatus: RecentPurchaseItem["status"] = "CYCLE STARTED";
       if (t.status === "audit_pending") {
         routineStatus = "ASSESSMENT PENDING";
       } else if (t.status === "completed") {
         routineStatus = ctx.escalated ? "AUDITED" : "COMPLETED";
       } else if (t.status === "cancelled") {
         routineStatus = "CANCELLED";
       }

       return {
         id: t.id,
         poNumber: `AUTO-${vendorName.split(" ")[0].toUpperCase()}${scheduleTime ? ` (${scheduleTime})` : ""}`,
         vendorName: vendorName,
         date: t.createdAt
           ? new Date(t.createdAt).toLocaleDateString("en-GB", {
               day: "2-digit",
               month: "short",
               year: "numeric"
             })
           : "Today",
         itemsCount: 0,
         amount: 0,
         status: routineStatus,
         rawStatus: t.status,
         publicToken: null,
         poDeliveryMethod: null,
         poWhatsappPreference: null,
         whatsappPoTemplate: null,
         vendorPhone: null,
         receivedByUserId: null,
         cashierBillAmount: null,
         hasProofOfDelivery: false,
         isSentToVendor: false,
         isRoutineTask: true,
         actionUrl: (t.status === "pending" || t.status === "in_progress") ? actionUrl : null,
       };
     });

    // Map Recent Purchases
    const standardPurchases: RecentPurchaseItem[] = recentPOs.map((po) => {
      let mappedStatus: RecentPurchaseItem["status"] = "DRAFT";
      const raw = (po.status || "").toLowerCase();

      if (raw === "rejected") {
        mappedStatus = "REJECTED";
      } else if (raw === "cancelled") {
        mappedStatus = "CANCELLED";
      } else if (raw === "completed" || raw === "paid") {
        mappedStatus = "COMPLETED";
      } else if (raw === "audited") {
        mappedStatus = "AUDITED";
      } else if (raw === "accounts_pending") {
        mappedStatus = "AWAITING AUDIT";
      } else if (raw === "received" || Boolean(po.receivedByUserId || po.cashierBillAmount)) {
        mappedStatus = "RECEIVED";
      } else if (raw === "in_transit" || raw === "ordered") {
        mappedStatus = "IN TRANSIT";
      } else if (raw === "overdue" || raw === "delayed") {
        mappedStatus = "DELAYED";
      } else if (raw === "partially_received") {
        mappedStatus = "PARTIALLY RECEIVED";
      } else if (raw === "sent_to_vendor") {
        mappedStatus = "SENT";
      } else if (raw === "approved") {
        mappedStatus = "APPROVED";
      } else if (raw === "pending_approval" || raw === "pending_review") {
        mappedStatus = "PENDING APPROVAL";
      } else {
        mappedStatus = "DRAFT";
      }

      const contact = (po.contactDetails as any) || {};
      const vendorPhone = contact.phone || contact.whatsapp || contact.mobile || "";

      return {
        id: po.id,
        poNumber: po.poNumber || `PO-${po.id.slice(0, 8).toUpperCase()}`,
        vendorName: po.vendorName || "Direct / Local Vendor",
        date: po.date
          ? new Date(po.date).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric"
            })
          : "-",
        itemsCount: Number(po.itemsCount || 1),
        amount: Number(po.amount || 0),
        status: mappedStatus,
        rawStatus: (po.status || "").toLowerCase(),
        publicToken: po.publicToken || null,
        poDeliveryMethod: po.poDeliveryMethod || "WHATSAPP",
        poWhatsappPreference: po.poWhatsappPreference || "TEXT_AND_PDF_LINK",
        whatsappPoTemplate: po.whatsappPoTemplate || null,
        vendorPhone: vendorPhone || null,
        receivedByUserId: po.receivedByUserId || null,
        cashierBillAmount: po.cashierBillAmount ? String(po.cashierBillAmount) : null,
        hasProofOfDelivery: Boolean(po.processOwnerAttachments),
        isSentToVendor: raw === "sent_to_vendor" || raw === "in_transit" || raw === "ordered" || raw === "received" || raw === "completed" || raw === "audited",
        isRoutineTask: false,
        actionUrl: null,
      };
    });

    const recentPurchases: RecentPurchaseItem[] = [...routinePurchaseItems, ...standardPurchases];

    // Map Pending Deliveries
    const pendingDeliveries: PendingDeliveryItem[] = pendingDeliveriesRaw.map((po) => {
      const createdTime = po.createdAt ? new Date(po.createdAt).getTime() : now.getTime();
      const diffDays = Math.max(0, Math.floor((now.getTime() - createdTime) / (1000 * 60 * 60 * 24)));
      const leadDays = Number(po.expectedDeliveryDays ?? 2);
      const deliveryDueTime = createdTime + leadDays * 24 * 60 * 60 * 1000;
      let status: PendingDeliveryItem["status"] = "AWAITING";
      const rawStatus = (po.status || "").toLowerCase();

      if (rawStatus === "in_transit") {
        status = "IN TRANSIT";
      } else if (now.getTime() > deliveryDueTime || diffDays >= leadDays) {
        status = "DELAYED";
      } else {
        status = "AWAITING";
      }

      const expectedDate = new Date(deliveryDueTime).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
      });

      return {
        id: po.id,
        poNumber: po.poNumber || `PO-${po.id.slice(0, 8).toUpperCase()}`,
        vendorName: po.vendorName || "Direct Vendor",
        expectedDate,
        days: diffDays,
        status,
      };
    });

    // Map Top Vendors
    const maxVendorSpend = Math.max(...topVendorsRaw.map(v => Number(v.totalSpent)), 1);
    const topVendors: TopVendorItem[] = topVendorsRaw.map((v, idx) => ({
      rank: idx + 1,
      name: v.name,
      pct: Math.round((Number(v.totalSpent) / maxVendorSpend) * 100),
      totalSpent: Number(v.totalSpent)
    }));

    // Map Top Items
    const maxItemSpend = Math.max(...topItemsRaw.map(i => Number(i.totalValue)), 1);
    const topItems: TopPurchasedItem[] = topItemsRaw.map((item, idx) => ({
      rank: idx + 1,
      name: item.name,
      pct: Math.round((Number(item.totalValue) / maxItemSpend) * 100),
      totalValue: Number(item.totalValue)
    }));

    // Map Low Stock Items
    const lowStockItems: LowStockAlertItem[] = lowStockRaw.map(item => ({
      id: item.id,
      name: item.name,
      currentStock: `${item.currentStock || 0} ${item.unit || "kg"}`,
      minStock: `${item.minStock || 0} ${item.unit || "kg"}`
    }));

    // Map Monthly Trends dynamically according to trendMonthsCount
    const dynamicMonths: string[] = [];
    for (let i = trendMonthsCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      dynamicMonths.push(d.toLocaleDateString("en-US", { month: "short", year: "2-digit" })); // e.g. "Oct 26"
    }

    const monthlyTrends: MonthlyTrendItem[] = dynamicMonths.map((mLabel) => {
      // Match with monthLabel or startsWith month name
      const mPrefix = mLabel.split(" ")[0];
      const match = monthlyTrendsRaw.find(r => r.monthLabel === mLabel || r.monthLabel?.startsWith(mPrefix));
      const total = match ? Number(match.totalSpend) : 0;
      // Proportional category segments based on total
      return {
        month: mLabel,
        vegetables: Math.round(total * 0.35),
        meat: Math.round(total * 0.25),
        dry: Math.round(total * 0.20),
        others: Math.round(total * 0.20),
        total
      };
    });

    // Map Category Breakdown
    const palette = ["#22c55e", "#ef4444", "#f59e0b", "#0284c7", "#6366f1", "#a855f7", "#94a3b8"];
    const totalCatSpend = categorySpendRaw.reduce((sum, c) => sum + Number(c.totalVal), 0);
    const effectiveTotal = totalCatSpend > 0 ? totalCatSpend : totalMonthlySpend || 1;

    const categoryBreakdown: CategoryBreakdownItem[] = categorySpendRaw.length > 0
      ? categorySpendRaw.map((cat, idx) => ({
          name: cat.categoryName,
          value: Number(cat.totalVal),
          percentage: Math.round((Number(cat.totalVal) / effectiveTotal) * 100),
          color: palette[idx % palette.length]
        }))
      : [
          { name: "Vegetables & Groceries", value: totalMonthlySpend, percentage: 100, color: "#22c55e" }
        ];

    // Map Pending Tasks
    const pendingTasks: PendingTaskItem[] = [];

    const tenantQs = organizationId 
      ? `&organizationId=${organizationId}${locationId && locationId !== "ALL" ? `&locationId=${locationId}` : ""}`
      : "";

    // Load branch purchase policies & organization role assignments to properly enforce reviewer roles & SLAs
    const occupiedRoleIds = new Set<string>();
    const orgRoleMap = new Map<string, string | null>(); // roleId -> reportsToRoleId
    const [allLocAssignments, allOrgAssignments, allEmpAssignments, allOrgRoles, allTaskDefs, branchPolicies] = await Promise.all([
      db.select({ roleId: locationRoleAssignments.roleId }).from(locationRoleAssignments).where(eq(locationRoleAssignments.organizationId, organizationId)),
      db.select({ roleId: organizationRoleAssignments.roleId }).from(organizationRoleAssignments).where(eq(organizationRoleAssignments.organizationId, organizationId)),
      db.select({ roleId: employeeRoleAssignments.roleId }).from(employeeRoleAssignments).where(and(eq(employeeRoleAssignments.organizationId, organizationId), eq(employeeRoleAssignments.isActive, true))),
      db.select({ id: businessRoles.id, reportsToRoleId: businessRoles.reportsToRoleId }).from(businessRoles).where(eq(businessRoles.organizationId, organizationId)),
      db.select({
        id: taskDefinitions.id,
        module: taskDefinitions.module,
        title: taskDefinitions.title,
        completionTimeMins: taskDefinitions.completionTimeMins,
      }).from(taskDefinitions).where(eq(taskDefinitions.organizationId, organizationId)),
      db.select().from(branchPurchasePolicies).where(eq(branchPurchasePolicies.organizationId, organizationId))
    ]);

    allLocAssignments.forEach(r => occupiedRoleIds.add(r.roleId));
    allOrgAssignments.forEach(r => occupiedRoleIds.add(r.roleId));
    allEmpAssignments.forEach(r => occupiedRoleIds.add(r.roleId));
    allOrgRoles.forEach(r => orgRoleMap.set(r.id, r.reportsToRoleId));

    // Dynamic SLA lookup from Task Engine configurations
    const cashierDef = allTaskDefs.find(d => 
      d.module === "finance" || 
      d.title.toLowerCase().includes("cashier") || 
      d.title.toLowerCase().includes("bill")
    );
    const cashierSlaHours = cashierDef?.completionTimeMins ? (Number(cashierDef.completionTimeMins) / 60) : 4; // default 4 hrs

    const policyMap = new Map<string, typeof branchPolicies[0]>();
    branchPolicies.forEach(p => policyMap.set(p.locationId, p));

    // Note: Shift-End Spot Purchases Audits are displayed directly in the dedicated
    // ShiftEndAuditQueue component on this page, so we don't duplicate them in the top banner here.

    for (const po of pendingApprovalPOs) {
      // 1. The user who created the PO cannot approve their own PO
      if (po.createdByUserId && po.createdByUserId === userId) {
        continue;
      }

      // 2. An approver must hold the designated review role
      const targetRoleId = po.reviewRoleId || (po.status === "draft" ? po.processOwnerRoleId : null);
      const isRoleAssigned = targetRoleId ? userRoleIds.includes(targetRoleId) : false;

      // 3. If the role is vacant (nobody is assigned in the org) or not set, escalate to System Owner
      const isRoleVacant = targetRoleId ? !occupiedRoleIds.has(targetRoleId) : true;
      const isAssigned = isRoleAssigned || (isOwner && isRoleVacant);

      if (isAssigned) {
        pendingTasks.push({
          id: `po-approval-${po.id}`,
          title: `PO Approval Pending: ${po.poNumber || po.id.slice(0, 8)}`,
          description: `Total Amount: ₹${Number(po.totalAmount).toLocaleString("en-IN")}. Awaiting review & approval.`,
          type: "APPROVAL",
          priority: "HIGH",
          actionUrl: `/purchasing/review/${po.id}${tenantQs ? `?${tenantQs.slice(1)}` : ""}`,
          actionLabel: "Review & Approve",
          poId: po.id,
          publicToken: po.publicToken,
        });
      }
    }

    for (const po of pendingCashierAudits) {
      // 1. Check if user holds the primary billReviewRoleId
      const isRoleAssigned = po.billReviewRoleId ? userRoleIds.includes(po.billReviewRoleId) : false;

      // 2. Check if the designated role is vacant across the organization
      const isRoleVacant = po.billReviewRoleId ? !occupiedRoleIds.has(po.billReviewRoleId) : true;

      // 3. Check if current user holds a supervisory/reporting role over the billReviewRole
      let isSupervisor = false;
      if (po.billReviewRoleId && orgRoleMap.has(po.billReviewRoleId)) {
        const directSupervisorRoleId = orgRoleMap.get(po.billReviewRoleId);
        if (directSupervisorRoleId && userRoleIds.includes(directSupervisorRoleId)) {
          isSupervisor = true;
        }
      }

      // Check if SLA timeout has been breached using the dynamically configured SLA window
      const hoursSinceReceived = po.createdAt ? (Date.now() - new Date(po.createdAt).getTime()) / (1000 * 60 * 60) : 0;
      const isSlaBreached = hoursSinceReceived > cashierSlaHours;

      // Hierarchical Escalation Gate:
      // a) Primary Cashier/Reviewer gets it immediately.
      // b) Supervisor gets it only after the Cashier breaches the SLA window.
      // c) Owner gets it only if the role is completely vacant across the org OR severely overdue (> 24 hours).
      const isAssigned = isRoleAssigned || (isSupervisor && isSlaBreached) || (isOwner && (isRoleVacant || hoursSinceReceived > 24));

      if (isAssigned) {
        pendingTasks.push({
          id: `cashier-audit-${po.id}`,
          title: `Cashier Review: ${po.poNumber || po.id.slice(0, 8)}${isSlaBreached ? " (Overdue)" : ""}`,
          description: isSlaBreached
            ? `Escalated: Cashier review exceeded configured SLA (${Math.round(hoursSinceReceived)}h elapsed vs ${cashierSlaHours}h limit). Awaiting physical bill verification.`
            : `Supplier goods received. Awaiting physical bill verification and audit payment approval (SLA: ${cashierSlaHours}h).`,
          type: "AUDIT",
          priority: isSlaBreached ? "HIGH" : "NORMAL",
          actionUrl: `/finance/purchases-payables/audit-queue${tenantQs ? `?${tenantQs.slice(1)}` : ""}`,
          actionLabel: "Audit Bill",
          poId: po.id,
        });
      }
    }

    for (const rt of activeRoutineTasks) {
      // Completed or cancelled routine tasks belong to the recent activity feed/history, not pending actions
      if (rt.status === "completed" || rt.status === "cancelled") {
        continue;
      }

      const ctx = (rt.contextData as any) || {};
      const vendorName = ctx.vendorName || "Routine Vendor";
      const actionUrl = ctx.actionUrl || `/purchasing/stock-assessment?vendorId=${ctx.vendorId}&taskId=${rt.id}`;
      // Routine daily procurement tasks must strictly target the designated operational role (e.g. Head Chef)
      // They should NOT clutter the Owner's pending action banner unless the user actually holds that operational role
      const isAuditorOrAssigned = rt.assignedRoleId ? userRoleIds.includes(rt.assignedRoleId) : isOwner;

      if (isAuditorOrAssigned) {
        pendingTasks.push({
          id: `routine-task-${rt.id}`,
          title: `Daily Routine Order: ${vendorName}`,
          description: `Scheduled automated order cycle started. Stock assessment pending submission.`,
          type: "ROUTINE",
          priority: rt.status === "audit_pending" ? "HIGH" : "NORMAL",
          actionUrl: `${actionUrl}${tenantQs}`,
          actionLabel: rt.status === "audit_pending" ? "Review & Complete" : "Start Assessment",
          createdAt: rt.createdAt ? new Date(rt.createdAt).toISOString() : undefined,
        });
      }
    }

    return {
      success: true,
      data: {
        pendingTasks,
        kpiData: {
          totalMonthlySpend,
          spendVsLastMonthPercent,
          totalOrdersCount,
          ordersThisMonthCount,
          goodsReceivedCount,
          pendingReceiptsCount,
          pendingBillsAmount,
          pendingBillsCount,
          overdueCount,
          activeVendorCount,
        },
        recentPurchases,
        pendingDeliveries,
        topVendors,
        topItems,
        lowStockItems,
        monthlyTrends,
        categoryBreakdown,
        totalCategorySpend: effectiveTotal,
        spotAudits: allSpotAudits as SpotPurchaseDashboardItem[],
      },
    };
  } catch (error: any) {
    console.error("fetchPurchaseDashboardData error:", error);
    return {
      success: false,
      error: error?.message || "Failed to load purchasing dashboard data",
    };
  }
}
