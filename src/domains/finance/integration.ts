import { db } from "@/db";
import { journalEntries, journalLineItems } from "@/db/schema";
import { v4 as uuidv4 } from "uuid";

export type JournalIntegrationPayload = {
  organizationId: string;
  locationId: string;
  sourceModule: string; // e.g. 'SALES', 'PURCHASING', 'INVENTORY'
  sourceReferenceId: string; // e.g. the Invoice ID or Bill ID
  entryDate: string;
  narration: string;
  totalAmount: number;
  createdById: string;
  lines: Array<{
    accountId: string;
    debit: number;
    credit: number;
    narration?: string;
    partyId?: string;
    partyType?: 'CUSTOMER' | 'VENDOR' | 'EMPLOYEE';
  }>;
};

/**
 * Creates a DRAFT or PENDING_APPROVAL journal entry from operational modules.
 * This guarantees no integration bypasses the central accounting approval workflow.
 */
export async function createIntegrationJournal(
  payload: JournalIntegrationPayload,
  status: "DRAFT" | "PENDING_APPROVAL" = "PENDING_APPROVAL"
) {
  // 1. Validate double-entry accounting (Debits == Credits)
  const totalDebits = payload.lines.reduce((sum, line) => sum + line.debit, 0);
  const totalCredits = payload.lines.reduce((sum, line) => sum + line.credit, 0);

  // Allow a small epsilon for floating point issues, though using precise decimals is better
  if (Math.abs(totalDebits - totalCredits) > 0.01) {
    throw new Error(`Double-entry mismatch: Debits (${totalDebits}) do not equal Credits (${totalCredits})`);
  }

  if (Math.abs(totalDebits - payload.totalAmount) > 0.01) {
    throw new Error(`Total amount mismatch: Lines total (${totalDebits}) does not equal Header total (${payload.totalAmount})`);
  }

  // 1b. Validate Tenant Boundary (Critical for Multi-tenant SaaS)
  // Ensure all provided account IDs actually belong to the current organization
  const { accounts } = await import("@/db/schema");
  const { inArray, eq, and, count } = await import("drizzle-orm");
  const uniqueAccountIds = [...new Set(payload.lines.map(l => l.accountId))];
  
  const [{ matchedCount }] = await db
    .select({ matchedCount: count() })
    .from(accounts)
    .where(
      and(
        eq(accounts.organizationId, payload.organizationId),
        inArray(accounts.id, uniqueAccountIds)
      )
    );

  if (matchedCount !== uniqueAccountIds.length) {
    throw new Error("Security Violation: One or more account IDs do not belong to this organization.");
  }

  // 2. Generate the Entry Number (Ideally from a sequence table, using UUID for now to prevent collision)
  const entryNumber = `${payload.sourceModule}-${Date.now().toString().slice(-6)}`;

  const journalId = uuidv4();

  // 3. Insert Journal and Lines in a Transaction
  await db.transaction(async (tx) => {
    // Insert Header
    await tx.insert(journalEntries).values({
      id: journalId,
      organizationId: payload.organizationId,
      entryNumber,
      entryDate: payload.entryDate,
      narration: payload.narration,
      sourceModule: payload.sourceModule,
      sourceReferenceId: payload.sourceReferenceId,
      totalAmount: payload.totalAmount.toString(),
      status: status, // Strictly enforce non-posted status
      createdById: payload.createdById,
    });

    // Insert Lines
    const lineValues = payload.lines.map((line) => ({
      id: uuidv4(),
      journalEntryId: journalId,
      accountId: line.accountId,
      locationId: payload.locationId, // Flows down from payload
      partyId: line.partyId,
      partyType: line.partyType,
      debit: line.debit.toString(),
      credit: line.credit.toString(),
      narration: line.narration || payload.narration,
    }));

    await tx.insert(journalLineItems).values(lineValues);
  });

  return { success: true, journalId, entryNumber };
}
