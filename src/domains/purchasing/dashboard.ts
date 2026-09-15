import { db } from "@/db";
import { purchaseOrders, vendors } from "@/db/schema";
import { eq, sum, count, desc } from "drizzle-orm";
import { Activity } from "@/components/purchasing/RecentActivityFeed";

export async function getDashboardData() {
  // 1. Total Spend (MTD) - Simplified to total sum of all POs for now
  const spendResult = await db
    .select({ total: sum(purchaseOrders.totalAmount) })
    .from(purchaseOrders);
  const totalSpend = Number(spendResult[0]?.total || 0);

  // 2. Pending Orders Count
  const pendingOrdersResult = await db
    .select({ count: count() })
    .from(purchaseOrders)
    .where(eq(purchaseOrders.status, 'draft')); // Assuming 'draft' is the pending state
  const pendingOrdersCount = Number(pendingOrdersResult[0]?.count || 0);

  // Urgent Orders - mock logic for now (e.g., 20% of pending)
  const urgentOrdersCount = Math.floor(pendingOrdersCount * 0.2);

  // 3. Expected Outflow - mock for now or sum of non-draft POs
  const outflowResult = await db
    .select({ total: sum(purchaseOrders.totalAmount) })
    .from(purchaseOrders)
    .where(eq(purchaseOrders.status, 'approved')); // Example status
  const expectedOutflow = Number(outflowResult[0]?.total || totalSpend * 0.3); // fallback if no approved

  // 4. Low-Stock Alerts - hardcoded for this iteration
  const lowStockItemsCount = 5;

  // 5. Recent Activity Feed
  const recentPOs = await db
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
    .limit(5);

  const activities: Activity[] = recentPOs.map(po => ({
    id: po.id.split('-')[0].toUpperCase() + '-' + po.id.substring(1, 5), // short ID
    type: "Purchase Order",
    entity: po.vendorName || 'Unknown Vendor',
    date: po.createdAt.toLocaleDateString(),
    status: po.status === 'draft' ? 'Pending Approval' : 'Approved',
    value: Number(po.totalAmount),
  }));

  // 6. Pending Approvals (for Actions component)
  const pendingApprovals = recentPOs
    .filter(po => po.status === 'draft')
    .map(po => ({
      id: po.id.split('-')[0].toUpperCase() + '-' + po.id.substring(1, 5),
      amount: Number(po.totalAmount),
      vendorName: po.vendorName || 'Unknown Vendor'
    }));

  // 7. Charts Data
  // Mocking charts data as we don't have historical months or categories setup yet
  const spendTrendData = [
    { name: "Apr", spend: totalSpend * 0.8 },
    { name: "May", spend: totalSpend * 0.6 },
    { name: "Jun", spend: totalSpend * 0.9 },
    { name: "Jul", spend: totalSpend },
    { name: "Aug", spend: totalSpend * 0.7 },
    { name: "Sep", spend: totalSpend * 0.85 },
  ];

  const categoryData = [
    { name: "Raw Materials", value: totalSpend * 0.5 },
    { name: "Office Supplies", value: totalSpend * 0.15 },
    { name: "IT Equipment", value: totalSpend * 0.2 },
    { name: "Services", value: totalSpend * 0.15 },
  ];

  return {
    metrics: {
      totalSpend,
      pendingOrdersCount,
      urgentOrdersCount,
      expectedOutflow,
      lowStockItemsCount
    },
    activities,
    pendingApprovals,
    charts: {
      spendTrendData,
      categoryData
    }
  };
}
