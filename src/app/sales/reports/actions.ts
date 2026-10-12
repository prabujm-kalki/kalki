"use server";

import { db } from "@/db";
import { locations, salesInvoices, customers } from "@/db/schema";
import { eq, and, or, gte, lte, desc, sql, inArray, notInArray, ilike, lt } from "drizzle-orm";
import { itemCategories, items, salesInvoiceLines, salesChannels } from "@/db/schema";
import { getSalesAlertConfig } from "@/app/sales/settings/alerts/actions";

export async function fetchOrgChannels(organizationId: string) {
  try {
    if (!organizationId) return [];
    const res = await db.select({
      id: salesChannels.id,
      name: salesChannels.name,
    })
    .from(salesChannels)
    .where(eq(salesChannels.organizationId, organizationId))
    .orderBy(salesChannels.name);
    return res;
  } catch (error) {
    console.error('Error fetching channels:', error);
    return [];
  }
}

export async function fetchOrgLocations(organizationId: string) {
  try {
    if (!organizationId) return [];
    const res = await db.select({
      id: locations.id,
      name: locations.name,
    })
    .from(locations)
    .where(eq(locations.organizationId, organizationId))
    .orderBy(locations.name);
    return res;
  } catch (error) {
    console.error("Error fetching locations:", error);
    return [];
  }
}

export async function fetchSalesReportData(
  organizationId: string, 
  locationId?: string, 
  startDate?: string, 
  endDate?: string,
  page: number = 1,
  limit: number = 15,
  searchQuery?: string,
  channelId?: string
) {
  console.log("==> fetchSalesReportData started", { organizationId, locationId, startDate, endDate, page, limit, searchQuery });
  try {
    if (!organizationId) return { invoices: [], kpis: { grossSales: 0, totalTax: 0, netRevenue: 0, invoiceCount: 0 }, total: 0 };

    let startObj: Date | undefined = undefined;
    if (startDate) {
      startObj = new Date(startDate);
      startObj.setUTCHours(0, 0, 0, 0);
    }

    let endObj: Date | undefined = undefined;
    if (endDate) {
      endObj = new Date(endDate);
      endObj.setUTCHours(23, 59, 59, 999);
    }

    const offset = (page - 1) * limit;

    const whereClause = and(
      eq(salesInvoices.organizationId, organizationId),
      locationId && locationId !== 'all' ? eq(salesInvoices.locationId, locationId) : undefined,
      channelId && channelId !== 'all' ? eq(salesInvoices.channelId, channelId) : undefined,
      startObj ? gte(salesInvoices.invoiceDate, startObj) : undefined,
      endObj ? lte(salesInvoices.invoiceDate, endObj) : undefined,
      searchQuery ? or(
        ilike(salesInvoices.customerName, `%${searchQuery}%`),
        ilike(customers.phone, `%${searchQuery}%`),
        ilike(sql`COALESCE(${salesInvoices.orderCategory}, 'Dine-in')`, `%${searchQuery}%`)
      ) : undefined
    );

    // 1. Calculate KPIs using SQL aggregation (excluding CANCELLED)
    const kpiWhereClause = and(
      whereClause,
      sql`${salesInvoices.paymentStatus} != 'CANCELLED' AND ${salesInvoices.status} != 'CANCELLED'`
    );

    const kpiResult = await db.select({
      grossSales: sql<number>`COALESCE(SUM(CAST(${salesInvoices.grandTotal} AS NUMERIC)), 0)`,
      totalTax: sql<number>`COALESCE(SUM(CAST(${salesInvoices.taxAmount} AS NUMERIC)), 0)`,
      netRevenue: sql<number>`COALESCE(SUM(CAST(${salesInvoices.subtotalAmount} AS NUMERIC)), 0)`,
      invoiceCount: sql<number>`COUNT(*)`,
    })
    .from(salesInvoices)
    .leftJoin(customers, eq(salesInvoices.customerId, customers.id))
    .leftJoin(salesChannels, eq(salesInvoices.channelId, salesChannels.id))
    .where(kpiWhereClause);

    const kpis = {
      grossSales: Number(kpiResult[0]?.grossSales || 0),
      totalTax: Number(kpiResult[0]?.totalTax || 0),
      netRevenue: Number(kpiResult[0]?.netRevenue || 0),
      invoiceCount: Number(kpiResult[0]?.invoiceCount || 0)
    };

    // 2. Fetch paginated invoice list
    const invoices = await db.select({
      id: salesInvoices.id,
      invoiceNumber: salesInvoices.invoiceNumber,
      customerName: salesInvoices.customerName,
      customerPhone: customers.phone,
      invoiceDate: salesInvoices.invoiceDate,
      subtotalAmount: salesInvoices.subtotalAmount,
      taxAmount: salesInvoices.taxAmount,
      grandTotal: salesInvoices.grandTotal,
      status: salesInvoices.status,
      paymentStatus: salesInvoices.paymentStatus,
      orderCategory: salesInvoices.orderCategory,
      channelName: salesChannels.name,
      channel: sql<string>`'B2B'`
    })
    .from(salesInvoices)
    .leftJoin(customers, eq(salesInvoices.customerId, customers.id))
    .leftJoin(salesChannels, eq(salesInvoices.channelId, salesChannels.id))
    .where(whereClause)
    .orderBy(desc(salesInvoices.invoiceDate))
    .limit(limit)
    .offset(offset);

    // 3. Get total count for pagination
    console.log("==> Fetching total count...");
    const totalResult = await db.select({ count: sql<number>`count(*)` })
    .from(salesInvoices)
    .leftJoin(customers, eq(salesInvoices.customerId, customers.id))
    .leftJoin(salesChannels, eq(salesInvoices.channelId, salesChannels.id))
    .where(whereClause);
    const total = Number(totalResult[0]?.count || 0);

    console.log("==> Returning data", invoices.length, total);
    return {
      invoices,
      kpis,
      total
    };
  } catch (error) {
    console.error("Error fetching sales report:", error);
    return { invoices: [], kpis: { grossSales: 0, totalTax: 0, netRevenue: 0, invoiceCount: 0 }, total: 0 };
  }
}

export async function fetchItemCategories(organizationId: string) {
  try {
    if (!organizationId) return [];
    const res = await db.select({
      id: itemCategories.id,
      name: itemCategories.name,
    })
    .from(itemCategories)
    .where(and(
      eq(itemCategories.organizationId, organizationId),
      notInArray(itemCategories.name, ['Salary', 'Food Cost', 'Expense', 'Maintenance'])
    ))
    .orderBy(itemCategories.name);
    return res;
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
}

export async function fetchItemWiseReportData(
  organizationId: string, 
  locationId?: string, 
  categoryId?: string,
  startDate?: string, 
  endDate?: string,
  page: number = 1,
  limit: number = 15,
  searchQuery?: string,
  channelId?: string
) {
  try {
    if (!organizationId) return { items: [], kpis: { topRevenueItem: null, topVolumeItem: null, totalUnits: 0 }, total: 0 };

    let startObj: Date | undefined = undefined;
    if (startDate) {
      startObj = new Date(startDate);
      startObj.setUTCHours(0, 0, 0, 0);
    }
    let endObj: Date | undefined = undefined;
    if (endDate) {
      endObj = new Date(endDate);
      endObj.setUTCHours(23, 59, 59, 999);
    }

    const offset = (page - 1) * limit;

    const whereClause = and(
      eq(salesInvoices.organizationId, organizationId),
      locationId && locationId !== 'all' ? eq(salesInvoices.locationId, locationId) : undefined,
      categoryId && categoryId !== 'all' ? eq(items.categoryId, categoryId) : undefined,
      searchQuery ? ilike(salesInvoiceLines.itemDescription, `%${searchQuery}%`) : undefined,
      startObj ? gte(salesInvoices.invoiceDate, startObj) : undefined,
      endObj ? lte(salesInvoices.invoiceDate, endObj) : undefined,
      sql`${salesInvoices.status} != 'CANCELLED'`
    );

    // Grouping by itemDescription instead of items.id to catch true POS names
    const baseQuery = db.select({
      itemId: sql<string>`MAX(CAST(${salesInvoiceLines.id} AS TEXT))`, // Cast UUID to text for MAX
      itemCode: salesInvoiceLines.itemDescription,
      itemName: salesInvoiceLines.itemDescription,
      categoryName: sql<string>`COALESCE(${itemCategories.name}, 'Menu Item')`,
      uom: sql<string>`COALESCE(${salesInvoiceLines.uom}, 'Nos')`,
      totalQtySold: sql<number>`COALESCE(SUM(CAST(${salesInvoiceLines.quantity} AS NUMERIC)), 0)`,
      netRevenue: sql<number>`COALESCE(SUM(CAST(${salesInvoiceLines.lineTotal} AS NUMERIC)), 0)`
    })
    .from(salesInvoiceLines)
    .innerJoin(salesInvoices, eq(salesInvoiceLines.invoiceId, salesInvoices.id))
    .leftJoin(items, eq(salesInvoiceLines.itemId, items.id))
    .leftJoin(itemCategories, eq(items.categoryId, itemCategories.id))
    .where(whereClause)
    .groupBy(
      salesInvoiceLines.itemDescription, 
      itemCategories.name, 
      salesInvoiceLines.uom
    );

    const fullData = await baseQuery;

    // KPI Calculation
    let topRevenueItem = null;
    let topVolumeItem = null;
    let totalUnits = 0;
    
    let maxRev = -1;
    let maxVol = -1;

    for (const row of fullData) {
      const qty = Number(row.totalQtySold);
      const rev = Number(row.netRevenue);
      totalUnits += qty;

      if (rev > maxRev) {
        maxRev = rev;
        topRevenueItem = { name: row.itemName, amount: rev };
      }
      if (qty > maxVol) {
        maxVol = qty;
        topVolumeItem = { name: row.itemName, qty: qty };
      }
    }

    // Sort by revenue descending
    fullData.sort((a, b) => Number(b.netRevenue) - Number(a.netRevenue));

    const totalCount = fullData.length;
    const paginatedItems = fullData.slice(offset, offset + limit);

    return {
      items: paginatedItems,
      total: totalCount,
      kpis: {
        topRevenueItem,
        topVolumeItem,
        totalUnits
      }
    };
  } catch (error) {
    console.error("Error fetching item-wise report:", error);
    return { items: [], kpis: { topRevenueItem: null, topVolumeItem: null, totalUnits: 0 }, total: 0 };
  }
}


export async function fetchCustomerWiseReportData(
  organizationId: string, 
  locationId?: string, 
  startDate?: string, 
  endDate?: string,
  page: number = 1,
  limit: number = 15,
  searchQuery?: string,
  alertFilter?: 'dormant_vips' | 'low_aov' | 'top_spenders' | 'critical_debtors' | 'new_vips' | 'spend_anomalies' | 'all',
  channelId?: string
) {
  try {
    if (!organizationId) return { data: [], kpis: { totalCustomers: 0, topSpenderName: '-', topSpenderAmount: 0, avgSpend: 0, repeatRate: 0 }, total: 0, alerts: [] };

    // Fetch dynamic thresholds per tenant/location (or default fallback)
    const config = await getSalesAlertConfig(organizationId, locationId);
    const DEBTOR_DAYS_OVERDUE = Number(config.debtorDaysOverdue) || 30;
    const NEW_VIP_MIN_SPEND = Number(config.newVipMinSpend) || 10000;
    const ANOMALY_AOV_MULTIPLIER = Number(config.anomalyAovMultiplier) || 3.0;
    const DORMANT_VIP_DAYS = Number(config.dormantVipDays) || 90;
    const UPSELL_DEFICIT_DROP_PCT = Number(config.upsellDeficitDropPercentage) || 5.0;
    const CONCENTRATION_COUNT = Number(config.concentrationTopCustomersCount) || 5;

    let startObj: Date | undefined = undefined;
    if (startDate) {
      startObj = new Date(startDate);
      startObj.setUTCHours(0, 0, 0, 0);
    }
    let endObj: Date | undefined = undefined;
    if (endDate) {
      endObj = new Date(endDate);
      endObj.setUTCHours(23, 59, 59, 999);
    }

    // Determine if we should override date filters (ignore start/end) for historical drill-downs
    const isHistoricalFilter = alertFilter === 'dormant_vips' || alertFilter === 'low_aov' || alertFilter === 'critical_debtors';
    
    const applyStart = isHistoricalFilter ? undefined : startObj;
    const applyEnd = isHistoricalFilter ? undefined : endObj;

    const baseWhereClauseUnfiltered = and(
      eq(salesInvoices.organizationId, organizationId),
      sql`${salesInvoices.status} != 'CANCELLED' AND ${salesInvoices.paymentStatus} != 'CANCELLED'`,
      locationId && locationId !== 'all' ? eq(salesInvoices.locationId, locationId) : undefined,
      channelId && channelId !== 'all' ? eq(salesInvoices.channelId, channelId) : undefined
    );

    const whereClauseFiltered = and(
      baseWhereClauseUnfiltered,
      applyStart ? gte(salesInvoices.invoiceDate, applyStart) : undefined,
      applyEnd ? lte(salesInvoices.invoiceDate, applyEnd) : undefined,
      searchQuery ? or(
        ilike(salesInvoices.customerName, `%${searchQuery}%`),
        ilike(customers.phone, `%${searchQuery}%`)
      ) : undefined
    );

    const nameCol = sql<string>`COALESCE(NULLIF(TRIM(${salesInvoices.customerName}), ''), 'Walk-in Customer')`;
    const phoneCol = sql<string>`COALESCE(NULLIF(TRIM(${customers.phone}), ''), '-')`;

    // 1. Fetch Main Filtered Data (for KPIs and the table)
    let groupedDataRaw = await db.select({
      customerName: nameCol,
      customerPhone: phoneCol,
      customerId: sql<string>`MAX(CAST(${salesInvoices.customerId} AS TEXT))`,
      totalInvoices: sql<number>`COUNT(${salesInvoices.id})`,
      totalRevenue: sql<number>`SUM(CAST(${salesInvoices.grandTotal} AS NUMERIC))`,
      avgBillValue: sql<number>`AVG(CAST(${salesInvoices.grandTotal} AS NUMERIC))`,
      lastPurchaseDate: sql<string>`MAX(${salesInvoices.invoiceDate})`
    })
    .from(salesInvoices)
    .leftJoin(customers, eq(salesInvoices.customerId, customers.id))
    .where(whereClauseFiltered)
    .groupBy(nameCol, phoneCol);

    let groupedData = groupedDataRaw as (typeof groupedDataRaw[0] & { isDormantVip?: boolean; isLowAov?: boolean; isCriticalDebtor?: boolean })[];

    // --- KPIs calculation based on filtered data ---
    let totalCustomers = groupedData.length;
    let topSpenderName = '-';
    let topSpenderAmount = 0;
    let totalRev = 0;
    let repeatCustomers = 0;
    
    // Top Concentration Revenue based on CONCENTRATION_COUNT
    let topConcentrationRevenue = 0;

    groupedData.sort((a, b) => Number(b.totalRevenue) - Number(a.totalRevenue));

    for (let i = 0; i < groupedData.length; i++) {
      const row = groupedData[i];
      const rev = Number(row.totalRevenue);
      const invs = Number(row.totalInvoices);
      
      totalRev += rev;
      
      if (rev > topSpenderAmount) {
        topSpenderAmount = rev;
        topSpenderName = row.customerName || '-';
      }
      if (invs >= 2) {
        repeatCustomers++;
      }
      
      if (i < CONCENTRATION_COUNT && row.customerName !== 'Walk-in Customer') {
        topConcentrationRevenue += rev;
      }
    }

    const concentrationRevenueSharePercentage = totalRev > 0 ? ((topConcentrationRevenue / totalRev) * 100).toFixed(1) : "0";
    const avgSpend = totalCustomers > 0 ? totalRev / totalCustomers : 0;
    const repeatRate = totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0;

    // --- ANOMALY QUERIES (Unfiltered globally) ---
    // Instead of doing massive full global groupbys inside JS, we'll run a DB query for historical aggregates.
    
    const dormantThresholdDate = new Date();
    dormantThresholdDate.setDate(dormantThresholdDate.getDate() - DORMANT_VIP_DAYS);
    
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const debtorThresholdDate = new Date();
    debtorThresholdDate.setDate(debtorThresholdDate.getDate() - DEBTOR_DAYS_OVERDUE);

    // 1. Critical Debtors & Credit Aging:
    // Query salesInvoices where paymentStatus != 'PAID' and status != 'CANCELLED' older than DEBTOR_DAYS_OVERDUE
    const criticalDebtorInvoices = await db.select({
      customerId: sql<string>`MAX(CAST(${salesInvoices.customerId} AS TEXT))`,
      customerName: nameCol,
      customerPhone: phoneCol,
      overdueBalance: sql<number>`SUM(CAST(${salesInvoices.grandTotal} AS NUMERIC))`
    })
    .from(salesInvoices)
    .leftJoin(customers, eq(salesInvoices.customerId, customers.id))
    .where(and(
      baseWhereClauseUnfiltered,
      sql`${salesInvoices.paymentStatus} != 'PAID'`,
      sql`TRIM(${salesInvoices.customerName}) != '' AND ${salesInvoices.customerName} IS NOT NULL`,
      lte(salesInvoices.invoiceDate, debtorThresholdDate)
    ))
    .groupBy(nameCol, phoneCol);

    const criticalDebtorsCount = criticalDebtorInvoices.length;
    const totalOverdueAmount = criticalDebtorInvoices.reduce((sum, r) => sum + Number(r.overdueBalance), 0);
    const criticalDebtorIds = Array.from(new Set(criticalDebtorInvoices.map(r => r.customerId).filter(Boolean)));
    const criticalDebtorKeys = new Set(criticalDebtorInvoices.map(r => r.customerName + r.customerPhone));

    // 2. New High-Value Acquisitions:
    // Identify customers whose first ever recorded invoice falls within the currently selected date range (startObj, endObj)
    // and whose total spend in this period is >= NEW_VIP_MIN_SPEND
    const newVipQuery = await db.select({
      customerId: sql<string>`MAX(CAST(${salesInvoices.customerId} AS TEXT))`,
      customerName: nameCol,
      customerPhone: phoneCol,
      totalSpend: sql<number>`SUM(CAST(${salesInvoices.grandTotal} AS NUMERIC))`,
      firstInvoiceDate: sql<string>`MIN(${salesInvoices.invoiceDate})`
    })
    .from(salesInvoices)
    .leftJoin(customers, eq(salesInvoices.customerId, customers.id))
    .where(and(
      baseWhereClauseUnfiltered,
      sql`TRIM(${salesInvoices.customerName}) != '' AND ${salesInvoices.customerName} IS NOT NULL`
    ))
    .groupBy(nameCol, phoneCol)
    .having(and(
      startObj ? sql`MIN(${salesInvoices.invoiceDate}) >= ${startObj}` : undefined,
      endObj ? sql`MIN(${salesInvoices.invoiceDate}) <= ${endObj}` : undefined,
      sql`SUM(CAST(${salesInvoices.grandTotal} AS NUMERIC)) >= ${NEW_VIP_MIN_SPEND}`
    ));

    const newVipCount = newVipQuery.length;
    const newVipRevenue = newVipQuery.reduce((sum, r) => sum + Number(r.totalSpend), 0);
    const newVipIds = Array.from(new Set(newVipQuery.map(r => r.customerId).filter(Boolean)));
    const newVipKeys = new Set(newVipQuery.map(r => r.customerName + r.customerPhone));

    // 3. Frequency vs. Spend Anomalies:
    // Identify customers with exactly 1 or 2 historical orders, but whose average order value is > (overall branch AOV * ANOMALY_AOV_MULTIPLIER)
    const anomalyThresholdAov = avgSpend * ANOMALY_AOV_MULTIPLIER;
    const anomalyQuery = await db.select({
      customerId: sql<string>`MAX(CAST(${salesInvoices.customerId} AS TEXT))`,
      customerName: nameCol,
      customerPhone: phoneCol,
      orderCount: sql<number>`COUNT(${salesInvoices.id})`,
      avgOrderValue: sql<number>`AVG(CAST(${salesInvoices.grandTotal} AS NUMERIC))`,
      totalSpend: sql<number>`SUM(CAST(${salesInvoices.grandTotal} AS NUMERIC))`
    })
    .from(salesInvoices)
    .leftJoin(customers, eq(salesInvoices.customerId, customers.id))
    .where(and(
      baseWhereClauseUnfiltered,
      sql`TRIM(${salesInvoices.customerName}) != '' AND ${salesInvoices.customerName} IS NOT NULL`
    ))
    .groupBy(nameCol, phoneCol)
    .having(and(
      sql`COUNT(${salesInvoices.id}) IN (1, 2)`,
      sql`AVG(CAST(${salesInvoices.grandTotal} AS NUMERIC)) > ${anomalyThresholdAov}`
    ));

    const anomalyCustomerCount = anomalyQuery.length;
    const anomalyTotalRevenue = anomalyQuery.reduce((sum, r) => sum + Number(r.totalSpend), 0);
    const anomalyCustomerIds = Array.from(new Set(anomalyQuery.map(r => r.customerId).filter(Boolean)));
    const anomalyKeys = new Set(anomalyQuery.map(r => r.customerName + r.customerPhone));

    // Dormant VIPs (Unfiltered DB query based on DORMANT_VIP_DAYS)
    const dormantQuery = await db.select({
      customerName: nameCol,
      customerPhone: phoneCol,
      customerId: sql<string>`MAX(CAST(${salesInvoices.customerId} AS TEXT))`,
      totalRevenue: sql<number>`SUM(CAST(${salesInvoices.grandTotal} AS NUMERIC))`,
      totalInvoices: sql<number>`COUNT(${salesInvoices.id})`,
      lastPurchaseDate: sql<string>`MAX(${salesInvoices.invoiceDate})`
    })
    .from(salesInvoices)
    .leftJoin(customers, eq(salesInvoices.customerId, customers.id))
    .where(and(baseWhereClauseUnfiltered, sql`TRIM(${salesInvoices.customerName}) != '' AND ${salesInvoices.customerName} IS NOT NULL`))
    .groupBy(nameCol, phoneCol)
    .having(sql`MAX(${salesInvoices.invoiceDate}) < ${dormantThresholdDate} AND (COUNT(${salesInvoices.id}) >= 3 OR SUM(CAST(${salesInvoices.grandTotal} AS NUMERIC)) > 10000)`);
    
    let dormantCount = dormantQuery.length;
    let dormantRevenueRisk = dormantQuery.reduce((sum, r) => sum + Number(r.totalRevenue), 0);
    const dormantCustomerIds = Array.from(new Set(dormantQuery.map(d => d.customerId).filter(Boolean)));

    // AOV logic (Historical baseline vs active period based on UPSELL_DEFICIT_DROP_PCT)
    const activeStart = startObj || new Date(new Date().setDate(new Date().getDate() - 30));
    const activeEnd = endObj || new Date();
    
    const baselineStart = new Date(activeStart);
    baselineStart.setDate(baselineStart.getDate() - 90);

    const aovQuery = await db.select({
      customerName: nameCol,
      customerPhone: phoneCol,
      customerId: sql<string>`MAX(CAST(${salesInvoices.customerId} AS TEXT))`,
      recentAov: sql<number>`AVG(CASE WHEN ${salesInvoices.invoiceDate} >= ${activeStart} AND ${salesInvoices.invoiceDate} <= ${activeEnd} THEN CAST(${salesInvoices.grandTotal} AS NUMERIC) END)`,
      baselineAov: sql<number>`AVG(CASE WHEN ${salesInvoices.invoiceDate} >= ${baselineStart} AND ${salesInvoices.invoiceDate} < ${activeStart} THEN CAST(${salesInvoices.grandTotal} AS NUMERIC) END)`
    })
    .from(salesInvoices)
    .leftJoin(customers, eq(salesInvoices.customerId, customers.id))
    .where(and(baseWhereClauseUnfiltered, sql`TRIM(${salesInvoices.customerName}) != '' AND ${salesInvoices.customerName} IS NOT NULL`))
    .groupBy(nameCol, phoneCol)
    .having(sql`AVG(CASE WHEN ${salesInvoices.invoiceDate} >= ${baselineStart} AND ${salesInvoices.invoiceDate} < ${activeStart} THEN CAST(${salesInvoices.grandTotal} AS NUMERIC) END) > 0 
            AND AVG(CASE WHEN ${salesInvoices.invoiceDate} >= ${activeStart} AND ${salesInvoices.invoiceDate} <= ${activeEnd} THEN CAST(${salesInvoices.grandTotal} AS NUMERIC) END) > 0`);

    let lowAovCount = 0;
    let totalAovDrop = 0;
    const lowAovKeys = new Set<string>();
    const lowAovCustomerIdsList: string[] = [];

    const dropThresholdRatio = (100 - UPSELL_DEFICIT_DROP_PCT) / 100;

    aovQuery.forEach(row => {
      const recent = Number(row.recentAov);
      const baseline = Number(row.baselineAov);
      
      if (recent < (baseline * dropThresholdRatio)) {
        lowAovCount++;
        totalAovDrop += ((baseline - recent) / baseline) * 100;
        lowAovKeys.add(row.customerName + row.customerPhone);
        if (row.customerId) {
          lowAovCustomerIdsList.push(row.customerId);
        }
      }
    });

    let aovDropPercentage = lowAovCount > 0 ? totalAovDrop / lowAovCount : 0;
    const lowAovCustomerIds = Array.from(new Set(lowAovCustomerIdsList));

    // Top Spenders customerIds (based on CONCENTRATION_COUNT)
    const topSpenderCustomerIds = Array.from(
      new Set(
        groupedData
          .filter(r => r.customerName !== 'Walk-in Customer' && r.customerId)
          .slice(0, CONCENTRATION_COUNT)
          .map(r => r.customerId)
      )
    );

    // Build Alerts Array
    const alerts = [];
    if (dormantCount > 0) {
      alerts.push({
        id: "dormant_vips",
        type: "critical",
        title: `${dormantCount} Dormant VIPs (> ${DORMANT_VIP_DAYS} Days Inactive)`,
        description: `Revenue at risk: ₹${dormantRevenueRisk.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
        badge: "Retention Risk",
        actionLabel: "Review Accounts",
        filterParam: "dormant_vips",
        count: dormantCount,
        matchedCustomerIds: dormantCustomerIds
      });
    }

    if (criticalDebtorsCount > 0) {
      alerts.push({
        id: "critical_debtors",
        type: "critical",
        title: `${criticalDebtorsCount} Accounts > ${DEBTOR_DAYS_OVERDUE} Days Overdue`,
        description: `Outstanding Balance: ₹${totalOverdueAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
        badge: "Credit Risk",
        actionLabel: "View Debtors",
        filterParam: "critical_debtors",
        count: criticalDebtorsCount,
        icon: "Wallet",
        matchedCustomerIds: criticalDebtorIds
      });
    }

    if (newVipCount > 0) {
      alerts.push({
        id: "new_vips",
        type: "success",
        title: `${newVipCount} New VIP Acquisitions (₹${newVipRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })})`,
        description: `First-time high spenders exceeding ₹${NEW_VIP_MIN_SPEND.toLocaleString('en-IN')}`,
        badge: "Growth",
        actionLabel: "View New VIPs",
        filterParam: "new_vips",
        count: newVipCount,
        icon: "Star",
        matchedCustomerIds: newVipIds
      });
    }

    if (anomalyCustomerCount > 0) {
      alerts.push({
        id: "spend_anomalies",
        type: "warning",
        title: `${anomalyCustomerCount} High-Spend Anomaly Customers`,
        description: `Single/Double purchases with AOV > ${ANOMALY_AOV_MULTIPLIER}x branch average`,
        badge: "Catering Target",
        actionLabel: "View Anomalies",
        filterParam: "spend_anomalies",
        count: anomalyCustomerCount,
        icon: "Activity",
        matchedCustomerIds: anomalyCustomerIds
      });
    }
    
    if (lowAovCount > 0) {
      alerts.push({
        id: "aov_drop",
        type: "warning", 
        title: `Basket Value Dropped > ${UPSELL_DEFICIT_DROP_PCT}% for ${lowAovCount} Customers`,
        description: `Avg drop of ${aovDropPercentage.toFixed(1)}% vs historical baseline`,
        badge: "Upsell Deficit",
        actionLabel: "View Underperforming",
        filterParam: "low_aov",
        count: lowAovCount,
        icon: "TrendingDown",
        matchedCustomerIds: lowAovCustomerIds
      });
    }

    if (groupedData.length >= CONCENTRATION_COUNT && Number(concentrationRevenueSharePercentage) > 20) {
      alerts.push({
        id: "revenue_concentration",
        type: "info",
        title: `Top ${CONCENTRATION_COUNT} Customers Drive ${concentrationRevenueSharePercentage}% of Revenue`,
        description: "High reliance on key corporate / catering accounts",
        badge: "Concentration",
        actionLabel: "View Top Spenders",
        filterParam: "top_spenders",
        count: CONCENTRATION_COUNT,
        matchedCustomerIds: topSpenderCustomerIds
      });
    }

    // --- Filter Application ---
    if (alertFilter === 'dormant_vips') {
      // Cross reference the dormantQuery to filter groupedData (which is now unfiltered by date because isHistoricalFilter was true)
      const dormantKeys = new Set(dormantQuery.map(d => d.customerName + d.customerPhone));
      groupedData = groupedData.filter(r => dormantKeys.has(r.customerName + r.customerPhone));
    } else if (alertFilter === 'critical_debtors') {
      groupedData = groupedData.filter(r => criticalDebtorKeys.has(r.customerName + r.customerPhone));
    } else if (alertFilter === 'new_vips') {
      groupedData = groupedData.filter(r => newVipKeys.has(r.customerName + r.customerPhone));
    } else if (alertFilter === 'spend_anomalies') {
      groupedData = groupedData.filter(r => anomalyKeys.has(r.customerName + r.customerPhone));
    } else if (alertFilter === 'top_spenders') {
      groupedData = groupedData.filter(r => r.customerName !== 'Walk-in Customer').slice(0, CONCENTRATION_COUNT);
    } else if (alertFilter === 'low_aov') {
      groupedData = groupedData.filter(r => lowAovKeys.has(r.customerName + r.customerPhone));
    }
    
    const filteredTotal = groupedData.length;
    
    const offset = (page - 1) * limit;
    const paginatedData = groupedData.slice(offset, offset + limit);

    return {
      data: paginatedData,
      fullData: groupedData,
      total: filteredTotal,
      alerts,
      kpis: {
        totalCustomers,
        topSpenderName,
        topSpenderAmount,
        avgSpend,
        repeatRate
      }
    };
  } catch (error) {
    console.error('Error fetching customer wise report data:', error);
    return { data: [], kpis: { totalCustomers: 0, topSpenderName: '-', topSpenderAmount: 0, avgSpend: 0, repeatRate: 0 }, total: 0, alerts: [] };
  }
}


export async function fetchCustomerInvoices(
  organizationId: string,
  customerName: string,
  customerPhone: string
) {
  try {
    const isWalkIn = customerName === 'Walk-in Customer' && customerPhone === '-';
    
    const invoices = await db.select({
      id: salesInvoices.id,
      invoiceNumber: salesInvoices.invoiceNumber,
      invoiceDate: salesInvoices.invoiceDate,
      grandTotal: salesInvoices.grandTotal,
      orderCategory: salesInvoices.orderCategory,
      paymentStatus: salesInvoices.paymentStatus
    })
    .from(salesInvoices)
    .leftJoin(customers, eq(salesInvoices.customerId, customers.id))
    .where(and(
      eq(salesInvoices.organizationId, organizationId),
      sql`${salesInvoices.status} != 'CANCELLED' AND ${salesInvoices.paymentStatus} != 'CANCELLED'`,
      isWalkIn ? or(sql`TRIM(${salesInvoices.customerName}) = ''`, sql`${salesInvoices.customerName} IS NULL`) : 
      and(
        eq(sql`COALESCE(NULLIF(TRIM(${salesInvoices.customerName}), ''), 'Walk-in Customer')`, customerName),
        eq(sql`COALESCE(NULLIF(TRIM(${customers.phone}), ''), '-')`, customerPhone)
      )
    ))
    .orderBy(desc(salesInvoices.invoiceDate))
    .limit(50);

    return invoices;
  } catch (err) {
    console.error('Error fetching customer invoices:', err);
    return [];
  }
}
