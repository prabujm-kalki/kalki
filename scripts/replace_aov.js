const fs = require('fs');
let content = fs.readFileSync('src/app/sales/reports/actions.ts', 'utf8');

// The block to replace:
const startPattern = '// AOV logic (Historical baseline vs last 30 days)';
const endPattern = 'if (groupedData.length >= 5 && Number(top5RevenueSharePercentage) > 20)';

const startIndex = content.indexOf(startPattern);
const endIndex = content.indexOf(endPattern);

if (startIndex === -1 || endIndex === -1) {
  console.log('Patterns not found!');
  process.exit(1);
}

const replacement = `// AOV logic (Historical baseline vs active period)
    const activeStart = startObj || new Date(new Date().setDate(new Date().getDate() - 30));
    const activeEnd = endObj || new Date();
    
    const baselineStart = new Date(activeStart);
    baselineStart.setDate(baselineStart.getDate() - 90);

    const aovQuery = await db.select({
      customerName: nameCol,
      customerPhone: phoneCol,
      recentAov: sql<number>\`AVG(CASE WHEN \${salesInvoices.invoiceDate} >= \${activeStart} AND \${salesInvoices.invoiceDate} <= \${activeEnd} THEN CAST(\${salesInvoices.grandTotal} AS NUMERIC) END)\`,
      baselineAov: sql<number>\`AVG(CASE WHEN \${salesInvoices.invoiceDate} >= \${baselineStart} AND \${salesInvoices.invoiceDate} < \${activeStart} THEN CAST(\${salesInvoices.grandTotal} AS NUMERIC) END)\`
    })
    .from(salesInvoices)
    .leftJoin(customers, eq(salesInvoices.customerId, customers.id))
    .where(and(baseWhereClauseUnfiltered, sql\`TRIM(\${salesInvoices.customerName}) != '' AND \${salesInvoices.customerName} IS NOT NULL\`))
    .groupBy(nameCol, phoneCol)
    .having(sql\`AVG(CASE WHEN \${salesInvoices.invoiceDate} >= \${baselineStart} AND \${salesInvoices.invoiceDate} < \${activeStart} THEN CAST(\${salesInvoices.grandTotal} AS NUMERIC) END) > 0 
            AND AVG(CASE WHEN \${salesInvoices.invoiceDate} >= \${activeStart} AND \${salesInvoices.invoiceDate} <= \${activeEnd} THEN CAST(\${salesInvoices.grandTotal} AS NUMERIC) END) > 0\`);

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
        title: \`\${dormantCount} Dormant VIPs Require Attention\`,
        description: \`Revenue at risk: ₹\${dormantRevenueRisk.toLocaleString('en-IN', { maximumFractionDigits: 0 })}\`,
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
        title: \`Basket Value Dropped for \${lowAovCount} Customers\`,
        description: \`Avg drop of \${aovDropPercentage.toFixed(1)}% vs historical baseline\`,
        badge: "Upsell Deficit",
        actionLabel: "View Underperforming",
        filterParam: "low_aov",
        count: lowAovCount,
        icon: "TrendingDown"
      });
    }

    `;

let newContent = content.slice(0, startIndex) + replacement + content.slice(endIndex);

newContent = newContent.replace(
  /} else if \(alertFilter === 'low_aov'\) {\s+groupedData = groupedData.sort\(\(a, b\) => Number\(a.avgBillValue\) - Number\(b.avgBillValue\)\);\s+}/,
  `} else if (alertFilter === 'low_aov') {\n      groupedData = groupedData.filter(r => lowAovKeys.has(r.customerName + r.customerPhone));\n    }`
);

fs.writeFileSync('src/app/sales/reports/actions.ts', newContent);
console.log('Successfully updated AOV Drop logic!');
