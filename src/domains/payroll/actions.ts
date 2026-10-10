"use server";

import { z } from "zod";
import { db } from "@/db";
import { employeeSalaryStructures, employeeSalaryStructureComponents, salaryComponents, salaryAdvances, payrollRuns, payslips, payslipComponents } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { processAccountingEvent } from "@/domains/finance/event-engine";

export const upsertSalaryStructureSchema = z.object({
  organizationId: z.string().uuid(),
  employeeId: z.string().uuid(),
  effectiveFrom: z.string().date(),
  isEpfApplicable: z.boolean().default(false),
  isEsiApplicable: z.boolean().default(false),
  isPtApplicable: z.boolean().default(false),
  components: z.array(z.object({
    componentId: z.string().uuid(),
    amount: z.string(), // numeric
  }))
});

export type UpsertSalaryStructureInput = z.infer<typeof upsertSalaryStructureSchema>;

export async function upsertSalaryStructure(input: UpsertSalaryStructureInput) {
  // Validate auth
  const reqHeaders = await headers();
  const session = await auth.api.getSession({
    headers: reqHeaders
  });
  
  if (!session) {
    throw new Error("Authentication required");
  }
  
  const parsed = upsertSalaryStructureSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Invalid input: " + parsed.error.message);
  }
  
  return await db.transaction(async (tx) => {
    // Insert header
    const [structure] = await tx.insert(employeeSalaryStructures).values({
      organizationId: parsed.data.organizationId,
      employeeId: parsed.data.employeeId,
      effectiveFrom: parsed.data.effectiveFrom,
      isEpfApplicable: parsed.data.isEpfApplicable,
      isEsiApplicable: parsed.data.isEsiApplicable,
      isPtApplicable: parsed.data.isPtApplicable,
    }).returning();
    
    // Insert components
    if (parsed.data.components.length > 0) {
      await tx.insert(employeeSalaryStructureComponents).values(
        parsed.data.components.map(c => ({
          structureId: structure.id,
          componentId: c.componentId,
          amount: c.amount,
        }))
      );
    }
    
    return structure;
  });
}

export const createSalaryAdvanceSchema = z.object({
  organizationId: z.string().uuid(),
  locationId: z.string().uuid(),
  employeeId: z.string().uuid(),
  amount: z.string().min(1, "Amount is required"),
  reason: z.string().optional(),
  dateGiven: z.string().optional(),
  repaymentMethod: z.enum(["DEDUCT_FROM_PAYROLL", "MANUAL_CASH"]).default("DEDUCT_FROM_PAYROLL"),
});

export async function createSalaryAdvance(input: z.infer<typeof createSalaryAdvanceSchema>) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return { error: "Unauthorized" };
    }

    const parsed = createSalaryAdvanceSchema.parse(input);

    return await db.transaction(async (tx) => {
      const [advance] = await tx.insert(salaryAdvances).values({
        organizationId: parsed.organizationId,
        locationId: parsed.locationId,
        employeeId: parsed.employeeId,
        amount: parsed.amount,
        reason: parsed.reason || null,
        dateGiven: parsed.dateGiven ? new Date(parsed.dateGiven) : new Date(),
        repaymentMethod: parsed.repaymentMethod,
        status: 'PENDING',
      }).returning();

      // Trigger Finance Event: Disbursement of Advance
      // Debit: Employee Advance Asset
      // Credit: Bank/Cash
      await processAccountingEvent({
        organizationId: parsed.organizationId,
        locationId: parsed.locationId,
        triggeredByUserId: session.user.id,
        sourceModule: "PAYROLL",
        sourceReferenceId: advance.id,
        entryDate: advance.dateGiven || new Date(),
        narration: `Salary Advance for ${parsed.employeeId} - ${parsed.reason || 'No reason'}`,
        lines: [
          {
            mappingType: "SYSTEM_DEFAULT",
            sourceReferenceId: "SALARY_ADVANCE_ASSET",
            amount: parseFloat(parsed.amount),
            isDebit: true,
            narration: "Salary Advance Disbursement"
          },
          {
            mappingType: "SYSTEM_DEFAULT",
            sourceReferenceId: "BANK_CASH",
            amount: parseFloat(parsed.amount),
            isDebit: false,
            narration: "Bank/Cash Out"
          }
        ]
      });

      return { success: true };
    });
  } catch (error) {
    console.error("Error creating salary advance:", error);
    return { error: "Failed to record salary advance." };
  }
}

/**
 * Approve a Payroll Run and post double-entry journals.
 */
export async function approvePayrollRun(runId: string) {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });
  if (!session || !session.user) return { error: "Unauthorized" };

  return await db.transaction(async (tx) => {
    // 1. Fetch the run
    const [run] = await tx.select().from(payrollRuns).where(eq(payrollRuns.id, runId)).limit(1);
    if (!run) return { error: "Run not found" };
    if (run.status !== "DRAFT") return { error: "Run is not in DRAFT state" };

    // 2. Fetch all payslip components
    const components = await tx
      .select({
        amount: payslipComponents.amount,
        type: payslipComponents.type,
        ledgerAccountMapping: salaryComponents.ledgerAccountMapping
      })
      .from(payslipComponents)
      .innerJoin(payslips, eq(payslipComponents.payslipId, payslips.id))
      .innerJoin(salaryComponents, eq(payslipComponents.componentId, salaryComponents.id))
      .where(eq(payslips.payrollRunId, runId));

    // 3. Aggregate for Journal Entry
    const accountingLines: any[] = [];
    
    // Group by ledger mapping and type
    const aggregated = components.reduce((acc: any, comp) => {
      const mapping = comp.ledgerAccountMapping || (comp.type === "EARNING" ? "SALARY_EXPENSE" : "SALARY_PAYABLE");
      const key = `${mapping}_${comp.type}`;
      if (!acc[key]) acc[key] = { mapping, amount: 0, type: comp.type };
      acc[key].amount += parseFloat(comp.amount);
      return acc;
    }, {});

    let totalGross = 0;
    let totalDeds = 0;

    for (const key in aggregated) {
      const val = aggregated[key];
      if (val.type === "EARNING") {
        totalGross += val.amount;
        accountingLines.push({
          mappingType: "SYSTEM_DEFAULT",
          sourceReferenceId: val.mapping,
          amount: val.amount,
          isDebit: true,
          narration: "Payroll Expense"
        });
      } else {
        totalDeds += val.amount;
        accountingLines.push({
          mappingType: "SYSTEM_DEFAULT",
          sourceReferenceId: val.mapping,
          amount: val.amount,
          isDebit: false,
          narration: "Payroll Deduction Liability"
        });
      }
    }

    const netPay = totalGross - totalDeds;
    if (netPay > 0) {
      accountingLines.push({
        mappingType: "SYSTEM_DEFAULT",
        sourceReferenceId: "SALARY_PAYABLE",
        amount: netPay,
        isDebit: false,
        narration: "Net Salary Payable"
      });
    }

    // 4. Update status
    await tx.update(payrollRuns).set({ status: "APPROVED", processedByUserId: session.user.id }).where(eq(payrollRuns.id, runId));

    // 5. Fire double-entry accounting event
    await processAccountingEvent({
      organizationId: run.organizationId,
      locationId: run.locationId,
      triggeredByUserId: session.user.id,
      sourceModule: "PAYROLL",
      sourceReferenceId: run.id,
      entryDate: new Date(),
      narration: `Payroll Run Approved for ${run.periodStart} to ${run.periodEnd}`,
      lines: accountingLines
    });

    return { success: true };
  });
}
