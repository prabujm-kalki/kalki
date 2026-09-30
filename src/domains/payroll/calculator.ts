import { db } from "@/db";
import { employeeSalaryStructures, employeeSalaryStructureComponents, salaryComponents, employees, people } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { fetchValidatedAttendance } from "./services";

export interface DraftPayslip {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  startDate: string;
  endDate: string;
  grossPay: number;
  statutoryDeductions: {
    epf: number;
    esi: number;
    pt: number;
  };
  otherDeductions: number;
  loansAndAdvances: number;
  netPay: number;
  components: {
    componentId?: string;
    componentName: string;
    type: string;
    amount: number;
  }[];
}

/**
 * Fetches the pending advance/loan deductions for the current payroll cycle.
 * @param employeeId The ID of the employee
 * @param endDateStr The end date of the payroll cycle to determine the deduction month
 * @returns Total pending deductions from advances
 */
export async function getPendingDeductions(employeeId: string, startDateStr: string, endDateStr: string, payBasis: string): Promise<number> {
  const { advanceRepaymentSchedules, employeeAdvanceRequests } = await import("@/db/schema");
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);

  const pending = await db
    .select({ amount: advanceRepaymentSchedules.deductionAmount })
    .from(advanceRepaymentSchedules)
    .innerJoin(employeeAdvanceRequests, eq(advanceRepaymentSchedules.advanceRequestId, employeeAdvanceRequests.id))
    .where(and(
      eq(employeeAdvanceRequests.employeeId, employeeId),
      eq(advanceRepaymentSchedules.status, "PENDING"),
      // Check if the current payroll end date falls within the schedule's cycle end month
      // The schedules use cycleStartDate/cycleEndDate. We extract the year-month of cycleEndDate.
      // E.g., cycleEndDate is "2026-10-31". If end date is "2026-10-15", it falls in the same month.
      sql`EXTRACT(MONTH FROM ${advanceRepaymentSchedules.cycleEndDate}) = ${end.getMonth() + 1}`,
      sql`EXTRACT(YEAR FROM ${advanceRepaymentSchedules.cycleEndDate}) = ${end.getFullYear()}`
    ));

  let totalDeduction = pending.reduce((sum, row) => sum + Number(row.amount), 0);

  if (totalDeduction > 0) {
    if (payBasis === "WEEKLY" || payBasis === "DAILY" || payBasis === "HOURLY") {
      const daysInMonth = new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate();
      const daysInCycle = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      // Pro-rate based on the exact calendar days in this payroll cycle vs days in the month
      totalDeduction = totalDeduction * (daysInCycle / daysInMonth);
    }
  }

  return totalDeduction;
}

/**
 * Universal Calculation Engine for computing employee payroll.
 */
export async function calculateEmployeePayroll(
  employeeId: string, 
  startDate: string, 
  endDate: string
): Promise<DraftPayslip> {
  // 1. Fetch pay configuration & earnings
  const configs = await db
    .select()
    .from(employeeSalaryStructures)
    .where(and(
      eq(employeeSalaryStructures.employeeId, employeeId),
      eq(employeeSalaryStructures.isActive, true)
    ))
    .limit(1);

  const config = configs[0];
  if (!config) {
    throw new Error(`No active pay configuration found for employee ${employeeId}`);
  }

  const empDetails = await db
    .select({
      employeeCode: employees.employeeCode,
      displayName: people.displayName,
    })
    .from(employees)
    .innerJoin(people, eq(employees.personId, people.id))
    .where(eq(employees.id, employeeId))
    .limit(1);

  if (!empDetails[0]) {
    throw new Error(`Employee details not found for ${employeeId}`);
  }

  const components = await db
    .select({
      id: employeeSalaryStructureComponents.id,
      amount: employeeSalaryStructureComponents.amount,
      type: salaryComponents.type,
      name: salaryComponents.name,
    })
    .from(employeeSalaryStructureComponents)
    .innerJoin(salaryComponents, eq(employeeSalaryStructureComponents.componentId, salaryComponents.id))
    .where(eq(employeeSalaryStructureComponents.structureId, config.id));

  // Calculate base rate from EARNING
  const baseRate = components
    .filter(c => c.type === "EARNING")
    .reduce((sum, c) => sum + Number(c.amount), 0);

  // 2. Fetch validated attendance
  const attendance = await fetchValidatedAttendance(
    employeeId, 
    config.payBasis as "HOURLY" | "DAILY" | "WEEKLY" | "MONTHLY", 
    startDate, 
    endDate
  );
  
  if (attendance.attendanceStatus === "INCOMPLETE_MISSING_PUNCHES") {
    throw new Error(`Cannot process payroll for ${employeeId}: Incomplete attendance (missing punches).`);
  }

  // 3. Math Routing
  let multiplier = 0;
  
  switch (config.payBasis) {
    case "HOURLY":
      multiplier = attendance.totalWorkingHours;
      break;
    case "DAILY":
      const payableDailyDays = attendance.totalFullDays + (0.5 * attendance.totalHalfDays);
      multiplier = payableDailyDays;
      break;
    case "WEEKLY":
      const payableWeeklyDays = attendance.totalFullDays + (0.5 * attendance.totalHalfDays);
      multiplier = payableWeeklyDays / 7; 
      break;
    case "MONTHLY":
      const start = new Date(startDate);
      const end = new Date(endDate);
      const calendarDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const payableDays = attendance.totalFullDays + (0.5 * attendance.totalHalfDays);
      
      const daysInMonth = calendarDays > 0 ? calendarDays : 30; 
      multiplier = payableDays / daysInMonth;
      break;
    default:
      throw new Error(`Unsupported pay frequency: ${config.payBasis}`);
  }

  const generatedComponents: { componentId?: string; componentName: string; type: string; amount: number }[] = [];
  let gross = 0;

  components.filter(c => c.type === "EARNING").forEach(c => {
    const proRatedAmount = Number(c.amount) * multiplier;
    const rounded = Math.round(proRatedAmount * 100) / 100;
    gross += rounded;
    generatedComponents.push({ componentId: c.id, componentName: c.name, type: c.type, amount: rounded });
  });

  // 4. Loans & Advances Stub
  const loansAndAdvances = await getPendingDeductions(employeeId, startDate, endDate, config.payBasis);

  // 5. Statutory Toggles
  let epf = 0;
  let esi = 0;
  let pt = 0;

  if (config.isEpfApplicable) {
    epf = gross * 0.12; 
  }
  
  if (config.isEsiApplicable) {
    esi = gross * 0.0075;
  }
  
  if (config.isPtApplicable) {
    pt = 200; // Flat PT placeholder
  }
  
  // Custom non-statutory deductions
  const otherDeductions = components
    .filter(d => d.type === "DEDUCTION")
    .reduce((sum, d) => sum + Number(d.amount), 0);

  const totalDeductions = epf + esi + pt + otherDeductions + loansAndAdvances;
  const netPay = gross - totalDeductions;
  if (epf > 0) generatedComponents.push({ componentName: "EPF", type: "DEDUCTION", amount: Math.round(epf * 100) / 100 });
  if (esi > 0) generatedComponents.push({ componentName: "ESI", type: "DEDUCTION", amount: Math.round(esi * 100) / 100 });
  if (pt > 0) generatedComponents.push({ componentName: "Professional Tax", type: "DEDUCTION", amount: Math.round(pt * 100) / 100 });
  
  components.filter(d => d.type === "DEDUCTION").forEach(d => {
    generatedComponents.push({ componentId: d.id, componentName: d.name, type: d.type, amount: Number(d.amount) });
  });
  if (loansAndAdvances > 0) generatedComponents.push({ componentName: "Loans & Advances", type: "DEDUCTION", amount: loansAndAdvances });

  return {
    employeeId,
    employeeCode: empDetails[0].employeeCode,
    employeeName: empDetails[0].displayName,
    startDate,
    endDate,
    grossPay: Math.round(gross * 100) / 100,
    statutoryDeductions: {
      epf: Math.round(epf * 100) / 100,
      esi: Math.round(esi * 100) / 100,
      pt: Math.round(pt * 100) / 100,
    },
    otherDeductions: Math.round(otherDeductions * 100) / 100,
    loansAndAdvances,
    netPay: Math.round(netPay * 100) / 100,
    components: generatedComponents,
  };
}
