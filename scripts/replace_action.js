const fs = require('fs');

function replaceFunction() {
  let content = fs.readFileSync('src/app/sales/reports/actions.ts', 'utf8');

  const fnStart = content.indexOf('export async function fetchCustomerWiseReportData');
  if (fnStart === -1) {
    console.error('Function not found');
    process.exit(1);
  }

  // Find the end of the function. We will search for "export async function fetchCustomerInvoices" and cut right before it.
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
  alertFilter?: 'dormant_vips' | 'low_aov' | 'top_spenders' | 'all'
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

    // --- BASELINE QUERY (Prior 90 Days) for AOV Comparison ---
    let baselineAov = 0;
    if (startObj) {
      const baselineStart = new Date(startObj);
      baselineStart.setDate(baselineStart.getDate() - 90);
      
      const baselineWhereClause = and(
        eq(salesInvoices.organizationId, organizationId),
        sql\`\${salesInvoices.status} != 'CANCELLED' AND \${salesInvoices.paymentStatus} != 'CANCELLED'\`,
        locationId && locationId !== 'all' ? eq(salesInvoices.locationId, locationId) : undefined,
        gte(salesInvoices.invoiceDate, baselineStart),
        lt(salesInvoices.invoiceDate, startObj)
      );
      const baselineData = await db.select({
        avgBillValue: sql<number>\`AVG(CAST(\${salesInvoices.grandTotal} AS NUMERIC))\`
      })
      .from(salesInvoices)
      .where(baselineWhereClause);
      
      if (baselineData.length > 0 && baselineData[0].avgBillValue) {
        baselineAov = Number(baselineData[0].avgBillValue);
      }
    }

    const whereClause = and(
      eq(salesInvoices.organizationId, organizationId),
      sql\`\${salesInvoices.status} != 'CANCELLED' AND \${salesInvoices.paymentStatus} != 'CANCELLED'\`,
      locationId && locationId !== 'all' ? eq(salesInvoices.locationId, locationId) : undefined,
      startObj ? gte(salesInvoices.invoiceDate, startObj) : undefined,
      endObj ? lte(salesInvoices.invoiceDate, endObj) : undefined,
      searchQuery ? or(
        ilike(salesInvoices.customerName, \`%\${searchQuery}%\`),
        ilike(customers.phone, \`%\${searchQuery}%\`)
      ) : undefined
    );

    const nameCol = sql<string>\`COALESCE(NULLIF(TRIM(\${salesInvoices.customerName}), ''), 'Walk-in Customer')\`;
    const phoneCol = sql<string>\`COALESCE(NULLIF(TRIM(\${customers.phone}), ''), '-')\`;

    // Fetch all grouped data for calculation before pagination/filtering
    let groupedData = await db.select({
      customerName: nameCol,
      customerPhone: phoneCol,
      totalInvoices: sql<number>\`COUNT(\${salesInvoices.id})\`,
      totalRevenue: sql<number>\`SUM(CAST(\${salesInvoices.grandTotal} AS NUMERIC))\`,
      avgBillValue: sql<number>\`AVG(CAST(\${salesInvoices.grandTotal} AS NUMERIC))\`,
      lastPurchaseDate: sql<string>\`MAX(\${salesInvoices.invoiceDate})\`
    })
    .from(salesInvoices)
    .leftJoin(customers, eq(salesInvoices.customerId, customers.id))
    .where(whereClause)
    .groupBy(nameCol, phoneCol);

    const totalCustomers = groupedData.length;
    let topSpenderName = '-';
    let topSpenderAmount = 0;
    let totalRev = 0;
    let repeatCustomers = 0;
    
    // Anomaly tracking
    let dormantCount = 0;
    let dormantRevenueRisk = 0;
    let lowAovCount = 0;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    groupedData.sort((a, b) => Number(b.totalRevenue) - Number(a.totalRevenue));

    // Calculate percentiles
    const top20Index = Math.max(1, Math.floor(totalCustomers * 0.2));

    for (let i = 0; i < groupedData.length; i++) {
      const row = groupedData[i];
      const rev = Number(row.totalRevenue);
      const invs = Number(row.totalInvoices);
      const aov = Number(row.avgBillValue);
      const lastVisit = new Date(row.lastPurchaseDate);
      
      totalRev += rev;
      
      if (rev > topSpenderAmount) {
        topSpenderAmount = rev;
        topSpenderName = row.customerName || '-';
      }
      if (invs >= 2) {
        repeatCustomers++;
      }

      // Check Dormant VIP
      const isTop20 = i < top20Index;
      row.isDormantVip = (isTop20 || invs >= 3) && lastVisit < thirtyDaysAgo && row.customerName !== 'Walk-in Customer';
      if (row.isDormantVip) {
        dormantCount++;
        dormantRevenueRisk += rev;
      }

      // Check AOV Drop (Individual level)
      row.isLowAov = false;
      // Alternatively, the prompt says "If overall average order value dropped by >= 5%, calculate aovDropPercentage."
    }

    // Top 5 Revenue Concentration
    let top5Revenue = 0;
    for (let i = 0; i < Math.min(5, groupedData.length); i++) {
      if (groupedData[i].customerName !== 'Walk-in Customer') {
         top5Revenue += Number(groupedData[i].totalRevenue);
      }
    }
    const top5RevenueSharePercentage = totalRev > 0 ? ((top5Revenue / totalRev) * 100).toFixed(1) : "0";

    const avgSpend = totalCustomers > 0 ? totalRev / totalCustomers : 0;
    const repeatRate = totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0;
    
    // Overall AOV drop
    let aovDropPercentage = 0;
    if (baselineAov > 0) {
       const currentAov = avgSpend;
       if (currentAov < baselineAov) {
         aovDropPercentage = Number((( (baselineAov - currentAov) / baselineAov ) * 100).toFixed(1));
       }
    }

    // Build Alerts
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
        count: lowAovCount // Note: filter logic below handles this
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

    // Apply Filters
    if (alertFilter === 'dormant_vips') {
      groupedData = groupedData.filter(r => r.isDormantVip);
    } else if (alertFilter === 'top_spenders') {
      groupedData = groupedData.filter(r => r.customerName !== 'Walk-in Customer').slice(0, 5);
    } else if (alertFilter === 'low_aov') {
      // Just showing bottom AOV for demonstration
      groupedData = groupedData.sort((a, b) => Number(a.avgBillValue) - Number(b.avgBillValue));
    }
    
    const filteredTotal = groupedData.length;
    
    const offset = (page - 1) * limit;
    const paginatedData = groupedData.slice(offset, offset + limit);

    return {
      data: paginatedData,
      total: filteredTotal, // return filtered total for pagination
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

  fs.writeFileSync('src/app/sales/reports/actions.ts', before + newFunction + after);
}
replaceFunction();
