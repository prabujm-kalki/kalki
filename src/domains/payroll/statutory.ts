import { db } from "@/db";
import { payslips, payrollRuns, employees, people, payslipComponents } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

export interface EPFExportRow {
  UAN: string;
  EmployeeName: string;
  GrossWages: number;
  EPFWages: number;
  EPSWages: number;
  EDLIWages: number;
  EPFContribution: number;
  EPSContribution: number;
  EPFEmpContribution: number; // Employee share
  NCPDays: number; // Non-contributory days (absent)
  AdvancesRefunds: number;
}

export interface ESIExportRow {
  IPNumber: string;
  EmployeeName: string;
  NoOfDaysWorked: number;
  TotalMonthlyWages: number;
  ReasonCodeForZeroWorkedDays: string;
  LastWorkingDay: string;
}

/**
 * Extracts EPF (Electronic Challan cum Return) data for a given payroll run.
 * Ensures precise extraction based on processed Payslips.
 */
export async function extractEPFData(payrollRunId: string): Promise<EPFExportRow[]> {
  const slips = await db
    .select({
      id: payslips.id,
      uanNumber: employees.uanNumber,
      employeeName: people.displayName,
      totalAbsentDays: payslips.totalAbsentDays,
      grossAmount: payslips.grossAmount,
    })
    .from(payslips)
    .innerJoin(employees, eq(payslips.employeeId, employees.id))
    .innerJoin(people, eq(employees.personId, people.id))
    .where(and(
      eq(payslips.payrollRunId, payrollRunId),
      // Only include employees who have a UAN (implies EPF applicability)
      sql`${employees.uanNumber} IS NOT NULL`
    ));

  const components = await db
    .select({
      payslipId: payslipComponents.payslipId,
      componentName: payslipComponents.componentName,
      amount: payslipComponents.amount
    })
    .from(payslipComponents)
    .innerJoin(payslips, eq(payslipComponents.payslipId, payslips.id))
    .where(eq(payslips.payrollRunId, payrollRunId));

  const rows: EPFExportRow[] = [];

  for (const slip of slips) {
    if (!slip.uanNumber) continue;

    const slipComps = components.filter(c => c.payslipId === slip.id);
    
    // In India, EPF wages are generally Basic + DA.
    // For our simplified model, we extract components explicitly named 'EPF'
    // or calculate based on standard 12% rules if the exact wage base isn't stored.
    
    const epfEmployeeShare = slipComps.find(c => c.componentName === "EPF (Employee)")?.amount || "0";
    const epfContributionNum = parseFloat(epfEmployeeShare);
    
    // If there is no EPF deduction for this employee this month, skip them for EPF export
    if (epfContributionNum <= 0) continue;

    // Reverse-calculate EPF wages from the 12% deduction, capped at ceiling (usually 15k).
    // Or normally, Kalki-BOS would store the EPF Wage base directly in components.
    const epfWages = Math.round((epfContributionNum / 12) * 100);

    // EPS (Pension) is 8.33% of EPS Wages (capped at 15k), Employer EPF is 3.67%.
    const epsContribution = Math.round((epfWages * 8.33) / 100);

    rows.push({
      UAN: slip.uanNumber,
      EmployeeName: slip.employeeName || "Unknown",
      GrossWages: parseFloat(slip.grossAmount),
      EPFWages: epfWages,
      EPSWages: epfWages, // Usually same as EPF wages up to 15k
      EDLIWages: epfWages,
      EPFContribution: Math.round((epfWages * 3.67) / 100), // Employer Share
      EPSContribution: epsContribution, // Pension Share
      EPFEmpContribution: epfContributionNum, // Employee Share
      NCPDays: parseInt(slip.totalAbsentDays || "0"),
      AdvancesRefunds: 0 // Typically 0 unless specific EPF advances are being refunded
    });
  }

  return rows;
}

/**
 * Extracts ESI (Employee State Insurance) Return data for a given payroll run.
 */
export async function extractESIData(payrollRunId: string): Promise<ESIExportRow[]> {
  const runResult = await db.select().from(payrollRuns).where(eq(payrollRuns.id, payrollRunId)).limit(1);
  const run = runResult[0];
  if (!run) throw new Error("Payroll Run not found");

  const slips = await db
    .select({
      id: payslips.id,
      esiNumber: employees.esiNumber,
      employeeName: people.displayName,
      totalPresentDays: payslips.totalPresentDays,
      grossAmount: payslips.grossAmount,
    })
    .from(payslips)
    .innerJoin(employees, eq(payslips.employeeId, employees.id))
    .innerJoin(people, eq(employees.personId, people.id))
    .where(and(
      eq(payslips.payrollRunId, payrollRunId),
      sql`${employees.esiNumber} IS NOT NULL`
    ));

  const components = await db
    .select({
      payslipId: payslipComponents.payslipId,
      componentName: payslipComponents.componentName,
      amount: payslipComponents.amount
    })
    .from(payslipComponents)
    .innerJoin(payslips, eq(payslipComponents.payslipId, payslips.id))
    .where(eq(payslips.payrollRunId, payrollRunId));

  const rows: ESIExportRow[] = [];

  for (const slip of slips) {
    if (!slip.esiNumber) continue;

    const slipComps = components.filter(c => c.payslipId === slip.id);
    const esiEmployeeShare = slipComps.find(c => c.componentName === "ESI (Employee)")?.amount || "0";
    
    // If no ESI deducted, they might cross the ceiling (21k) or not be applicable this month.
    if (parseFloat(esiEmployeeShare) <= 0) continue;

    const presentDays = parseInt(slip.totalPresentDays || "0");
    const gross = parseFloat(slip.grossAmount);

    rows.push({
      IPNumber: slip.esiNumber,
      EmployeeName: slip.employeeName || "Unknown",
      NoOfDaysWorked: presentDays,
      TotalMonthlyWages: gross, // ESI is calculated on gross wages
      ReasonCodeForZeroWorkedDays: presentDays === 0 ? "1" : "", // e.g. 1 for Left Service, 2 for Leave, etc.
      LastWorkingDay: "" // Populate only if they left during the month
    });
  }

  return rows;
}
