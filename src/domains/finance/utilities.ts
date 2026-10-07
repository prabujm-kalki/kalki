import { db } from "@/db";
import { z } from "zod";
import { processAccountingEvent } from "./event-engine";
import { authorizeEmployeeOperation } from "@/lib/authorization";
import { employeePermissions } from "@/lib/authorization-policy";

const scopeSchema = z.object({
  organizationId: z.string().uuid(),
  locationId: z.string().uuid(),
});

export const recordUtilityBillSchema = scopeSchema.extend({
  utilityType: z.enum(["ELECTRICITY", "RENT", "WATER", "INTERNET", "OTHER"]),
  billNumber: z.string().min(1),
  billDate: z.string().datetime(),
  amount: z.number().positive(),
  recordedByEmployeeId: z.string().uuid(),
});

export type RecordUtilityBillInput = z.infer<typeof recordUtilityBillSchema>;

/**
 * Scaffolding for the Utilities Module.
 * Approves and records an overhead bill, instantly dispatching it to the Accounting Ledger.
 */
export async function recordUtilityBill(actor: { id: string } | null, input: RecordUtilityBillInput) {
  if (!actor) throw new Error("Authentication required");
  
  const parsed = recordUtilityBillSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid utility bill input");
  
  // Note: Needs a proper permission check in production, using finance.create for now
  const allowed = await authorizeEmployeeOperation({ 
    userId: actor.id, 
    ...parsed.data, 
    permission: employeePermissions.create 
  });
  if (!allowed) throw new Error("Access denied");

  // In a full implementation, we would insert this into a `utility_bills` table first.
  // For now, we directly dispatch the Accounting Event to demonstrate the Architecture.
  
  const referenceId = `UTIL-${Date.now()}`;
  
  await processAccountingEvent({
    organizationId: parsed.data.organizationId,
    locationId: parsed.data.locationId,
    triggeredByUserId: actor.id,
    sourceModule: "UTILITIES",
    sourceReferenceId: referenceId,
    entryDate: new Date(parsed.data.billDate),
    narration: `${parsed.data.utilityType} Bill - ${parsed.data.billNumber}`,
    lines: [
      {
        mappingType: "SYSTEM_DEFAULT",
        sourceReferenceId: `${parsed.data.utilityType}_EXPENSE`,
        amount: parsed.data.amount,
        isDebit: true,
        narration: "Overhead Expense"
      },
      {
        mappingType: "SYSTEM_DEFAULT",
        sourceReferenceId: "UTILITY_PAYABLE",
        amount: parsed.data.amount,
        isDebit: false,
        narration: "Liability recognized"
      }
    ]
  });

  return { success: true, referenceId };
}
