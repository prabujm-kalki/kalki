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
    // 1. Find the "Cash & Cash Equivalents" group (code 1100)
    const groups = await db.select().from(accountGroups).where(
      and(
        eq(accountGroups.organizationId, organizationId),
        eq(accountGroups.code, "1100")
      )
    ).limit(1);

    if (groups.length === 0) return { success: true, data: [] };
    const bankGroupId = groups[0].id;

    // 2. Fetch all accounts in this group
    const bankAccounts = await db.select().from(accounts).where(
      and(
        eq(accounts.organizationId, organizationId),
        eq(accounts.accountGroupId, bankGroupId)
      )
    );

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
