"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { journalLineItems, journalEntries, accountingMappings, locations } from "@/db/schema";
import { eq, and, sum } from "drizzle-orm";

async function getAuthSession() {
  const reqHeaders = await headers();
  return await auth.api.getSession({ headers: reqHeaders });
}

export async function fetchInterBranchBalances(organizationId: string) {
  const session = await getAuthSession();
  if (!session?.user) throw new Error("Unauthorized");

  try {
    const allLocations = await db.select().from(locations).where(eq(locations.organizationId, organizationId));

    // Get Account IDs for Inter-Branch clearing
    const mappings = await db.select().from(accountingMappings).where(
      and(
        eq(accountingMappings.organizationId, organizationId),
        eq(accountingMappings.mappingType, "SYSTEM_DEFAULT")
      )
    );

    const recMapping = mappings.find(m => m.sourceReferenceId === "INTER_BRANCH_RECEIVABLE");
    const payMapping = mappings.find(m => m.sourceReferenceId === "INTER_BRANCH_PAYABLE");

    if (!recMapping || !payMapping) {
      return { success: false, error: "Inter-branch mappings not configured." };
    }

    // We will find the net position of each branch. 
    // Receivable balance = Debit - Credit
    // Payable balance = Credit - Debit
    // Net Position = Receivable Balance - Payable Balance
    // A positive Net Position means the branch is owed money (Creditor)
    // A negative Net Position means the branch owes money (Debtor)

    const branchPositions = await Promise.all(allLocations.map(async (loc) => {
      const recResult = await db.select({
        totalDebit: sum(journalLineItems.debit),
        totalCredit: sum(journalLineItems.credit)
      })
      .from(journalLineItems)
      .innerJoin(journalEntries, eq(journalEntries.id, journalLineItems.journalEntryId))
      .where(
        and(
          eq(journalEntries.organizationId, organizationId),
          eq(journalEntries.status, "POSTED"),
          eq(journalLineItems.accountId, recMapping.accountId),
          eq(journalLineItems.locationId, loc.id)
        )
      );

      const payResult = await db.select({
        totalDebit: sum(journalLineItems.debit),
        totalCredit: sum(journalLineItems.credit)
      })
      .from(journalLineItems)
      .innerJoin(journalEntries, eq(journalEntries.id, journalLineItems.journalEntryId))
      .where(
        and(
          eq(journalEntries.organizationId, organizationId),
          eq(journalEntries.status, "POSTED"),
          eq(journalLineItems.accountId, payMapping.accountId),
          eq(journalLineItems.locationId, loc.id)
        )
      );

      const recDebit = parseFloat((recResult[0]?.totalDebit as string) || "0");
      const recCredit = parseFloat((recResult[0]?.totalCredit as string) || "0");
      const recBalance = recDebit - recCredit;

      const payDebit = parseFloat((payResult[0]?.totalDebit as string) || "0");
      const payCredit = parseFloat((payResult[0]?.totalCredit as string) || "0");
      const payBalance = payCredit - payDebit;

      return {
        location: loc,
        netPosition: recBalance - payBalance
      };
    }));

    return { success: true, data: branchPositions };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
