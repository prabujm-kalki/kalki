import { db } from "@/db";
import { 
  accountingMappings, 
  journalEntries, 
  journalLineItems 
} from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { AccountingEventPayload, ManualJournalPayload, AccountingError } from "./types";
import { randomUUID } from "crypto";

/**
 * Core Accounting Event Engine
 * Processes operational events and converts them into immutable double-entry ledger records.
 */
export async function processAccountingEvent(payload: AccountingEventPayload) {
  // 1. Validate Double Entry Principle
  const totalDebit = payload.lines
    .filter(l => l.isDebit)
    .reduce((sum, l) => sum + l.amount, 0);
    
  const totalCredit = payload.lines
    .filter(l => !l.isDebit)
    .reduce((sum, l) => sum + l.amount, 0);

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new AccountingError(`Double entry mismatch: Debits (${totalDebit}) do not equal Credits (${totalCredit})`);
  }

  if (totalDebit <= 0) {
    throw new AccountingError("Transaction amount must be greater than zero");
  }

  // 2. Wrap everything in a transaction to guarantee atomicity
  return await db.transaction(async (tx) => {
    
    const entryId = randomUUID();
    
    // 3. Create the Journal Entry Header
    // TODO: In a production scenario, entryNumber should be generated using a sequence table
    const entryNumber = `JE-${Date.now().toString().slice(-6)}`;
    
    await tx.insert(journalEntries).values({
      id: entryId,
      organizationId: payload.organizationId,
      entryNumber,
      entryDate: payload.entryDate.toISOString().split('T')[0],
      narration: payload.narration,
      sourceModule: payload.sourceModule,
      sourceReferenceId: payload.sourceReferenceId,
      totalAmount: totalDebit.toString(),
      status: "POSTED", // Auto-posted since it comes from an operational source
      createdById: payload.triggeredByUserId,
    });

    // 4. Resolve Mappings and Insert Line Items
    const branchImbalances: Record<string, number> = {};

    for (const line of payload.lines) {
      // Find the mapped account for this operational item
      const mappings = await tx.select().from(accountingMappings).where(
        and(
          eq(accountingMappings.organizationId, payload.organizationId),
          eq(accountingMappings.sourceModule, payload.sourceModule),
          eq(accountingMappings.mappingType, line.mappingType),
          eq(accountingMappings.sourceReferenceId, line.sourceReferenceId)
        )
      ).limit(1);
      const mapping = mappings[0];

      if (!mapping) {
        throw new AccountingError(
          `Missing accounting mapping for Module: ${payload.sourceModule}, Type: ${line.mappingType}, Ref: ${line.sourceReferenceId}`
        );
      }

      const lineLocationId = line.locationId || payload.locationId;
      
      if (!branchImbalances[lineLocationId]) branchImbalances[lineLocationId] = 0;
      if (line.isDebit) {
        branchImbalances[lineLocationId] -= line.amount;
      } else {
        branchImbalances[lineLocationId] += line.amount;
      }

      await tx.insert(journalLineItems).values({
        id: randomUUID(),
        journalEntryId: entryId,
        accountId: mapping.accountId,
        locationId: lineLocationId, // Branch Tagging Enforcement
        debit: line.isDebit ? line.amount.toString() : "0",
        credit: !line.isDebit ? line.amount.toString() : "0",
        narration: line.narration || null,
      });
    }

    // 5. Automated Inter-Branch Clearing
    // If a branch has a net imbalance (Debits != Credits), it means funds/value was transferred.
    for (const [locId, imbalance] of Object.entries(branchImbalances)) {
      if (Math.abs(imbalance) > 0.01) {
        const isDebit = imbalance > 0; // If Credits > Debits, we need a Debit to balance it
        const refId = isDebit ? "INTER_BRANCH_RECEIVABLE" : "INTER_BRANCH_PAYABLE";
        
        let clearingMappings = await tx.select().from(accountingMappings).where(
          and(
            eq(accountingMappings.organizationId, payload.organizationId),
            eq(accountingMappings.sourceModule, payload.sourceModule),
            eq(accountingMappings.mappingType, "SYSTEM_DEFAULT"),
            eq(accountingMappings.sourceReferenceId, refId)
          )
        ).limit(1);
        let clearingMapping = clearingMappings[0];

        // Fallback to global SYSTEM module mapping if not defined for this specific module
        if (!clearingMapping) {
          clearingMappings = await tx.select().from(accountingMappings).where(
            and(
              eq(accountingMappings.organizationId, payload.organizationId),
              eq(accountingMappings.sourceModule, "SYSTEM"),
              eq(accountingMappings.mappingType, "SYSTEM_DEFAULT"),
              eq(accountingMappings.sourceReferenceId, refId)
            )
          ).limit(1);
          clearingMapping = clearingMappings[0];
        }

        if (!clearingMapping) {
          throw new AccountingError(
            `Missing inter-branch clearing mapping. Please configure SYSTEM_DEFAULT for ${refId} under SYSTEM module.`
          );
        }

        await tx.insert(journalLineItems).values({
          id: randomUUID(),
          journalEntryId: entryId,
          accountId: clearingMapping.accountId,
          locationId: locId,
          debit: isDebit ? Math.abs(imbalance).toString() : "0",
          credit: !isDebit ? Math.abs(imbalance).toString() : "0",
          narration: "Automated Inter-Branch Clearing",
        });
      }
    }

    return entryId;
  });
}

/**
 * Manual Journal Entry Processor
 * Bypasses operational mappings and posts directly to Ledger Accounts,
 * while strictly enforcing Double Entry and Branch Clearing rules.
 */
export async function processManualJournalEntry(payload: ManualJournalPayload) {
  // 1. Validate Double Entry Principle
  const totalDebit = payload.lines
    .filter(l => l.isDebit)
    .reduce((sum, l) => sum + l.amount, 0);
    
  const totalCredit = payload.lines
    .filter(l => !l.isDebit)
    .reduce((sum, l) => sum + l.amount, 0);

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new AccountingError(`Double entry mismatch: Debits (${totalDebit}) do not equal Credits (${totalCredit})`);
  }

  if (totalDebit <= 0) {
    throw new AccountingError("Transaction amount must be greater than zero");
  }

  // Enforce Maker-Checker Flow: Entries > 1,000,000 require approval
  const status = totalDebit > 1000000 ? "PENDING_APPROVAL" : "POSTED";

  return await db.transaction(async (tx) => {
    const entryId = randomUUID();
    const entryNumber = `MJ-${Date.now().toString().slice(-6)}`;
    
    await tx.insert(journalEntries).values({
      id: entryId,
      organizationId: payload.organizationId,
      entryNumber,
      entryDate: payload.entryDate.toISOString().split('T')[0],
      narration: `[${payload.category}] ${payload.narration}`,
      sourceModule: "MANUAL",
      sourceReferenceId: payload.category, // Use category as reference
      totalAmount: totalDebit.toString(),
      status, 
      createdById: payload.triggeredByUserId,
    });

    const branchImbalances: Record<string, number> = {};

    for (const line of payload.lines) {
      const lineLocationId = line.locationId || payload.locationId;
      
      if (!branchImbalances[lineLocationId]) branchImbalances[lineLocationId] = 0;
      if (line.isDebit) {
        branchImbalances[lineLocationId] -= line.amount;
      } else {
        branchImbalances[lineLocationId] += line.amount;
      }

      await tx.insert(journalLineItems).values({
        id: randomUUID(),
        journalEntryId: entryId,
        accountId: line.accountId, // Directly use the provided Account UUID
        locationId: lineLocationId,
        debit: line.isDebit ? line.amount.toString() : "0",
        credit: !line.isDebit ? line.amount.toString() : "0",
        narration: line.narration || null,
      });
    }

    // Automated Inter-Branch Clearing
    for (const [locId, imbalance] of Object.entries(branchImbalances)) {
      if (Math.abs(imbalance) > 0.01) {
        const isDebit = imbalance > 0; 
        const refId = isDebit ? "INTER_BRANCH_RECEIVABLE" : "INTER_BRANCH_PAYABLE";
        
        const clearingMappings = await tx.select().from(accountingMappings).where(
          and(
            eq(accountingMappings.organizationId, payload.organizationId),
            eq(accountingMappings.sourceModule, "SYSTEM"),
            eq(accountingMappings.mappingType, "SYSTEM_DEFAULT"),
            eq(accountingMappings.sourceReferenceId, refId)
          )
        ).limit(1);
        const clearingMapping = clearingMappings[0];

        if (!clearingMapping) {
          throw new AccountingError(
            `Missing inter-branch clearing mapping for Manual Journal. Please configure SYSTEM_DEFAULT for ${refId} under SYSTEM module.`
          );
        }

        await tx.insert(journalLineItems).values({
          id: randomUUID(),
          journalEntryId: entryId,
          accountId: clearingMapping.accountId,
          locationId: locId,
          debit: isDebit ? Math.abs(imbalance).toString() : "0",
          credit: !isDebit ? Math.abs(imbalance).toString() : "0",
          narration: "Automated Inter-Branch Clearing (Manual Journal)",
        });
      }
    }

    return entryId;
  });
}
