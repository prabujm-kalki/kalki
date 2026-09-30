import { db } from "@/db";
import { purchaseOrders, vendors, vendorItems, organizations } from "@/db/schema";
import { eq, sum, count, desc, and, gte, lt, sql } from "drizzle-orm";
import { Activity } from "@/components/purchasing/RecentActivityFeed";

export async function getDashboardData() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyFiveDaysAgo = new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000);

  const totalSpendPromise = db
    .select({ total: sum(purchaseOrders.totalAmount) })
    .from(purchaseOrders)
    .where(gte(purchaseOrders.createdAt, startOfMonth));

  const pastSpendPromise = db
    .select({ total: sum(purchaseOrders.totalAmount) })
    .from(purchaseOrders)
    .where(and(
      gte(purchaseOrders.createdAt, startOfLastMonth),
      lt(purchaseOrders.createdAt, startOfMonth)
    ));

  const pendingOrdersPromise = db
    .select({ count: count() })
    .from(purchaseOrders)
    .where(eq(purchaseOrders.status, 'draft'));

  const urgentOrdersPromise = db
    .select({ count: count() })
    .from(purchaseOrders)
    .where(and(
      eq(purchaseOrders.status, 'draft'),
      lt(purchaseOrders.createdAt, twoDaysAgo)
    ));

  const processingTimePromise = db
    .select({
      avgTime: sql<number>`avg(extract(epoch from (updated_at - created_at)))`
    })
    .from(purchaseOrders)
    .where(sql`status != 'draft'`);

  const outflowPromise = db
    .select({ total: sum(purchaseOrders.totalAmount) })
    .from(purchaseOrders)
    .where(and(
      eq(purchaseOrders.status, 'approved'),
      gte(purchaseOrders.createdAt, sevenDaysAgo)
    ));

  const pastOutflowPromise = db
    .select({ total: sum(purchaseOrders.totalAmount) })
    .from(purchaseOrders)
    .where(and(
      eq(purchaseOrders.status, 'approved'),
      gte(purchaseOrders.createdAt, thirtyFiveDaysAgo),
      lt(purchaseOrders.createdAt, sevenDaysAgo)
    ));

  const lowStockPromise = db.execute(sql`
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
  `);

  const recentPOsPromise = db
    .select({
      id: purchaseOrders.id,
      status: purchaseOrders.status,
      totalAmount: purchaseOrders.totalAmount,
      createdAt: purchaseOrders.createdAt,
      publicToken: purchaseOrders.publicToken,
      vendorName: vendors.name,
      vendorPhone: vendors.contactDetails,
      poDeliveryMethod: vendors.poDeliveryMethod,
      poWhatsappPreference: vendors.poWhatsappPreference,
      whatsappPoTemplate: organizations.whatsappPoTemplate,
    })
    .from(purchaseOrders)
    .leftJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
    .leftJoin(organizations, eq(purchaseOrders.organizationId, organizations.id))
    .orderBy(desc(purchaseOrders.createdAt))
    .limit(5);

  const monthlySpendPromise = db.execute(sql`
    SELECT to_char(created_at, 'Mon') as name, SUM(total_amount) as total
    FROM purchase_orders
    WHERE created_at >= date_trunc('year', CURRENT_DATE)
    GROUP BY to_char(created_at, 'Mon'), extract(month from created_at)
    ORDER BY extract(month from created_at)
  `);

  const categoryPromise = db.execute(sql`
    SELECT 'General' as name, SUM(total_amount) as value
    FROM purchase_orders
  `);

  const [
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

  // Type assertion or check depending on the driver
  const rows = (lowStockResult as any).rows || lowStockResult;
  const lowStockItemsCount = Number(rows[0]?.low_stock_count || 0);

  const activities: any[] = recentPOs.map(po => ({
    id: po.id.split('-')[0].toUpperCase() + '-' + po.id.substring(1, 5),
    realId: po.id,
    type: "Purchase Order",
    entity: po.vendorName || 'Unknown Vendor',
    date: po.createdAt.toLocaleDateString(),
    status: po.status === 'draft' ? 'Pending Approval' : po.status.charAt(0).toUpperCase() + po.status.slice(1),
    value: Number(po.totalAmount),
    publicToken: po.publicToken,
    vendorPhone: po.vendorPhone,
    poDeliveryMethod: po.poDeliveryMethod,
    poWhatsappPreference: po.poWhatsappPreference,
    whatsappPoTemplate: po.whatsappPoTemplate,
  }));

  const pendingApprovals = recentPOs
    .filter(po => po.status === 'draft')
    .map(po => ({
      id: po.id.split('-')[0].toUpperCase() + '-' + po.id.substring(1, 5),
      realId: po.id,
      amount: Number(po.totalAmount),
      vendorName: po.vendorName || 'Unknown Vendor',
      publicToken: po.publicToken,
      vendorPhone: po.vendorPhone,
      poDeliveryMethod: po.poDeliveryMethod,
      poWhatsappPreference: po.poWhatsappPreference,
    whatsappPoTemplate: po.whatsappPoTemplate,
    }));

  const msRows = (monthlySpendResult as any).rows || monthlySpendResult;
  const spendTrendData = msRows.map((r: any) => ({ name: r.name as string, spend: Number(r.total) }));

  const catRows = (categoryResult as any).rows || categoryResult;
  const categoryData = catRows.map((r: any) => ({ name: r.name as string, value: Number(r.value) }));

  return {
    metrics: {
      totalSpend,
      spendVsLastMonthPercent,
      pendingOrdersCount,
      urgentOrdersCount,
      avgProcessingDays,
      expectedOutflow,
      outflowVsAvgPercent,
      lowStockItemsCount,
    },
    activities,
    pendingApprovals,
    charts: {
      spendTrendData: spendTrendData.length > 0 ? spendTrendData : [{ name: 'Jan', spend: 0 }],
      categoryData: categoryData.length > 0 && categoryData[0]?.value ? categoryData : [{ name: 'General', value: 0 }],
    }
  };
}
