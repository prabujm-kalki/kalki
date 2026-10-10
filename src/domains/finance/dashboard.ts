import { db } from "@/db";
import { journalEntries, journalLineItems, accounts } from "@/db/schema";
import { eq, desc, and, sql, inArray, asc, isNull, or, isNotNull } from "drizzle-orm";
import { authorizeEmployeeOperation } from "@/lib/authorization";
import { employeePermissions } from "@/lib/authorization-policy";
import { getAsOfBalances, getPeriodBalances, getAccountsBySystemCategory, LedgerContext, PeriodContext } from "./ledger";

type Actor = { id: string } | null;

export async function getFinanceDashboardMetrics(
  actor: Actor,
  organizationId: string,
  locationId: string,
  periodFilter?: { startDate?: string; endDate?: string }
) {
  if (!actor) throw new Error("Authentication required");

  const allowed = await authorizeEmployeeOperation({
    userId: actor.id,
    organizationId,
    locationId: locationId === "ALL" ? "" : locationId, // Fix string | undefined
    permission: "finance.dashboard:read",
  });
  if (!allowed) throw new Error("Access denied");

  const ledgerCtx: LedgerContext = { organizationId, locationId };
  // Default to today if no end date provided for asOf queries
  const today = new Date().toISOString().split('T')[0];
  const asOfDate = periodFilter?.endDate || today;
  
  const periodCtx: PeriodContext = { 
    startDate: periodFilter?.startDate, 
    endDate: asOfDate, 
    asOfDate 
  };

  // --- 1. Fetch Account Mappings (Control Accounts & System Categories) ---
  
  // AR & AP Control Accounts
  const arAccounts = await db.select({ id: accounts.id }).from(accounts).where(
    and(eq(accounts.organizationId, organizationId), eq(accounts.controlAccountType, 'CUSTOMER_RECEIVABLE'))
  );
  const apAccounts = await db.select({ id: accounts.id }).from(accounts).where(
    and(eq(accounts.organizationId, organizationId), eq(accounts.controlAccountType, 'VENDOR_PAYABLE'))
  );
  
  const arAccountIds = arAccounts.map(a => a.id);
  const apAccountIds = apAccounts.map(a => a.id);

  // System Categories for P&L and Cash
  const cashAccountIds = await getAccountsBySystemCategory(organizationId, 'BANK_CASH');
  const revenueAccountIds = await getAccountsBySystemCategory(organizationId, 'REVENUE');
  const cogsAccountIds = await getAccountsBySystemCategory(organizationId, 'COGS');
  const opexAccountIds = await getAccountsBySystemCategory(organizationId, 'OPERATING_EXPENSE');

  // --- 2. Calculate As-Of Balances (Balance Sheet) ---
  const cashBal = await getAsOfBalances(ledgerCtx, asOfDate, cashAccountIds);
  const arBal = await getAsOfBalances(ledgerCtx, asOfDate, arAccountIds);
  const apBal = await getAsOfBalances(ledgerCtx, asOfDate, apAccountIds);

  // Normal balances: Cash (Asset) = Dr - Cr, AR (Asset) = Dr - Cr, AP (Liability) = Cr - Dr
  const cashBalance = cashBal.debit - cashBal.credit;
  const receivablesBalance = arBal.debit - arBal.credit;
  const payablesBalance = apBal.credit - apBal.debit;

  // --- 3. Calculate Period Balances (P&L) ---
  const revBal = await getPeriodBalances(ledgerCtx, periodCtx, revenueAccountIds);
  const cogsBal = await getPeriodBalances(ledgerCtx, periodCtx, cogsAccountIds);
  const opexBal = await getPeriodBalances(ledgerCtx, periodCtx, opexAccountIds);

  // Normal balances: Revenue = Cr - Dr, COGS/Expense = Dr - Cr
  const revenue = revBal.credit - revBal.debit;
  const cogs = cogsBal.debit - cogsBal.credit;
  const operatingExpenses = opexBal.debit - opexBal.credit;

  // Derived Metrics
  const grossProfit = revenue - cogs;
  const operatingProfit = grossProfit - operatingExpenses;
  // --- 3.5 Calculate Prior Period Comparisons ---
  const currStart = periodCtx.startDate ? new Date(periodCtx.startDate) : (() => {
    const d = new Date(asOfDate);
    return new Date(d.getFullYear(), d.getMonth(), 1); 
  })();
  const currEnd = new Date(asOfDate);
  const durationMs = currEnd.getTime() - currStart.getTime();
  const priorEnd = new Date(currStart.getTime() - 24 * 60 * 60 * 1000);
  const priorStart = new Date(priorEnd.getTime() - durationMs);
  
  const priorPeriodCtx: PeriodContext = {
    startDate: priorStart.toISOString().split('T')[0],
    endDate: priorEnd.toISOString().split('T')[0],
    asOfDate: priorEnd.toISOString().split('T')[0]
  };

  const pCash = await getAsOfBalances(ledgerCtx, priorPeriodCtx.asOfDate!, cashAccountIds);
  const pAr = await getAsOfBalances(ledgerCtx, priorPeriodCtx.asOfDate!, arAccountIds);
  const pAp = await getAsOfBalances(ledgerCtx, priorPeriodCtx.asOfDate!, apAccountIds);
  const pRevBal = await getPeriodBalances(ledgerCtx, priorPeriodCtx, revenueAccountIds);
  const pCogsBal = await getPeriodBalances(ledgerCtx, priorPeriodCtx, cogsAccountIds);
  const pOpexBal = await getPeriodBalances(ledgerCtx, priorPeriodCtx, opexAccountIds);

  const pRevenue = pRevBal.credit - pRevBal.debit;
  const pCogs = pCogsBal.debit - pCogsBal.credit;
  const pExpenses = pOpexBal.debit - pOpexBal.credit;
  const pGross = pRevenue - pCogs;
  const pOperating = pGross - pExpenses;

  const getPct = (curr: number, prev: number) => {
    if (prev === 0) return curr === 0 ? undefined : (curr > 0 ? 100 : -100);
    return ((curr - prev) / Math.abs(prev)) * 100;
  };

  const comparisons = {
    cashBalancePct: getPct(cashBalance, pCash.debit - pCash.credit),
    receivablesBalancePct: getPct(receivablesBalance, pAr.debit - pAr.credit),
    payablesBalancePct: getPct(payablesBalance, pAp.credit - pAp.debit),
    revenuePct: getPct(revenue, pRevenue),
    expensesPct: getPct(operatingExpenses, pExpenses),
    grossProfitPct: getPct(grossProfit, pGross),
    operatingProfitPct: getPct(operatingProfit, pOperating)
  };

  // --- 3.6 Trend Data (SQL Aggregate replacing slow Materialized Views) ---
  const nilUuid = '00000000-0000-0000-0000-000000000000';
  const revIds = revenueAccountIds.length ? revenueAccountIds : [nilUuid];
  const expIds = [...cogsAccountIds, ...opexAccountIds];
  const expIdsSafe = expIds.length ? expIds : [nilUuid];
  const cogsIdsSafe = cogsAccountIds.length ? cogsAccountIds : [nilUuid];
  
  let trendResult: any[] = [];
  try {
    trendResult = await db.select({
      name: sql<string>`to_char(${journalEntries.entryDate}, 'Mon')`,
      month_sort: sql<string>`to_char(${journalEntries.entryDate}, 'YYYY-MM')`,
      revenue: sql<number>`SUM(CASE WHEN ${inArray(journalLineItems.accountId, revIds)} THEN ${journalLineItems.credit} - ${journalLineItems.debit} ELSE 0 END)`,
      expense: sql<number>`SUM(CASE WHEN ${inArray(journalLineItems.accountId, expIdsSafe)} THEN ${journalLineItems.debit} - ${journalLineItems.credit} ELSE 0 END)`,
      profit: sql<number>`(SUM(CASE WHEN ${inArray(journalLineItems.accountId, revIds)} THEN ${journalLineItems.credit} - ${journalLineItems.debit} ELSE 0 END) 
        - SUM(CASE WHEN ${inArray(journalLineItems.accountId, expIdsSafe)} THEN ${journalLineItems.debit} - ${journalLineItems.credit} ELSE 0 END))`,
      grossProfit: sql<number>`(SUM(CASE WHEN ${inArray(journalLineItems.accountId, revIds)} THEN ${journalLineItems.credit} - ${journalLineItems.debit} ELSE 0 END) 
        - SUM(CASE WHEN ${inArray(journalLineItems.accountId, cogsIdsSafe)} THEN ${journalLineItems.debit} - ${journalLineItems.credit} ELSE 0 END))`
    })
    .from(journalEntries)
    .innerJoin(journalLineItems, eq(journalEntries.id, journalLineItems.journalEntryId))
    .where(and(
      eq(journalEntries.organizationId, organizationId),
      eq(journalEntries.status, "POSTED"),
      locationId !== 'ALL' ? eq(journalLineItems.locationId, locationId) : undefined,
      sql`${journalEntries.entryDate} >= current_date - interval '6 months'`
    ))
    .groupBy(sql`to_char(${journalEntries.entryDate}, 'Mon')`, sql`to_char(${journalEntries.entryDate}, 'YYYY-MM')`)
    .orderBy(asc(sql`to_char(${journalEntries.entryDate}, 'YYYY-MM')`));
  } catch (err: any) {
    console.error("TREND QUERY FAILED WITH ERROR:", err);
    throw new Error(`Trend Query Postgres Error: ${err.message}`);
  }
  const rows = trendResult;
  const trendData = (rows as any[]).map(r => ({
    name: r.name,
    revenue: Number(r.revenue || 0),
    expense: Number(r.expense || 0),
    profit: Number(r.profit || 0),
    grossProfit: Number(r.grossProfit || 0)
  }));
  // --- 4. Alerts & Action Items ---
  // Pending Approvals (Unified Inbox from task_instances)
  // Requires importing taskInstances from schema
  const { taskInstances } = await import("@/db/schema");
  
  const pendingConditions = [
    eq(taskInstances.organizationId, organizationId),
    eq(taskInstances.status, "pending")
  ];

  if (actor) {
    pendingConditions.push(eq(taskInstances.assignedUserId, actor.id));
    // For a real app, also check assignedToRoleId if actor has roles
  }

  const [{ count: unifiedInboxCount }] = await db
    .select({ count: sql`count(*)`.mapWith(Number) })
    .from(taskInstances)
    .where(and(...pendingConditions));

  // Drafts (Unposted Entries)
  const [{ count: draftCount }] = await db
    .select({ count: sql`count(*)`.mapWith(Number) })
    .from(journalEntries)
    .where(
      and(
        eq(journalEntries.organizationId, organizationId),
        eq(journalEntries.status, "DRAFT")
      )
    );
    
  // Placeholders for cross-module features not yet fully implemented in schema
  const unreconciledBankFeeds = 0;
  const unsettledInterBranch = 0;
  const overdueCustomerInvoices = 0;
  const overdueVendorBills = 0;

  // Fetch user role ids
  const { purchaseOrders, locationRoleAssignments, organizationRoleAssignments } = await import("@/db/schema");
  let userRoleIds: string[] = [];
  let isSystemOwner = false;
  if (actor) {
    const { loadAuthorizationGrants } = await import("@/lib/authorization");
    const grants = await loadAuthorizationGrants(actor.id);
    isSystemOwner = grants.isOwner;
    
    // Check location roles
    let queryConds = [eq(locationRoleAssignments.userId, actor.id), eq(locationRoleAssignments.organizationId, organizationId)];
    if (locationId !== "ALL") {
      queryConds.push(eq(locationRoleAssignments.locationId, locationId));
    }
    const locRoles = await db
      .select({ roleId: locationRoleAssignments.roleId })
      .from(locationRoleAssignments)
      .where(and(...queryConds));
      
    // Check organization roles
    const orgRoles = await db
      .select({ roleId: organizationRoleAssignments.roleId })
      .from(organizationRoleAssignments)
      .where(and(
        eq(organizationRoleAssignments.userId, actor.id), 
        eq(organizationRoleAssignments.organizationId, organizationId)
      ));
      
    userRoleIds = [...locRoles.map(r => r.roleId), ...orgRoles.map(r => r.roleId)];
  }

  const auditConditions = [
    eq(purchaseOrders.organizationId, organizationId),
    inArray(purchaseOrders.status, ["received", "audited"])
  ];
  if (isSystemOwner) {
    const ownerOrConds = [
      eq(purchaseOrders.status, 'audited'),
      isNull(purchaseOrders.billReviewRoleId)
    ];
    if (userRoleIds.length > 0) ownerOrConds.push(inArray(purchaseOrders.billReviewRoleId, userRoleIds));
    auditConditions.push(or(...ownerOrConds)!);
  } else if (userRoleIds.length > 0) {
    auditConditions.push(or(isNull(purchaseOrders.billReviewRoleId), inArray(purchaseOrders.billReviewRoleId, userRoleIds))!);
  } else if (actor) {
    auditConditions.push(isNull(purchaseOrders.billReviewRoleId));
  }

  const [{ count: auditCount }] = await db
    .select({ count: sql`count(*)`.mapWith(Number) })
    .from(purchaseOrders)
    .where(and(...auditConditions));

  const billsConditions = [
    eq(purchaseOrders.organizationId, organizationId),
    eq(purchaseOrders.status, "accounts_pending")
  ];
  if (isSystemOwner) {
    const sysOwnerOrConds = [
      isNull(purchaseOrders.billReviewRoleId),
      eq(purchaseOrders.status, 'accounts_pending') // System owner sees all bills
    ];
    if (userRoleIds.length > 0) sysOwnerOrConds.push(inArray(purchaseOrders.billReviewRoleId, userRoleIds));
    billsConditions.push(or(...sysOwnerOrConds)!);
  } else if (userRoleIds.length > 0) {
    billsConditions.push(or(isNull(purchaseOrders.billReviewRoleId), inArray(purchaseOrders.billReviewRoleId, userRoleIds))!);
  } else if (actor) {
    billsConditions.push(isNull(purchaseOrders.billReviewRoleId));
  }

  const [{ count: pendingBillsCount }] = await db
    .select({ count: sql`count(*)`.mapWith(Number) })
    .from(purchaseOrders)
    .where(and(...billsConditions));

  // --- 5. Recent Transactions ---
  const recentEntries = await db
    .select()
    .from(journalEntries)
    .where(
      and(
        eq(journalEntries.organizationId, organizationId),
        eq(journalEntries.status, "POSTED")
      )
    )
    .orderBy(desc(journalEntries.entryDate))
    .limit(8); // As per requirement: 5-8 records

  const enrichedEntries = await Promise.all(
    recentEntries.map(async (entry) => {
      const lines = await db
        .select()
        .from(journalLineItems)
        .where(eq(journalLineItems.journalEntryId, entry.id));
      
      const formattedLines = lines.map(l => {
        const debit = parseFloat(l.debit);
        const credit = parseFloat(l.credit);
        const isDebit = debit > 0;
        return {
          id: l.id,
          isDebit,
          amount: isDebit ? debit : credit,
          narration: l.narration
        };
      });

      return { ...entry, lines: formattedLines };
    })
  );

  return {
    // Financial Position
    cashBalance,
    receivablesBalance,
    payablesBalance,
    // Performance
    revenue,
    cogs,
    grossProfit,
    operatingExpenses,
    operatingProfit,
    // Alerts
    pendingApprovals: unifiedInboxCount,
    pendingAudits: auditCount,
    pendingBills: pendingBillsCount,
    drafts: draftCount,
    unreconciledBankFeeds,
    unsettledInterBranch,
    overdueCustomerInvoices,
    overdueVendorBills,
    // Ticker
    recentEntries: enrichedEntries,
    // Dynamics
    comparisons,
    trendData,
  };
}
