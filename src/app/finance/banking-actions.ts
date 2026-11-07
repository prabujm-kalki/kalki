"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { accounts, accountGroups, journalLineItems, journalEntries } from "@/db/schema";
import { eq, and, sql, sum } from "drizzle-orm";
import { postManualJournal } from "./actions";

async function getAuthSession() {
  const reqHeaders = await headers();
  return await auth.api.getSession({ headers: reqHeaders });
}

export async function fetchBankAccounts(organizationId: string, locationId: string) {
  const session = await getAuthSession();
  if (!session?.user) throw new Error("Unauthorized");

  try {
    // 1. Find Bank & Cash groups: code 1100 ("Cash & Cash Equivalents") or systemCategory / code "BANK_CASH"
    const groups = await db.select().from(accountGroups).where(
      and(
        eq(accountGroups.organizationId, organizationId),
        sql`(${accountGroups.code} = '1100' OR ${accountGroups.code} = 'BANK_CASH' OR ${accountGroups.systemCategory} = 'BANK_CASH')`
      )
    );

    let bankAccounts: any[] = [];

    if (groups.length > 0) {
      const groupIds = groups.map(g => g.id);
      bankAccounts = await db.select().from(accounts).where(
        and(
          eq(accounts.organizationId, organizationId),
          sql`${accounts.accountGroupId} = ANY(${groupIds})`
        )
      );
    } else {
      // Fallback: If no group matched specific code, look for accounts with code starting with 11 or BANK/CASH
      bankAccounts = await db.select().from(accounts).where(
        and(
          eq(accounts.organizationId, organizationId),
          sql`(${accounts.code} LIKE '11%' OR ${accounts.code} LIKE 'BANK%' OR ${accounts.code} LIKE 'CASH%')`
        )
      );
    }

    if (bankAccounts.length === 0) return { success: true, data: [] };

    // 3. Get balances for these accounts at the specified location
    const balances = await Promise.all(bankAccounts.map(async (acc) => {
      const result = await db.select({
        totalDebit: sum(journalLineItems.debit),
        totalCredit: sum(journalLineItems.credit)
      })
      .from(journalLineItems)
      .innerJoin(journalEntries, eq(journalEntries.id, journalLineItems.journalEntryId))
      .where(
        and(
          eq(journalEntries.organizationId, organizationId),
          eq(journalEntries.status, "POSTED"),
          eq(journalLineItems.accountId, acc.id),
          eq(journalLineItems.locationId, locationId)
        )
      );
      
      const debit = parseFloat((result[0]?.totalDebit as string) || "0");
      const credit = parseFloat((result[0]?.totalCredit as string) || "0");
      return {
        ...acc,
        balance: debit - credit // Asset account: Debit increases, Credit decreases
      };
    }));

    return { success: true, data: balances };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function processContraTransfer(input: {
  organizationId: string;
  locationId: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  narration: string;
}) {
  return await postManualJournal({
    organizationId: input.organizationId,
    locationId: input.locationId,
    category: "CONTRA",
    entryDate: new Date(),
    narration: input.narration || "Contra Transfer",
    lines: [
      {
        accountId: input.toAccountId,
        isDebit: true,
        amount: input.amount,
        locationId: input.locationId,
        narration: "Transfer In"
      },
      {
        accountId: input.fromAccountId,
        isDebit: false,
        amount: input.amount,
        locationId: input.locationId,
        narration: "Transfer Out"
      }
    ]
  });
}
