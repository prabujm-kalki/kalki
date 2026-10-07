"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { vendors, vendorLedger, supplierInvoices, accountingMappings, journalLineItems, journalEntries } from "@/db/schema";
import { eq, and, desc, sql, sum } from "drizzle-orm";

async function getAuthSession() {
  const reqHeaders = await headers();
  return await auth.api.getSession({ headers: reqHeaders });
}

export async function fetchVendorPayables(organizationId: string) {
  const session = await getAuthSession();
  if (!session?.user) throw new Error("Unauthorized");

  try {
    // Get all vendors and their latest balance
    const vendorList = await db.select().from(vendors).where(eq(vendors.organizationId, organizationId));
    
    // We can just get the sum of unpaid invoices or use vendorLedger
    const balances = await Promise.all(vendorList.map(async (v) => {
      const [latest] = await db.select({ balance: vendorLedger.balanceAfter })
        .from(vendorLedger)
        .where(and(
          eq(vendorLedger.organizationId, organizationId),
          eq(vendorLedger.vendorId, v.id)
        ))
        .orderBy(desc(vendorLedger.recordedAt))
        .limit(1);

      return {
        ...v,
        balance: latest ? parseFloat(latest.balance) : 0,
      };
    }));

    return { success: true, data: balances.filter(v => v.balance > 0) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function fetchReceivables(organizationId: string) {
  const session = await getAuthSession();
  if (!session?.user) throw new Error("Unauthorized");

  try {
    // 1. Find the Account ID for Accounts Receivable
    const mappings = await db.select().from(accountingMappings).where(
      and(
        eq(accountingMappings.organizationId, organizationId),
        eq(accountingMappings.sourceReferenceId, "ACCOUNTS_RECEIVABLE")
      )
    ).limit(1);
    
    if (mappings.length === 0) return { success: true, data: [] };
    const accountId = mappings[0].accountId;

    // 2. Sum debits and credits grouped by location
    const result = await db.select({
      locationId: journalLineItems.locationId,
      totalDebit: sum(journalLineItems.debit),
      totalCredit: sum(journalLineItems.credit)
    })
    .from(journalLineItems)
    .innerJoin(journalEntries, eq(journalEntries.id, journalLineItems.journalEntryId))
    .where(
      and(
        eq(journalEntries.organizationId, organizationId),
        eq(journalEntries.status, "POSTED"),
        eq(journalLineItems.accountId, accountId)
      )
    )
    .groupBy(journalLineItems.locationId);

    const receivables = result.map(r => {
      const debit = parseFloat((r.totalDebit as string) || "0");
      const credit = parseFloat((r.totalCredit as string) || "0");
      return {
        locationId: r.locationId,
        balance: debit - credit // Asset account, normal balance is Debit
      };
    }).filter(r => r.balance > 0);

    return { success: true, data: receivables };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
