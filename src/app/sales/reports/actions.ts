"use server";

import { db } from "@/db";
import { locations, salesInvoices, customers } from "@/db/schema";
import { eq, and, or, gte, lte, desc, sql, inArray, notInArray, ilike, lt } from "drizzle-orm";
import { itemCategories, items, salesInvoiceLines, salesChannels } from "@/db/schema";

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
      channelId && channelId !== 'all' ? eq(salesInvoices.channelId, channelId) : undefined,
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
  alertFilter?: 'dormant_vips' | 'low_aov' | 'top_spenders' | 'critical_debtors' | 'all'
) {
  try {
    if (!organizationId) return { data: [], kpis: { totalCustomers: 0, topSpenderName: '-', topSpenderAmount: 0, avgSpend: 0, repeatRate: 0 }, total: 0, alerts: [] };

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
      locationId && locationId !== 'all' ? eq(salesInvoices.locationId, locationId) : undefined
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
    
    // Top 5 Revenue Concentration
    let top5Revenue = 0;

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
      
      if (i < 5 && row.customerName !== 'Walk-in Customer') {
        top5Revenue += rev;
      }
    }

    const top5RevenueSharePercentage = totalRev > 0 ? ((top5Revenue / totalRev) * 100).toFixed(1) : "0";
    const avgSpend = totalCustomers > 0 ? totalRev / totalCustomers : 0;
    const repeatRate = totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0;

    // --- ANOMALY QUERIES (Unfiltered globally) ---
    // Instead of doing massive full global groupbys inside JS, we'll run a DB query for historical aggregates.
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Dormant VIPs (Unfiltered DB query)
    const dormantQuery = await db.select({
      customerName: nameCol,
      customerPhone: phoneCol,
      totalRevenue: sql<number>`SUM(CAST(${salesInvoices.grandTotal} AS NUMERIC))`,
      totalInvoices: sql<number>`COUNT(${salesInvoices.id})`,
      lastPurchaseDate: sql<string>`MAX(${salesInvoices.invoiceDate})`
    })
    .from(salesInvoices)
    .leftJoin(customers, eq(salesInvoices.customerId, customers.id))
    .where(and(baseWhereClauseUnfiltered, sql`TRIM(${salesInvoices.customerName}) != '' AND ${salesInvoices.customerName} IS NOT NULL`))
    .groupBy(nameCol, phoneCol)
    .having(sql`MAX(${salesInvoices.invoiceDate}) < ${thirtyDaysAgo} AND (COUNT(${salesInvoices.id}) >= 3 OR SUM(CAST(${salesInvoices.grandTotal} AS NUMERIC)) > 10000)`); // simplified logic for top 20% by using > 10k threshold for speed
    
    let dormantCount = dormantQuery.length;
    let dormantRevenueRisk = dormantQuery.reduce((sum, r) => sum + Number(r.totalRevenue), 0);

    // AOV logic (Historical baseline vs active period)
    const activeStart = startObj || new Date(new Date().setDate(new Date().getDate() - 30));
    const activeEnd = endObj || new Date();
    
    const baselineStart = new Date(activeStart);
    baselineStart.setDate(baselineStart.getDate() - 90);

    const aovQuery = await db.select({
      customerName: nameCol,
      customerPhone: phoneCol,
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

    aovQuery.forEach(row => {
      const recent = Number(row.recentAov);
      const baseline = Number(row.baselineAov);
      
      if (recent < (baseline * 0.95)) {
        lowAovCount++;
        totalAovDrop += ((baseline - recent) / baseline) * 100;
        lowAovKeys.add(row.customerName + row.customerPhone);
      }
    });

    let aovDropPercentage = lowAovCount > 0 ? totalAovDrop / lowAovCount : 0;

    // Build Alerts Array
    const alerts = [];
    if (dormantCount > 0) {
      alerts.push({
        id: "dormant_vips",
        type: "critical",
        title: `${dormantCount} Dormant VIPs Require Attention`,
        description: `Revenue at risk: ₹${dormantRevenueRisk.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
        badge: "Retention Risk",
        actionLabel: "Review Accounts",
        filterParam: "dormant_vips",
        count: dormantCount
      });
    }
    
    if (lowAovCount > 0) {
      alerts.push({
        id: "aov_drop",
        type: "warning", 
        title: `Basket Value Dropped for ${lowAovCount} Customers`,
        description: `Avg drop of ${aovDropPercentage.toFixed(1)}% vs historical baseline`,
        badge: "Upsell Deficit",
        actionLabel: "View Underperforming",
        filterParam: "low_aov",
        count: lowAovCount,
        icon: "TrendingDown"
      });
    }

    if (groupedData.length >= 5 && Number(top5RevenueSharePercentage) > 20) {
      alerts.push({
        id: "revenue_concentration",
        type: "info",
        title: `Top 5 Customers Drive ${top5RevenueSharePercentage}% of Revenue`,
        description: "High reliance on key corporate / catering accounts",
        badge: "Concentration",
        actionLabel: "View Top Spenders",
        filterParam: "top_spenders",
        count: 5
      });
    }

    // --- Filter Application ---
    if (alertFilter === 'dormant_vips') {
      // Cross reference the dormantQuery to filter groupedData (which is now unfiltered by date because isHistoricalFilter was true)
      const dormantKeys = new Set(dormantQuery.map(d => d.customerName + d.customerPhone));
      groupedData = groupedData.filter(r => dormantKeys.has(r.customerName + r.customerPhone));
    } else if (alertFilter === 'top_spenders') {
      groupedData = groupedData.filter(r => r.customerName !== 'Walk-in Customer').slice(0, 5);
    } else if (alertFilter === 'low_aov') {
      groupedData = groupedData.filter(r => lowAovKeys.has(r.customerName + r.customerPhone));
    }
    
    const filteredTotal = groupedData.length;
    
    const offset = (page - 1) * limit;
    const paginatedData = groupedData.slice(offset, offset + limit);

    return {
      data: paginatedData,
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
