"use server";

import { db } from "@/db";
import { employeeSalaryStructures, employees, people, payrollRuns, payslips, payslipComponents } from "@/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { calculateEmployeePayroll, DraftPayslip } from "@/domains/payroll/calculator";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getSessionContext } from "@/domains/session/service";
import { processAccountingEvent } from "@/domains/finance/event-engine";

export async function generateDraftPayroll(frequency: string, startDate: string, endDate: string) {
  try {
    const configs = await db
      .select({
        employeeId: employeeSalaryStructures.employeeId,
        employeeCode: employees.employeeCode,
        employeeName: people.displayName
      })
      .from(employeeSalaryStructures)
      .innerJoin(employees, eq(employeeSalaryStructures.employeeId, employees.id))
      .innerJoin(people, eq(employees.personId, people.id))
      .where(and(
        eq(employeeSalaryStructures.payBasis, frequency),
        eq(employeeSalaryStructures.isActive, true),
        inArray(employees.status, ["ACTIVE"])
      ));

    const results: DraftPayslip[] = [];
    const errors: string[] = [];

    for (const c of configs) {
      try {
        const slip = await calculateEmployeePayroll(c.employeeId, startDate, endDate);
        results.push(slip);
      } catch (e: any) {
        errors.push(`Employee ${c.employeeCode} (${c.employeeName}): ${e.message}`);
      }
    }

    return { success: true, data: results, errors };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function savePayrollRun(organizationId: string, locationId: string, frequency: string, startDate: string, endDate: string, data: DraftPayslip[]) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) throw new Error("Unauthorized");
    
    const existingRunResult = await db.select().from(payrollRuns).where(
      and(
        eq(payrollRuns.organizationId, organizationId),
        eq(payrollRuns.locationId, locationId),
        eq(payrollRuns.periodStart, startDate),
        eq(payrollRuns.periodEnd, endDate)
      )
    ).limit(1);
    const existingRun = existingRunResult[0];
    
    if (existingRun) {
      throw new Error(`A payroll run for this period (${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}) already exists. Please delete it from the history tab if you wish to re-run.`);
    }

    let totalGrossAmount = 0;
    let totalDeductions = 0;
    let totalNetAmount = 0;
    
    data.forEach(d => {
      totalGrossAmount += d.grossPay;
      const tDeductions = d.statutoryDeductions.epf + d.statutoryDeductions.esi + d.statutoryDeductions.pt + d.otherDeductions + d.loansAndAdvances;
      totalDeductions += tDeductions;
      totalNetAmount += d.netPay;
    });

    return await db.transaction(async (tx) => {
      const run = await tx.insert(payrollRuns).values({
        organizationId,
        locationId,
        periodStart: startDate,
        periodEnd: endDate,
        status: "DRAFT",
        totalGrossAmount: totalGrossAmount.toString(),
        totalDeductions: totalDeductions.toString(),
        totalNetAmount: totalNetAmount.toString(),
        processedByUserId: session.user.id,
      }).returning();
      
      const runId = run[0].id;
      
      if (data.length > 0) {
        const slips = await tx.insert(payslips).values(data.map(d => {
          const tDeductions = d.statutoryDeductions.epf + d.statutoryDeductions.esi + d.statutoryDeductions.pt + d.otherDeductions + d.loansAndAdvances;
          return {
            payrollRunId: runId,
            employeeId: d.employeeId,
            grossAmount: d.grossPay.toString(),
            deductionsAmount: tDeductions.toString(),
            netAmount: d.netPay.toString(),
            totalPresentDays: "0",
            totalAbsentDays: "0"
          };
        })).returning();
        
        const componentInserts: any[] = [];
        slips.forEach((slip, index) => {
          const draft = data[index];
          if (draft.components && draft.components.length > 0) {
            draft.components.forEach(c => {
              componentInserts.push({
                payslipId: slip.id,
                componentId: c.componentId,
                componentName: c.componentName,
                type: c.type,
                amount: c.amount.toString(),
              });
            });
          }
        });
        
        if (componentInserts.length > 0) {
          await tx.insert(payslipComponents).values(componentInserts);
        }
      }

      await tx.update(payrollRuns).set({ status: "PENDING_DISBURSEMENT" }).where(eq(payrollRuns.id, runId));
      
      // Fire Accounting Event (Double Entry Engine)
      await processAccountingEvent({
        organizationId,
        locationId,
        triggeredByUserId: session.user.id,
        sourceModule: "PAYROLL",
        sourceReferenceId: runId,
        entryDate: new Date(endDate),
        narration: `Payroll Run for ${startDate} to ${endDate}`,
        lines: [
          {
            mappingType: "SYSTEM_DEFAULT",
            sourceReferenceId: "SALARY_EXPENSE",
            amount: totalGrossAmount,
            isDebit: true,
            narration: "Gross Salary Expense"
          },
          {
            mappingType: "SYSTEM_DEFAULT",
            sourceReferenceId: "SALARY_PAYABLE",
            amount: totalNetAmount,
            isDebit: false,
            narration: "Net Salary Payable"
          },
          ...(totalDeductions > 0 ? [{
            mappingType: "SYSTEM_DEFAULT",
            sourceReferenceId: "STATUTORY_PAYABLE",
            amount: totalDeductions,
            isDebit: false,
            narration: "Statutory & Other Deductions Payable"
          } as any] : [])
        ]
      });
      
      return { success: true, runId };
    });
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function getPayrollHistory(organizationId: string, locationId: string) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) throw new Error("Unauthorized");
    
    const runs = await db.select().from(payrollRuns).where(
      and(
        eq(payrollRuns.organizationId, organizationId),
        eq(payrollRuns.locationId, locationId)
      )
    ).orderBy(desc(payrollRuns.createdAt));

    return { success: true, data: runs };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function disbursePayrollRun(runId: string, paymentRows: any[]) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) throw new Error("Unauthorized");

    const [run] = await db.select().from(payrollRuns).where(eq(payrollRuns.id, runId));
    if (!run) throw new Error("Payroll run not found");

    await db.update(payrollRuns)
      .set({
        status: "DISBURSED",
        paymentMode: "MULTIPLE",
        paymentReference: "SEE_ATTACHMENTS",
        paymentAttachments: paymentRows
      })
      .where(eq(payrollRuns.id, runId));

    await processAccountingEvent({
      organizationId: run.organizationId,
      locationId: run.locationId,
      triggeredByUserId: session.user.id,
      sourceModule: "PAYROLL",
      sourceReferenceId: runId,
      entryDate: new Date(),
      narration: `Payroll Disbursement for ${run.periodStart} to ${run.periodEnd}`,
      lines: [
        {
          mappingType: "SYSTEM_DEFAULT",
          sourceReferenceId: "SALARY_PAYABLE",
          amount: Number(run.totalNetAmount),
          isDebit: true,
          narration: "Salary payout clearance"
        },
        {
          mappingType: "SYSTEM_DEFAULT",
          sourceReferenceId: "BANK_CASH",
          amount: Number(run.totalNetAmount),
          isDebit: false,
          narration: "Bank payout"
        }
      ]
    });

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function getPayrollRunDetails(runId: string) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) throw new Error("Unauthorized");
    
    const run = await db.select().from(payrollRuns).where(eq(payrollRuns.id, runId)).limit(1);
    if (!run[0]) throw new Error("Payroll run not found");
    
    const slips = await db.select({
      id: payslips.id,
      grossAmount: payslips.grossAmount,
      deductionsAmount: payslips.deductionsAmount,
      netAmount: payslips.netAmount,
      employeeId: payslips.employeeId,
      employeeCode: employees.employeeCode,
      employeeName: people.displayName,
    })
    .from(payslips)
    .innerJoin(employees, eq(payslips.employeeId, employees.id))
    .innerJoin(people, eq(employees.personId, people.id))
    .where(eq(payslips.payrollRunId, runId));

    const slipIds = slips.map(s => s.id);

    // Let's actually do a cleaner join for components
    const components = await db.select({
      payslipId: payslipComponents.payslipId,
      componentName: payslipComponents.componentName,
      type: payslipComponents.type,
      amount: payslipComponents.amount
    })
    .from(payslipComponents)
    .innerJoin(payslips, eq(payslipComponents.payslipId, payslips.id))
    .where(eq(payslips.payrollRunId, runId));

    const slipsWithComponents = slips.map(s => {
      return {
        ...s,
        components: components.filter(c => c.payslipId === s.id)
      };
    });

    return { success: true, data: { run: run[0], slips: slipsWithComponents } };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function deletePayrollRun(runId: string) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) throw new Error("Unauthorized");
    
    // Only allow deletion if not disbursed
    const runResult = await db.select().from(payrollRuns).where(eq(payrollRuns.id, runId)).limit(1);
    const run = runResult[0];
    
    if (!run) throw new Error("Payroll run not found.");
    if (run.status === "DISBURSED") throw new Error("Cannot delete a payroll run that has already been disbursed.");
    
    // Note: payslips and payslipComponents will be deleted automatically due to foreign key ON DELETE CASCADE
    await db.delete(payrollRuns).where(eq(payrollRuns.id, runId));
    
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function generateFnFPayroll(
  employeeId: string, 
  startDate: string, 
  endDate: string, 
  organizationId: string, 
  locationId: string,
  adHocEarnings: number = 0,
  adHocDeductions: number = 0
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) throw new Error("Unauthorized");

    // 0. Check if a payroll run for this employee and period already exists
    const existingRun = await db.select({ id: payslips.id })
      .from(payslips)
      .innerJoin(payrollRuns, eq(payslips.payrollRunId, payrollRuns.id))
      .where(and(
        eq(payslips.employeeId, employeeId),
        eq(payrollRuns.periodStart, startDate),
        eq(payrollRuns.periodEnd, endDate)
      ))
      .limit(1);

    if (existingRun.length > 0) {
      return { success: false, error: "A payroll run for this employee and period already exists." };
    }

    // 1. Calculate payroll for this employee specifically
    const slip = await calculateEmployeePayroll(employeeId, startDate, endDate);
    
    // Apply ad-hoc F&F adjustments
    const finalGrossPay = slip.grossPay + adHocEarnings;
    const standardDeductions = slip.statutoryDeductions.epf + slip.statutoryDeductions.esi + slip.statutoryDeductions.pt + slip.otherDeductions + slip.loansAndAdvances;
    const finalDeductionsAmount = standardDeductions + adHocDeductions;
    const finalNetPay = finalGrossPay - finalDeductionsAmount;

    if (adHocEarnings > 0) {
      slip.components.push({
        componentName: "F&F Additional Earnings (Encashment, Bonus)",
        type: "EARNING",
        amount: adHocEarnings
      });
    }

    if (adHocDeductions > 0) {
      slip.components.push({
        componentName: "F&F Recoveries (Asset Damage, Notice Period)",
        type: "DEDUCTION",
        amount: adHocDeductions
      });
    }

    // 2. Save it as a distinct payroll run just for them
    // We treat it as an ad-hoc run
    const [run] = await db.insert(payrollRuns).values({
      organizationId,
      locationId,
      periodStart: startDate,
      periodEnd: endDate,
      status: "PENDING_DISBURSEMENT",
      totalGrossAmount: finalGrossPay.toString(),
      totalDeductions: finalDeductionsAmount.toString(),
      totalNetAmount: finalNetPay.toString(),
      processedByUserId: session.user.id,
    }).returning();

    const [dbSlip] = await db.insert(payslips).values({
      payrollRunId: run.id,
      employeeId: employeeId,
      totalPresentDays: "0",
      totalAbsentDays: "0",
      grossAmount: finalGrossPay.toString(),
      deductionsAmount: finalDeductionsAmount.toString(),
      netAmount: finalNetPay.toString(),
      status: "DRAFT",
    }).returning();

    for (const comp of slip.components) {
      await db.insert(payslipComponents).values({
        payslipId: dbSlip.id,
        componentId: comp.componentId || null,
        componentName: comp.componentName,
        type: comp.type,
        amount: comp.amount.toString(),
      });
    }

    return { success: true, runId: run.id };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
