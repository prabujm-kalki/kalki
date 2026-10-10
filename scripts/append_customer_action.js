const fs = require('fs');
let content = fs.readFileSync('src/app/sales/reports/actions.ts', 'utf8');

const newFunction = `

export async function fetchCustomerWiseReportData(
  organizationId: string, 
  locationId?: string, 
  startDate?: string, 
  endDate?: string,
  page: number = 1,
  limit: number = 15,
  searchQuery?: string
) {
  try {
    if (!organizationId) return { data: [], kpis: { totalCustomers: 0, topSpenderName: '-', topSpenderAmount: 0, avgSpend: 0, repeatRate: 0 }, total: 0 };

    let startObj = undefined;
    if (startDate) {
      startObj = new Date(startDate);
      startObj.setUTCHours(0, 0, 0, 0);
    }
    let endObj = undefined;
    if (endDate) {
      endObj = new Date(endDate);
      endObj.setUTCHours(23, 59, 59, 999);
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

    const groupedData = await db.select({
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

    for (const row of groupedData) {
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
    }

    const avgSpend = totalCustomers > 0 ? totalRev / totalCustomers : 0;
    const repeatRate = totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0;

    groupedData.sort((a, b) => Number(b.totalRevenue) - Number(a.totalRevenue));
    
    const offset = (page - 1) * limit;
    const paginatedData = groupedData.slice(offset, offset + limit);

    return {
      data: paginatedData,
      total: totalCustomers,
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
    return { data: [], kpis: { totalCustomers: 0, topSpenderName: '-', topSpenderAmount: 0, avgSpend: 0, repeatRate: 0 }, total: 0 };
  }
}
`;

content += newFunction;
fs.writeFileSync('src/app/sales/reports/actions.ts', content);
