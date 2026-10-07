import { db } from "@/db";
import { journalEntries, journalLineItems, accounts, accountGroups } from "@/db/schema";
import { eq, and, sql, sum, lte, gte, inArray } from "drizzle-orm";

export type LedgerContext = {
  organizationId: string;
  locationId?: string; // If 'ALL' or undefined, fetches for all branches
};

export type PeriodContext = {
  startDate?: string;
  endDate?: string;
  asOfDate?: string;
};

/**
 * Builds the base conditions for querying the ledger.
 * This guarantees we only query POSTED entries for the correct organization and branch.
 */
function buildBaseLedgerConditions(context: LedgerContext) {
  const conditions = [
    eq(journalEntries.organizationId, context.organizationId),
    eq(journalEntries.status, "POSTED")
  ];

  if (context.locationId && context.locationId !== "ALL") {
    conditions.push(eq(journalLineItems.locationId, context.locationId));
  }

  return conditions;
}

/**
 * Calculates cumulative As-Of balances (Asset/Liability/Equity).
 * Example: Cash Balance, AR, AP up to a specific date.
 */
export async function getAsOfBalances(
  context: LedgerContext,
  asOfDate: string,
  accountIds: string[]
) {
  if (accountIds.length === 0) return { debit: 0, credit: 0 };

  const conditions = [
    ...buildBaseLedgerConditions(context),
    lte(journalEntries.entryDate, asOfDate),
    inArray(journalLineItems.accountId, accountIds)
  ];

  const result = await db
    .select({
      totalDebit: sum(journalLineItems.debit),
      totalCredit: sum(journalLineItems.credit)
    })
    .from(journalLineItems)
    .innerJoin(journalEntries, eq(journalEntries.id, journalLineItems.journalEntryId))
    .where(and(...conditions));

  const debit = parseFloat((result[0]?.totalDebit as string) || "0");
  const credit = parseFloat((result[0]?.totalCredit as string) || "0");

  return { debit, credit };
}

/**
 * Calculates Period balances (Revenue/Expense/COGS).
 * Bounded strictly by start and end dates.
 */
export async function getPeriodBalances(
  context: LedgerContext,
  period: PeriodContext,
  accountIds: string[]
) {
  if (accountIds.length === 0) return { debit: 0, credit: 0 };

  const conditions = [
    ...buildBaseLedgerConditions(context),
    inArray(journalLineItems.accountId, accountIds)
  ];

  if (period.startDate) {
    conditions.push(gte(journalEntries.entryDate, period.startDate));
  }
  if (period.endDate) {
    conditions.push(lte(journalEntries.entryDate, period.endDate));
  }

  const result = await db
    .select({
      totalDebit: sum(journalLineItems.debit),
      totalCredit: sum(journalLineItems.credit)
    })
    .from(journalLineItems)
    .innerJoin(journalEntries, eq(journalEntries.id, journalLineItems.journalEntryId))
    .where(and(...conditions));

  const debit = parseFloat((result[0]?.totalDebit as string) || "0");
  const credit = parseFloat((result[0]?.totalCredit as string) || "0");

  return { debit, credit };
}

/**
 * Helper to fetch accounts by System Category (e.g., COGS, REVENUE)
 */
export async function getAccountsBySystemCategory(organizationId: string, systemCategory: string) {
  // 1. Fetch ALL groups for the organization to build the hierarchy tree in memory
  // This is highly efficient since an org typically has < 200 groups.
  const allGroups = await db
    .select({ id: accountGroups.id, parentId: accountGroups.parentGroupId, systemCategory: accountGroups.systemCategory })
    .from(accountGroups)
    .where(eq(accountGroups.organizationId, organizationId));

  if (allGroups.length === 0) return [];

  // 2. Find the root groups that have the matching systemCategory
  const matchingRootGroups = allGroups.filter(g => g.systemCategory === systemCategory);
  if (matchingRootGroups.length === 0) return [];

  // 3. Traverse the tree to find all descendant group IDs
  const validGroupIds = new Set<string>();
  const queue = matchingRootGroups.map(g => g.id);

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (!validGroupIds.has(currentId)) {
      validGroupIds.add(currentId);
      // Find all children of this group and add to queue
      const children = allGroups.filter(g => g.parentId === currentId);
      queue.push(...children.map(c => c.id));
    }
  }

  const groupIdsArray = Array.from(validGroupIds);

  // 4. Fetch all accounts belonging to the resolved hierarchy
  const matchedAccounts = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(
      and(
        eq(accounts.organizationId, organizationId),
        inArray(accounts.accountGroupId, groupIdsArray)
      )
    );

  return matchedAccounts.map(a => a.id);
}

export async function getSubledgerEntries(
  context: LedgerContext,
  period: PeriodContext,
  controlAccountType: string
) {
  const { db } = await import("@/db");
  const { journalEntries, journalLineItems, accounts } = await import("@/db/schema");
  const { eq, and, desc, gte, lte } = await import("drizzle-orm");

  // 1. Find the exact control account for this type (e.g. CUSTOMER_RECEIVABLE)
  const accountResult = await db.select({ id: accounts.id }).from(accounts).where(
    and(
      eq(accounts.organizationId, context.organizationId), 
      eq(accounts.controlAccountType, controlAccountType)
    )
  ).limit(1);

  if (accountResult.length === 0) return [];
  const accountId = accountResult[0].id;

  // 2. Build strict ledger boundary conditions
  const conditions = [
    ...buildBaseLedgerConditions(context),
    eq(journalLineItems.accountId, accountId)
  ];

  if (period.startDate) conditions.push(gte(journalEntries.entryDate, period.startDate));
  if (period.endDate) conditions.push(lte(journalEntries.entryDate, period.endDate));

  // 3. Query all isolated subledger lines
  const result = await db
    .select({
      id: journalLineItems.id,
      journalEntryId: journalEntries.id,
      entryDate: journalEntries.entryDate,
      entryNumber: journalEntries.entryNumber,
      sourceModule: journalEntries.sourceModule,
      sourceReferenceId: journalEntries.sourceReferenceId,
      partyId: journalLineItems.partyId,
      narration: journalLineItems.narration,
      debit: journalLineItems.debit,
      credit: journalLineItems.credit,
    })
    .from(journalLineItems)
    .innerJoin(journalEntries, eq(journalEntries.id, journalLineItems.journalEntryId))
    .where(and(...conditions))
    .orderBy(desc(journalEntries.entryDate));

  return result;
}
