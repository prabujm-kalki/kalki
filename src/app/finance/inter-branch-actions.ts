"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { 
  journalLineItems, 
  journalEntries, 
  accountingMappings, 
  locations, 
  accounts, 
  accountGroups, 
  accountTypes 
} from "@/db/schema";
import { eq, and, sum } from "drizzle-orm";
import { postManualJournal } from "./actions";

async function getAuthSession() {
  const reqHeaders = await headers();
  return await auth.api.getSession({ headers: reqHeaders });
}

/**
 * Ensures that INTER_BRANCH_RECEIVABLE and INTER_BRANCH_PAYABLE accounts and mappings
 * exist for the organization. Automatically creates them if not already configured.
 */
export async function ensureInterBranchSetup(organizationId: string) {
  // 1. Check existing mappings
  const existingMappings = await db.select().from(accountingMappings).where(
    and(
      eq(accountingMappings.organizationId, organizationId),
      eq(accountingMappings.mappingType, "SYSTEM_DEFAULT")
    )
  );

  let recMapping = existingMappings.find(
    m => m.sourceReferenceId === "INTER_BRANCH_RECEIVABLE" && (m.sourceModule === "SYSTEM" || m.sourceModule === "MANUAL")
  );
  let payMapping = existingMappings.find(
    m => m.sourceReferenceId === "INTER_BRANCH_PAYABLE" && (m.sourceModule === "SYSTEM" || m.sourceModule === "MANUAL")
  );

  if (recMapping && payMapping) {
    return { recMapping, payMapping };
  }

  // 2. Locate or create Receivable Account (Code: 1290)
  let recAccount = (await db.select().from(accounts).where(
    and(eq(accounts.organizationId, organizationId), eq(accounts.code, "1290"))
  ))[0];

  if (!recAccount) {
    // Look up or fallback to an asset group
    let assetGroup = (await db.select().from(accountGroups).where(
      and(eq(accountGroups.organizationId, organizationId), eq(accountGroups.code, "1200"))
    ))[0];

    if (!assetGroup) {
      let assetType = (await db.select().from(accountTypes).where(
        and(eq(accountTypes.organizationId, organizationId), eq(accountTypes.category, "ASSET"))
      ))[0];

      if (!assetType) {
        const [newType] = await db.insert(accountTypes).values({
          organizationId,
          name: "Assets",
          category: "ASSET",
        }).returning();
        assetType = newType;
      }

      const [newGroup] = await db.insert(accountGroups).values({
        organizationId,
        accountTypeId: assetType.id,
        name: "Receivables",
        code: "1200",
      }).returning();
      assetGroup = newGroup;
    }

    const [newRecAcc] = await db.insert(accounts).values({
      organizationId,
      accountGroupId: assetGroup.id,
      name: "Inter-Branch Receivable",
      code: "1290",
      isSystemAccount: true,
      description: "Asset clearing account for inter-branch funds and stock transfers",
    }).returning();
    recAccount = newRecAcc;
  }

  // 3. Locate or create Payable Account (Code: 2190)
  let payAccount = (await db.select().from(accounts).where(
    and(eq(accounts.organizationId, organizationId), eq(accounts.code, "2190"))
  ))[0];

  if (!payAccount) {
    let liabGroup = (await db.select().from(accountGroups).where(
      and(eq(accountGroups.organizationId, organizationId), eq(accountGroups.code, "2100"))
    ))[0];

    if (!liabGroup) {
      let liabType = (await db.select().from(accountTypes).where(
        and(eq(accountTypes.organizationId, organizationId), eq(accountTypes.category, "LIABILITY"))
      ))[0];

      if (!liabType) {
        const [newType] = await db.insert(accountTypes).values({
          organizationId,
          name: "Liabilities",
          category: "LIABILITY",
        }).returning();
        liabType = newType;
      }

      const [newGroup] = await db.insert(accountGroups).values({
        organizationId,
        accountTypeId: liabType.id,
        name: "Accounts Payable",
        code: "2100",
      }).returning();
      liabGroup = newGroup;
    }

    const [newPayAcc] = await db.insert(accounts).values({
      organizationId,
      accountGroupId: liabGroup.id,
      name: "Inter-Branch Payable",
      code: "2190",
      isSystemAccount: true,
      description: "Liability clearing account for inter-branch funds and stock transfers",
    }).returning();
    payAccount = newPayAcc;
  }

  // 4. Create missing mappings for SYSTEM module
  if (!recMapping) {
    const [insertedRec] = await db.insert(accountingMappings).values({
      organizationId,
      sourceModule: "SYSTEM",
      mappingType: "SYSTEM_DEFAULT",
      sourceReferenceId: "INTER_BRANCH_RECEIVABLE",
      accountId: recAccount.id,
    }).onConflictDoUpdate({
      target: [
        accountingMappings.organizationId,
        accountingMappings.sourceModule,
        accountingMappings.mappingType,
        accountingMappings.sourceReferenceId
      ],
      set: { accountId: recAccount.id, isActive: true }
    }).returning();
    recMapping = insertedRec;
  }

  if (!payMapping) {
    const [insertedPay] = await db.insert(accountingMappings).values({
      organizationId,
      sourceModule: "SYSTEM",
      mappingType: "SYSTEM_DEFAULT",
      sourceReferenceId: "INTER_BRANCH_PAYABLE",
      accountId: payAccount.id,
    }).onConflictDoUpdate({
      target: [
        accountingMappings.organizationId,
        accountingMappings.sourceModule,
        accountingMappings.mappingType,
        accountingMappings.sourceReferenceId
      ],
      set: { accountId: payAccount.id, isActive: true }
    }).returning();
    payMapping = insertedPay;
  }

  return { recMapping, payMapping };
}

export async function fetchInterBranchBalances(organizationId: string) {
  const session = await getAuthSession();
  if (!session?.user) throw new Error("Unauthorized");

  try {
    const allLocations = await db.select().from(locations).where(eq(locations.organizationId, organizationId));

    // Ensure setup is present before fetching positions
    const { recMapping, payMapping } = await ensureInterBranchSetup(organizationId);

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

/**
 * Executes an Inter-Branch Fund Transfer between two branches.
 * Automatically ensures inter-branch setup and triggers the automated
 * dual-entry inter-branch clearing engine via postManualJournal.
 */
export async function executeInterBranchTransfer(input: {
  organizationId: string;
  sourceLocationId: string;
  sourceAccountId: string;
  targetLocationId: string;
  targetAccountId: string;
  amount: number;
  narration?: string;
  transferDate?: string;
}) {
  const session = await getAuthSession();
  if (!session?.user) throw new Error("Unauthorized");

  try {
    if (input.sourceLocationId === input.targetLocationId) {
      return { success: false, error: "Source and destination branches must be different. Use internal Contra Transfer for intra-branch transfers." };
    }

    if (input.amount <= 0 || isNaN(input.amount)) {
      return { success: false, error: "Transfer amount must be greater than zero." };
    }

    // Ensure system accounts and mappings are ready
    await ensureInterBranchSetup(input.organizationId);

    const transferDate = input.transferDate ? new Date(input.transferDate) : new Date();
    const narration = input.narration?.trim() || "Inter-Branch Fund Transfer";

    // Post manual journal with cross-location lines.
    // The accounting event-engine will detect the location imbalance and automatically 
    // inject INTER_BRANCH_RECEIVABLE for the sending branch and INTER_BRANCH_PAYABLE for the receiving branch.
    const result = await postManualJournal({
      organizationId: input.organizationId,
      locationId: input.sourceLocationId,
      category: "CONTRA",
      entryDate: transferDate,
      narration: `[Inter-Branch Transfer] ${narration}`,
      lines: [
        {
          accountId: input.targetAccountId,
          isDebit: true,
          amount: input.amount,
          locationId: input.targetLocationId,
          narration: `Transfer In from source branch`,
        },
        {
          accountId: input.sourceAccountId,
          isDebit: false,
          amount: input.amount,
          locationId: input.sourceLocationId,
          narration: `Transfer Out to destination branch`,
        },
      ],
    });

    return result;
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to execute inter-branch transfer" };
  }
}

