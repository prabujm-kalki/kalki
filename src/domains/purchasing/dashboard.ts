import { db } from "@/db";
import { purchaseOrders, vendors, vendorItems, organizations, taskInstances } from "@/db/schema";
import { eq, sum, count, desc, and, gte, lt, sql, inArray } from "drizzle-orm";
import { Activity } from "@/components/purchasing/RecentActivityFeed";

export async function getDashboardData(
  isOwner: boolean = false, 
  userId?: string, 
  userRoleIds: string[] = [],
  organizationId?: string,
  locationId?: string
) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyFiveDaysAgo = new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000);

  // Tenant isolation conditions
  const tenantConditions: any[] = [];
  if (organizationId) tenantConditions.push(eq(purchaseOrders.organizationId, organizationId));
  if (locationId) tenantConditions.push(eq(purchaseOrders.locationId, locationId));

  const totalSpendPromise = db
    .select({ total: sum(purchaseOrders.totalAmount) })
    .from(purchaseOrders)
    .where(and(gte(purchaseOrders.createdAt, startOfMonth), ...tenantConditions));

  const pastSpendPromise = db
    .select({ total: sum(purchaseOrders.totalAmount) })
    .from(purchaseOrders)
    .where(and(
      gte(purchaseOrders.createdAt, startOfLastMonth),
      lt(purchaseOrders.createdAt, startOfMonth),
      ...tenantConditions
    ));

  const pendingOrdersPromise = db
    .select({ count: count() })
    .from(purchaseOrders)
    .where(and(inArray(purchaseOrders.status, ['draft', 'pending_review']), ...tenantConditions));

  const urgentOrdersPromise = db
    .select({ count: count() })
    .from(purchaseOrders)
    .where(and(
      inArray(purchaseOrders.status, ['draft', 'pending_review']),
      lt(purchaseOrders.createdAt, twoDaysAgo),
      ...tenantConditions
    ));

  const processingTimePromise = db
    .select({
      avgTime: sql<number>`avg(extract(epoch from (updated_at - created_at)))`
    })
    .from(purchaseOrders)
    .where(and(sql`status != 'draft'`, ...tenantConditions));

  const outflowPromise = db
    .select({ total: sum(purchaseOrders.totalAmount) })
    .from(purchaseOrders)
    .where(and(
      eq(purchaseOrders.status, 'approved'),
      gte(purchaseOrders.createdAt, sevenDaysAgo),
      ...tenantConditions
    ));

  const pastOutflowPromise = db
    .select({ total: sum(purchaseOrders.totalAmount) })
    .from(purchaseOrders)
    .where(and(
      eq(purchaseOrders.status, 'approved'),
      gte(purchaseOrders.createdAt, thirtyFiveDaysAgo),
      lt(purchaseOrders.createdAt, sevenDaysAgo),
      ...tenantConditions
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
      poNumber: purchaseOrders.poNumber,
      status: purchaseOrders.status,
      totalAmount: purchaseOrders.totalAmount,
      createdAt: purchaseOrders.createdAt,
      publicToken: purchaseOrders.publicToken,
      vendorName: vendors.name,
      vendorPhone: vendors.contactDetails,
      poDeliveryMethod: vendors.poDeliveryMethod,
      poWhatsappPreference: vendors.poWhatsappPreference,
      whatsappPoTemplate: organizations.whatsappPoTemplate,
      cashierBillAmount: purchaseOrders.cashierBillAmount,
      cashierAttachments: purchaseOrders.cashierAttachments,
      processOwnerAttachments: purchaseOrders.processOwnerAttachments,
      processOwnerRoleId: purchaseOrders.processOwnerRoleId,
      reviewRoleId: purchaseOrders.reviewRoleId,
      billReviewRoleId: purchaseOrders.billReviewRoleId,
    })
    .from(purchaseOrders)
    .leftJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
    .leftJoin(organizations, eq(purchaseOrders.organizationId, organizations.id))
    .where(tenantConditions.length > 0 ? and(...tenantConditions) : undefined)
    .orderBy(desc(purchaseOrders.createdAt))
    .limit(10);

  const monthlySpendPromise = db.execute(sql`
    SELECT to_char(created_at, 'Mon') as name, SUM(total_amount) as total
    FROM purchase_orders
    WHERE created_at >= date_trunc('year', CURRENT_DATE)
      ${organizationId ? sql`AND organization_id = ${organizationId}` : sql``}
      ${locationId ? sql`AND location_id = ${locationId}` : sql``}
    GROUP BY to_char(created_at, 'Mon'), extract(month from created_at)
    ORDER BY extract(month from created_at)
  `);

  const categoryPromise = db.execute(sql`
    SELECT 
      COALESCE(c.name, 'Uncategorized') as name, 
      SUM(pol.ordered_quantity * pol.unit_rate) as value
    FROM purchase_order_lines pol
    JOIN purchase_orders po ON pol.po_id = po.id
    JOIN items i ON pol.item_id = i.id
    LEFT JOIN item_categories c ON i.category_id = c.id
    WHERE po.status != 'draft'
      AND po.created_at >= date_trunc('month', CURRENT_DATE)
      ${organizationId ? sql`AND po.organization_id = ${organizationId}` : sql``}
      ${locationId ? sql`AND po.location_id = ${locationId}` : sql``}
    GROUP BY c.id, c.name
  `);

  const taskTenantConditions: any[] = [];
  if (organizationId) taskTenantConditions.push(eq(taskInstances.organizationId, organizationId));
  if (locationId) {
    taskTenantConditions.push(sql`(${taskInstances.contextData}->>'locationId' = ${locationId} OR ${taskInstances.contextData}->>'locationId' IS NULL)`);
  }

  const recentTasksPromise = db
    .select({
      id: taskInstances.id,
      createdAt: taskInstances.createdAt,
      completedAt: taskInstances.completedAt,
      updatedAt: taskInstances.updatedAt,
      dueAt: taskInstances.dueAt,
      contextData: taskInstances.contextData,
      status: taskInstances.status,
      assignedRoleId: taskInstances.assignedRoleId,
      assignedUserId: taskInstances.assignedUserId,
    })
    .from(taskInstances)
    .where(taskTenantConditions.length > 0 ? and(...taskTenantConditions) : undefined)
    .orderBy(desc(taskInstances.updatedAt))
    .limit(10);

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
    categoryResult,
    recentTasks
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
    categoryPromise,
    recentTasksPromise
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

  const poActivities: Activity[] = recentPOs.map(po => ({
    id: po.poNumber || po.id.split('-')[0].toUpperCase() + '-' + po.id.substring(1, 5),
    realId: po.id,
    type: "Purchase Order",
    entity: po.vendorName || 'Unknown Vendor',
    date: po.createdAt.toLocaleDateString(),
    status: po.status === 'draft' || po.status === 'pending_approval' ? 'Pending Approval' : 
            po.status === 'pending_review' ? 'Pending Review' :
            po.status === 'received' ? 'Awaiting Audit' : 
            po.status === 'audited' ? 'Final Review' :
            po.status.charAt(0).toUpperCase() + po.status.slice(1),
    value: Number(po.cashierBillAmount || po.totalAmount || 0),
    publicToken: po.publicToken,
    vendorPhone: po.vendorPhone,
    poDeliveryMethod: po.poDeliveryMethod,
    poWhatsappPreference: po.poWhatsappPreference,
    whatsappPoTemplate: po.whatsappPoTemplate,
    timestamp: po.createdAt.getTime()
  }));

  const taskActivities: Activity[] = recentTasks
    .map(t => {
      const ctx = t.contextData as any;
      let displayStatus = t.status.charAt(0).toUpperCase() + t.status.slice(1);
      if (t.status === 'audit_pending') displayStatus = 'Awaiting Audit';
      if (t.status === 'in_progress') displayStatus = 'In Progress';
      
      return {
        id: `TASK-${t.id.substring(0, 5).toUpperCase()}`,
        realId: t.id,
        type: "Task",
        entity: ctx.title || ctx.vendorName || 'Task Engine',
        date: (t.updatedAt || t.createdAt).toLocaleDateString(),
        status: displayStatus,
        value: 0,
        actionUrl: ctx.actionUrl || null,
        timestamp: (t.updatedAt || t.createdAt).getTime()
      };
    });

  const activities = [...poActivities, ...taskActivities]
    .sort((a: any, b: any) => b.timestamp - a.timestamp)
    .slice(0, 10);

  const pendingApprovals = recentPOs
    .filter(po => {
      if (po.status === 'draft') return (isOwner && po.processOwnerRoleId === null) || userRoleIds.includes(po.processOwnerRoleId as string);
      if (po.status === 'pending_approval' || po.status === 'pending_review') return (isOwner && po.reviewRoleId === null) || userRoleIds.includes(po.reviewRoleId as string);
      return false;
    })
    .map(po => ({
      id: po.poNumber || po.id.split('-')[0].toUpperCase() + '-' + po.id.substring(1, 5),
      realId: po.id,
      amount: Number(po.cashierBillAmount || po.totalAmount || 0),
      vendorName: po.vendorName || 'Unknown Vendor',
      publicToken: po.publicToken,
      vendorPhone: po.vendorPhone,
      poDeliveryMethod: po.poDeliveryMethod,
      poWhatsappPreference: po.poWhatsappPreference,
      whatsappPoTemplate: po.whatsappPoTemplate,
      cashierBillAmount: po.cashierBillAmount,
      cashierAttachments: po.cashierAttachments,
      processOwnerAttachments: po.processOwnerAttachments,
      status: po.status,
    }));

  const pendingRoutineTasks = recentTasks
    .filter(t => {
      if (t.status !== 'in_progress' && t.status !== 'pending') return false;
      // Belongs to the user if assigned directly or assigned to one of their active roles
      const isAssigned = (userId && t.assignedUserId === userId) ||
        (t.assignedRoleId && userRoleIds.includes(t.assignedRoleId));
      return isAssigned;
    })
    .map(t => {
      const ctx = t.contextData as any;
      return {
        id: `TASK-${t.id.substring(0, 5).toUpperCase()}`,
        realId: t.id,
        title: ctx.title || ctx.vendorName || 'Routine Task',
        vendorName: ctx.vendorName || null,
        status: t.status,
        dueAt: t.dueAt ? new Date(t.dueAt).toISOString() : null,
        actionUrl: ctx.actionUrl || null,
      };
    });

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
    pendingRoutineTasks,
    charts: {
      spendTrendData: spendTrendData.length > 0 ? spendTrendData : [{ name: 'Jan', spend: 0 }],
      categoryData: categoryData.length > 0 && categoryData[0]?.value ? categoryData : [{ name: 'General', value: 0 }],
    }
  };
}
