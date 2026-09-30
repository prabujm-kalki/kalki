const fs = require('fs');

let c = fs.readFileSync('src/domains/purchasing/dashboard.ts', 'utf8');

c = c.replace(
  /const totalSpendResult = await db\s*\.select\(.*?;\s*const totalSpend.*?;/s,
  `const totalSpendPromise = db
    .select({ total: sum(purchaseOrders.totalAmount) })
    .from(purchaseOrders)
    .where(gte(purchaseOrders.createdAt, startOfMonth));`
);

c = c.replace(
  /const pastSpendResult = await db\s*\.select\(.*?;\s*const pastTotal.*?;/s,
  `const pastSpendPromise = db
    .select({ total: sum(purchaseOrders.totalAmount) })
    .from(purchaseOrders)
    .where(and(
      gte(purchaseOrders.createdAt, startOfLastMonth),
      lt(purchaseOrders.createdAt, startOfMonth)
    ));`
);

c = c.replace(
  /const pendingOrdersCountResult = await db\s*\.select\(.*?;\s*const pendingOrdersCount.*?;/s,
  `const pendingOrdersPromise = db
    .select({ count: count() })
    .from(purchaseOrders)
    .where(eq(purchaseOrders.status, 'draft'));`
);

c = c.replace(
  /const urgentOrdersCountResult = await db\s*\.select\(.*?;\s*const urgentOrdersCount.*?;/s,
  `const urgentOrdersPromise = db
    .select({ count: count() })
    .from(purchaseOrders)
    .where(and(
      eq(purchaseOrders.status, 'draft'),
      lt(purchaseOrders.createdAt, twoDaysAgo)
    ));`
);

c = c.replace(
  /const processingTimeResult = await db\s*\.select\(.*?;\s*const avgProcessingSeconds.*?;.*?;\n/s,
  `const processingTimePromise = db
    .select({
      avgTime: sql<number>\`avg(extract(epoch from (updated_at - created_at)))\`
    })
    .from(purchaseOrders)
    .where(sql\`status != 'draft'\`);\n`
);

c = c.replace(
  /const outflowResult = await db\s*\.select\(.*?;\s*const expectedOutflow.*?;/s,
  `const outflowPromise = db
    .select({ total: sum(purchaseOrders.totalAmount) })
    .from(purchaseOrders)
    .where(and(
      eq(purchaseOrders.status, 'approved'),
      gte(purchaseOrders.createdAt, sevenDaysAgo)
    ));`
);

c = c.replace(
  /const pastOutflowResult = await db\s*\.select\(.*?;\s*const pastTotalOutflow.*?;/s,
  `const pastOutflowPromise = db
    .select({ total: sum(purchaseOrders.totalAmount) })
    .from(purchaseOrders)
    .where(and(
      eq(purchaseOrders.status, 'approved'),
      gte(purchaseOrders.createdAt, thirtyFiveDaysAgo),
      lt(purchaseOrders.createdAt, sevenDaysAgo)
    ));`
);

c = c.replace(
  /const lowStockResult = await db\.execute\(.*?;\s*const lowStockItemsCount =.*?;/s,
  `const lowStockPromise = db.execute(sql\`
    WITH LatestLedger AS (
      SELECT DISTINCT ON (vendor_item_id) vendor_item_id, balance_after
      FROM inventory_ledger
      ORDER BY vendor_item_id, recorded_at DESC
    )
    SELECT COUNT(*) as low_stock_count
    FROM vendor_items vi
    LEFT JOIN LatestLedger ll ON vi.id = ll.vendor_item_id
    WHERE COALESCE(ll.balance_after, 0) <= COALESCE(vi.minimum_stock, 0)
      AND vi.is_active = true
      AND vi.minimum_stock > 0
  \`);`
);

c = c.replace(
  /const recentPOs = await db\s*\.select\(.*?\)\s*\.limit\(5\);/s,
  `const recentPOsPromise = db
    .select({
      id: purchaseOrders.id,
      status: purchaseOrders.status,
      totalAmount: purchaseOrders.totalAmount,
      createdAt: purchaseOrders.createdAt,
      vendorName: vendors.name,
    })
    .from(purchaseOrders)
    .leftJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
    .orderBy(desc(purchaseOrders.createdAt))
    .limit(5);`
);

c = c.replace(
  /const monthlySpendResult = await db\.execute\(.*?;\n/s,
  `const monthlySpendPromise = db.execute(sql\`
    SELECT to_char(created_at, 'Mon') as name, SUM(total_amount) as total
    FROM purchase_orders
    WHERE created_at >= date_trunc('year', CURRENT_DATE)
    GROUP BY to_char(created_at, 'Mon'), extract(month from created_at)
    ORDER BY extract(month from created_at)
  \`);\n`
);

c = c.replace(
  /const categoryResult = await db\.execute\(.*?;\n/s,
  `const categoryPromise = db.execute(sql\`
    SELECT 'General' as name, SUM(total_amount) as value
    FROM purchase_orders
  \`);\n`
);


// Insert Promise.all right before mapping activities!
c = c.replace(
  /const activities: Activity\[\] =/s,
  `const [
    totalSpendResult,
    pastSpendResult,
    pendingOrdersCountResult,
    urgentOrdersCountResult,
    processingTimeResult,
    outflowResult,
    pastOutflowResult,
    lowStockResult,
    recentPOs,
    monthlySpendResult,
    categoryResult
  ] = await Promise.all([
    totalSpendPromise,
    pastSpendPromise,
    pendingOrdersPromise,
    urgentOrdersPromise,
    processingTimePromise,
    outflowPromise,
    pastOutflowPromise,
    lowStockPromise,
    recentPOsPromise,
    monthlySpendPromise,
    categoryPromise
  ]);

  const totalSpend = Number(totalSpendResult[0]?.total || 0);
  const pastTotal = Number(pastSpendResult[0]?.total || 0);
  const spendVsLastMonthPercent = pastTotal === 0 
    ? (totalSpend > 0 ? 100 : 0) 
    : ((totalSpend - pastTotal) / pastTotal) * 100;
  
  const pendingOrdersCount = Number(pendingOrdersCountResult[0]?.count || 0);
  const urgentOrdersCount = Number(urgentOrdersCountResult[0]?.count || 0);

  const avgProcessingSeconds = processingTimeResult[0]?.avgTime || 0;
  const avgProcessingDays = avgProcessingSeconds > 0 ? (avgProcessingSeconds / 86400).toFixed(1) : "0";

  const expectedOutflow = Number(outflowResult[0]?.total || 0);
  const pastTotalOutflow = Number(pastOutflowResult[0]?.total || 0);
  const avgWeeklyOutflow = pastTotalOutflow / 4;
  const outflowVsAvgPercent = avgWeeklyOutflow === 0
    ? (expectedOutflow > 0 ? 100 : 0)
    : ((expectedOutflow - avgWeeklyOutflow) / avgWeeklyOutflow) * 100;

  const lowStockItemsCount = Number(lowStockResult.rows[0]?.low_stock_count || 0);

  const activities: Activity[] =`
);

fs.writeFileSync('src/domains/purchasing/dashboard.ts', c);
console.log("Refactored to Promise.all");
