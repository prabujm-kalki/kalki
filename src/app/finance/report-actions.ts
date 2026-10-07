"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { accounts, accountGroups, journalLineItems, journalEntries, locations } from "@/db/schema";
import { eq, and, sql, sum, gte, lte } from "drizzle-orm";

async function getAuthSession() {
  const reqHeaders = await headers();
  return await auth.api.getSession({ headers: reqHeaders });
}

export async function fetchFinancialStatements(organizationId: string, locationId: string, startDate?: string, endDate?: string) {
  const session = await getAuthSession();
  if (!session?.user) throw new Error("Unauthorized");

  try {
    // Build the query conditions
    const conditions = [
      eq(journalEntries.organizationId, organizationId),
      eq(journalEntries.status, "POSTED")
    ];
    
    if (locationId && locationId !== "ALL") {
      conditions.push(eq(journalLineItems.locationId, locationId));
    }
    if (startDate) {
      conditions.push(gte(journalEntries.entryDate, startDate));
    }
    if (endDate) {
      conditions.push(lte(journalEntries.entryDate, endDate));
    }

    // 1. Fetch all accounts and groups to build the taxonomy
    const allGroups = await db.select().from(accountGroups).where(eq(accountGroups.organizationId, organizationId));
    const allAccounts = await db.select().from(accounts).where(eq(accounts.organizationId, organizationId));

    // 2. Fetch all aggregated journal lines
    const aggregatedLines = await db.select({
      accountId: journalLineItems.accountId,
      totalDebit: sum(journalLineItems.debit),
      totalCredit: sum(journalLineItems.credit)
    })
    .from(journalLineItems)
    .innerJoin(journalEntries, eq(journalEntries.id, journalLineItems.journalEntryId))
    .where(and(...conditions))
    .groupBy(journalLineItems.accountId);

    // 3. Map balances to accounts
    const accountBalances = allAccounts.map(acc => {
      const agg = aggregatedLines.find(l => l.accountId === acc.id);
      const debit = parseFloat((agg?.totalDebit as string) || "0");
      const credit = parseFloat((agg?.totalCredit as string) || "0");
      
      let balance = 0;
      let isDebitBalance = true;
      
      // Asset and Expense have Debit normal balances
      if (acc.accountType === "ASSET" || acc.accountType === "EXPENSE") {
        balance = debit - credit;
        isDebitBalance = true;
      } else {
        // Liability, Equity, Revenue have Credit normal balances
        balance = credit - debit;
        isDebitBalance = false;
      }

      return {
        ...acc,
        debitAmount: debit,
        creditAmount: credit,
        balance,
        isDebitBalance
      };
    }).filter(acc => acc.debitAmount > 0 || acc.creditAmount > 0 || acc.balance !== 0); // Only accounts with activity

    // 4. Structure Trial Balance
    const trialBalance = accountBalances;

    // 5. Structure Profit & Loss
    const revenueAccounts = accountBalances.filter(a => a.accountType === "REVENUE");
    const expenseAccounts = accountBalances.filter(a => a.accountType === "EXPENSE");
    const totalRevenue = revenueAccounts.reduce((sum, a) => sum + a.balance, 0);
    const totalExpense = expenseAccounts.reduce((sum, a) => sum + a.balance, 0);
    const netProfit = totalRevenue - totalExpense;

    // 6. Structure Balance Sheet
    const assetAccounts = accountBalances.filter(a => a.accountType === "ASSET");
    const liabilityAccounts = accountBalances.filter(a => a.accountType === "LIABILITY");
    const equityAccounts = accountBalances.filter(a => a.accountType === "EQUITY");
    
    // In a real accounting system, Net Profit rolls into Equity (Retained Earnings)
    // We will just return the raw accounts and compute the layout on the client side

    return { 
      success: true, 
      data: {
        trialBalance,
        pl: {
          revenue: revenueAccounts,
          expense: expenseAccounts,
          totalRevenue,
          totalExpense,
          netProfit
        },
        bs: {
          assets: assetAccounts,
          liabilities: liabilityAccounts,
          equity: equityAccounts,
          totalAssets: assetAccounts.reduce((s, a) => s + a.balance, 0),
          totalLiabilities: liabilityAccounts.reduce((s, a) => s + a.balance, 0),
          totalEquity: equityAccounts.reduce((s, a) => s + a.balance, 0) + netProfit // Add Net Profit to Equity for balance
        },
        groups: allGroups
      } 
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
