"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { journalLineItems, journalEntries, accountingMappings, locations } from "@/db/schema";
import { eq, and, sum, gte, lte } from "drizzle-orm";

async function getAuthSession() {
  const reqHeaders = await headers();
  return await auth.api.getSession({ headers: reqHeaders });
}

export async function fetchGSTSummary(organizationId: string, startDate: Date, endDate: Date) {
  const session = await getAuthSession();
  if (!session?.user) throw new Error("Unauthorized");

  try {
    const allLocations = await db.select().from(locations).where(eq(locations.organizationId, organizationId));

    // Get Account IDs for GST Input and Output
    const mappings = await db.select().from(accountingMappings).where(
      and(
        eq(accountingMappings.organizationId, organizationId),
        eq(accountingMappings.mappingType, "SYSTEM_DEFAULT")
      )
    );

    const inputMapping = mappings.find(m => m.sourceReferenceId === "GST_INPUT");
    const outputMapping = mappings.find(m => m.sourceReferenceId === "GST_OUTPUT");

    if (!inputMapping || !outputMapping) {
      return { success: false, error: "GST accounts not mapped." };
    }

    const branchTax = await Promise.all(allLocations.map(async (loc) => {
      // GST Input (Purchases) is usually Debited
      const inputResult = await db.select({
        totalDebit: sum(journalLineItems.debit),
        totalCredit: sum(journalLineItems.credit)
      })
      .from(journalLineItems)
      .innerJoin(journalEntries, eq(journalEntries.id, journalLineItems.journalEntryId))
      .where(
        and(
          eq(journalEntries.organizationId, organizationId),
          eq(journalEntries.status, "POSTED"),
          gte(journalEntries.entryDate, startDate.toISOString()),
          lte(journalEntries.entryDate, endDate.toISOString()),
          eq(journalLineItems.accountId, inputMapping.accountId),
          eq(journalLineItems.locationId, loc.id)
        )
      );

      // GST Output (Sales) is usually Credited
      const outputResult = await db.select({
        totalDebit: sum(journalLineItems.debit),
        totalCredit: sum(journalLineItems.credit)
      })
      .from(journalLineItems)
      .innerJoin(journalEntries, eq(journalEntries.id, journalLineItems.journalEntryId))
      .where(
        and(
          eq(journalEntries.organizationId, organizationId),
          eq(journalEntries.status, "POSTED"),
          gte(journalEntries.entryDate, startDate.toISOString()),
          lte(journalEntries.entryDate, endDate.toISOString()),
          eq(journalLineItems.accountId, outputMapping.accountId),
          eq(journalLineItems.locationId, loc.id)
        )
      );

      const inputDebit = parseFloat((inputResult[0]?.totalDebit as string) || "0");
      const inputCredit = parseFloat((inputResult[0]?.totalCredit as string) || "0");
      const inputBalance = inputDebit - inputCredit; // Asset (ITC)

      const outputDebit = parseFloat((outputResult[0]?.totalDebit as string) || "0");
      const outputCredit = parseFloat((outputResult[0]?.totalCredit as string) || "0");
      const outputBalance = outputCredit - outputDebit; // Liability

      return {
        location: loc,
        inputTax: inputBalance,
        outputTax: outputBalance,
        netTaxPayable: outputBalance - inputBalance // If positive, we pay govt. If negative, refund/carry forward
      };
    }));

    return { success: true, data: branchTax };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
