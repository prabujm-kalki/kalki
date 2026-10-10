const fs = require('fs');
let content = fs.readFileSync('src/app/sales/reports/actions.ts', 'utf8');

const fnStart = content.indexOf('export async function fetchCustomerWiseReportData');
const fnEnd = content.indexOf('export async function fetchCustomerInvoices', fnStart);
let before = content.slice(0, fnStart);
let after = content.slice(fnEnd !== -1 ? fnEnd : content.length);

const newFunction = `export async function fetchCustomerWiseReportData(
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
      sql\`\${salesInvoices.status} != 'CANCELLED' AND \${salesInvoices.paymentStatus} != 'CANCELLED'\`,
      locationId && locationId !== 'all' ? eq(salesInvoices.locationId, locationId) : undefined
    );

    const whereClauseFiltered = and(
      baseWhereClauseUnfiltered,
      applyStart ? gte(salesInvoices.invoiceDate, applyStart) : undefined,
      applyEnd ? lte(salesInvoices.invoiceDate, applyEnd) : undefined,
      searchQuery ? or(
        ilike(salesInvoices.customerName, \`%\${searchQuery}%\`),
        ilike(customers.phone, \`%\${searchQuery}%\`)
      ) : undefined
    );

    const nameCol = sql<string>\`COALESCE(NULLIF(TRIM(\${salesInvoices.customerName}), ''), 'Walk-in Customer')\`;
    const phoneCol = sql<string>\`COALESCE(NULLIF(TRIM(\${customers.phone}), ''), '-')\`;

    // 1. Fetch Main Filtered Data (for KPIs and the table)
    let groupedDataRaw = await db.select({
      customerName: nameCol,
      customerPhone: phoneCol,
      totalInvoices: sql<number>\`COUNT(\${salesInvoices.id})\`,
      totalRevenue: sql<number>\`SUM(CAST(\${salesInvoices.grandTotal} AS NUMERIC))\`,
      avgBillValue: sql<number>\`AVG(CAST(\${salesInvoices.grandTotal} AS NUMERIC))\`,
      lastPurchaseDate: sql<string>\`MAX(\${salesInvoices.invoiceDate})\`
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
      totalRevenue: sql<number>\`SUM(CAST(\${salesInvoices.grandTotal} AS NUMERIC))\`,
      totalInvoices: sql<number>\`COUNT(\${salesInvoices.id})\`,
      lastPurchaseDate: sql<string>\`MAX(\${salesInvoices.invoiceDate})\`
    })
    .from(salesInvoices)
    .leftJoin(customers, eq(salesInvoices.customerId, customers.id))
    .where(and(baseWhereClauseUnfiltered, sql\`TRIM(\${salesInvoices.customerName}) != '' AND \${salesInvoices.customerName} IS NOT NULL\`))
    .groupBy(nameCol, phoneCol)
    .having(sql\`MAX(\${salesInvoices.invoiceDate}) < \${thirtyDaysAgo} AND (COUNT(\${salesInvoices.id}) >= 3 OR SUM(CAST(\${salesInvoices.grandTotal} AS NUMERIC)) > 10000)\`); // simplified logic for top 20% by using > 10k threshold for speed
    
    let dormantCount = dormantQuery.length;
    let dormantRevenueRisk = dormantQuery.reduce((sum, r) => sum + Number(r.totalRevenue), 0);

    // AOV logic (Historical baseline vs last 30 days)
    // We'll calculate a simple global AOV drop for the branch for the alert
    const aovQuery = await db.select({
      recentAov: sql<number>\`AVG(CASE WHEN \${salesInvoices.invoiceDate} >= \${thirtyDaysAgo} THEN CAST(\${salesInvoices.grandTotal} AS NUMERIC) END)\`,
      baselineAov: sql<number>\`AVG(CASE WHEN \${salesInvoices.invoiceDate} >= \${ninetyDaysAgo} AND \${salesInvoices.invoiceDate} < \${thirtyDaysAgo} THEN CAST(\${salesInvoices.grandTotal} AS NUMERIC) END)\`
    })
    .from(salesInvoices)
    .where(baseWhereClauseUnfiltered);

    let aovDropPercentage = 0;
    if (aovQuery.length > 0 && Number(aovQuery[0].baselineAov) > 0) {
      const recent = Number(aovQuery[0].recentAov) || 0;
      const baseline = Number(aovQuery[0].baselineAov);
      if (recent > 0 && recent < baseline) {
         aovDropPercentage = Number((((baseline - recent) / baseline) * 100).toFixed(1));
      } else if (recent === 0 && baseline > 0) {
         // Special case: no recent sales, 100% drop
         aovDropPercentage = 100;
      }
    }

    // Build Alerts Array
    const alerts = [];
    if (dormantCount > 0) {
      alerts.push({
        id: "dormant_vips",
        type: "critical",
        title: \`\${dormantCount} Dormant VIPs Require Attention\`,
        description: \`Revenue at risk: ₹\${dormantRevenueRisk.toLocaleString('en-IN', { maximumFractionDigits: 0 })}\`,
        badge: "Retention Risk",
        actionLabel: "Review Accounts",
        filterParam: "dormant_vips",
        count: dormantCount
      });
    }
    
    if (aovDropPercentage >= 5) {
      alerts.push({
        id: "aov_drop",
        type: "warning",
        title: \`Average Basket Value Dropped \${aovDropPercentage}%\`,
        description: "Compared to last 90-day baseline ticket sizes",
        badge: "Upsell Deficit",
        actionLabel: "View Underperforming",
        filterParam: "low_aov",
        count: 0 // Used generally
      });
    }

    if (groupedData.length >= 5 && Number(top5RevenueSharePercentage) > 20) {
      alerts.push({
        id: "revenue_concentration",
        type: "info",
        title: \`Top 5 Customers Drive \${top5RevenueSharePercentage}% of Revenue\`,
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
      groupedData = groupedData.sort((a, b) => Number(a.avgBillValue) - Number(b.avgBillValue));
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
`;

fs.writeFileSync('src/app/sales/reports/actions.ts', before + newFunction + '\n\n' + after);
console.log('Successfully applied decoupled anomaly architecture!');
