import { db } from "@/db";
import { employeeAdvanceRequests, advanceTypeDefinitions, employees, people } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export interface CreateAdvanceRequestPayload {
  organizationId: string;
  locationId?: string;
  employeeId: string;
  advanceTypeId: string;
  requestedAmount: number;
  repaymentMonths?: number;
  paymentMode?: string;
}

import { or, gt } from "drizzle-orm";
import { employeeSalaryStructures, employeeSalaryStructureComponents } from "@/db/schema";
import { fetchValidatedAttendance } from "@/domains/payroll/services";

export async function requestAdvance(data: CreateAdvanceRequestPayload) {
  // 1. Fetch the Advance Type to validate
  const [advanceType] = await db
    .select()
    .from(advanceTypeDefinitions)
    .where(eq(advanceTypeDefinitions.id, data.advanceTypeId))
    .limit(1);

  if (!advanceType) {
    throw new Error("Invalid Advance Type selected.");
  }
  if (!advanceType.isActive) {
    throw new Error("This Advance Type is currently inactive.");
  }

  // 1.5. Fetch the Employee to check tenure
  const [employee] = await db
    .select({ employmentStartDate: employees.employmentStartDate })
    .from(employees)
    .where(eq(employees.id, data.employeeId))
    .limit(1);

  if (!employee || !employee.employmentStartDate) {
    throw new Error("Invalid Employee or missing Date of Joining.");
  }

  // VALIDATION: minTenureDays check against employmentStartDate
  if (advanceType.minTenureDays && advanceType.minTenureDays > 0) {
    const doj = new Date(employee.employmentStartDate);
    const now = new Date();
    
    // Difference in days
    const diffTime = now.getTime() - doj.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < advanceType.minTenureDays) {
      throw new Error(`Employee does not meet the minimum tenure requirement. Required: ${advanceType.minTenureDays} days from Date of Joining. Found: ${diffDays < 0 ? 0 : diffDays} days.`);
    }
  }

  // 2. Validate Concurrent Advances Rule
  if (!advanceType.allowConcurrentAdvances) {
    const activeAdvances = await db
      .select()
      .from(employeeAdvanceRequests)
      .where(and(
        eq(employeeAdvanceRequests.employeeId, data.employeeId),
        or(
          eq(employeeAdvanceRequests.status, "PENDING"),
          and(
            eq(employeeAdvanceRequests.status, "APPROVED"),
            gt(employeeAdvanceRequests.remainingBalance, "0")
          )
        )
      ));
      
    if (activeAdvances.length > 0) {
      throw new Error("Employee already has an active advance and this advance type does not allow concurrent advances.");
    }
  }

  // 3. Validate PERCENTAGE_OF_EARNED_SALARY (50% of earned so far)
  let maxEligible = Infinity;
  if (advanceType.calculationBasis === 'PERCENTAGE_OF_EARNED_SALARY') {
    // Get employee pay config
    const [config] = await db.select().from(employeeSalaryStructures).where(and(eq(employeeSalaryStructures.employeeId, data.employeeId), eq(employeeSalaryStructures.isActive, true))).limit(1);
    if (!config) throw new Error("No active salary structure found for employee.");

    const components = await db.select().from(employeeSalaryStructureComponents).where(eq(employeeSalaryStructureComponents.structureId, config.id));
    const baseRate = components.reduce((sum, c) => sum + Number(c.amount), 0); // basic proxy for total earning config

    const now = new Date();
    let startOfCycle = new Date(now.getFullYear(), now.getMonth(), 1);

    // Fetch the last disbursed payroll run for this employee
    const { payslips, payrollRuns } = await import("@/db/schema");
    const { gte, lte, desc } = await import("drizzle-orm");
    const startStr = startOfCycle.toISOString().split('T')[0];
    const endStr = now.toISOString().split('T')[0];

    const [lastRun] = await db
      .select({ periodEnd: payrollRuns.periodEnd })
      .from(payslips)
      .innerJoin(payrollRuns, eq(payslips.payrollRunId, payrollRuns.id))
      .where(and(
        eq(payslips.employeeId, data.employeeId),
        gte(payrollRuns.periodStart, startStr),
        lte(payrollRuns.periodStart, endStr),
        eq(payrollRuns.status, 'LOCKED') // Only count actually disbursed/locked payrolls
      ))
      .orderBy(desc(payrollRuns.periodEnd))
      .limit(1);

    if (lastRun && lastRun.periodEnd) {
      // Start the current cycle on the day AFTER the last run ended
      startOfCycle = new Date(lastRun.periodEnd);
      startOfCycle.setDate(startOfCycle.getDate() + 1);
    }

    const attendance = await fetchValidatedAttendance(data.employeeId, config.payBasis as any, startOfCycle, now);
    
    // VALIDATION: minCycleDaysWorked and minimum 10 hours per day
    const minDaysRequired = advanceType.minCycleDaysWorked || 0;
    if (minDaysRequired > 0) {
      if (attendance.totalFullDays < minDaysRequired) {
        throw new Error(`Employee has not completed the minimum qualifying working days in the current unpaid cycle. Required: ${minDaysRequired} days. Found: ${attendance.totalFullDays} days.`);
      }
    }

    // Earned ratio for the unpaid cycle
    let multiplier = 0;
    if (config.payBasis === "HOURLY") {
       multiplier = attendance.totalWorkingHours;
    } else if (config.payBasis === "DAILY") {
       multiplier = attendance.totalFullDays + (0.5 * attendance.totalHalfDays);
    } else if (config.payBasis === "WEEKLY") {
       multiplier = (attendance.totalFullDays + (0.5 * attendance.totalHalfDays)) / 7;
    } else if (config.payBasis === "MONTHLY") {
       const calendarDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
       const payableDays = attendance.totalFullDays + (0.5 * attendance.totalHalfDays);
       multiplier = payableDays / calendarDays;
    }
    
    // The earned salary in the unpaid cycle (no need to subtract disbursed since we only queried the unpaid window)
    const earnedSalary = baseRate * multiplier;
    const percentage = advanceType.maxCapPercentage ? (advanceType.maxCapPercentage / 100) : 0.50;
    maxEligible = earnedSalary * percentage;

    if (data.requestedAmount > maxEligible) {
      throw new Error(`Requested amount exceeds the maximum eligible advance (₹${maxEligible.toFixed(2)}).`);
    }
  }

  // 4. Global Max Ceiling Check
  if (advanceType.maxCeilingAmount && Number(advanceType.maxCeilingAmount) > 0) {
    const ceiling = Number(advanceType.maxCeilingAmount);
    if (data.requestedAmount > ceiling) {
      throw new Error(`Requested amount exceeds the absolute maximum ceiling for this advance type (₹${ceiling.toFixed(2)}).`);
    }
  }

  const [request] = await db.insert(employeeAdvanceRequests).values({
    organizationId: data.organizationId,
    locationId: data.locationId as string,
    employeeId: data.employeeId,
    advanceTypeId: data.advanceTypeId,
    requestedAmount: data.requestedAmount.toString(),
    repaymentMonths: data.repaymentMonths,
    paymentMode: data.paymentMode,
    status: "PENDING",
    repaidAmount: "0",
    remainingBalance: "0",
  }).returning();

  return request;
}

export async function getAdvanceRequests(organizationId: string) {
  const requests = await db
    .select({
      id: employeeAdvanceRequests.id,
      requestedAmount: employeeAdvanceRequests.requestedAmount,
      approvedAmount: employeeAdvanceRequests.approvedAmount,
      repaymentMonths: employeeAdvanceRequests.repaymentMonths,
      status: employeeAdvanceRequests.status,
      createdAt: employeeAdvanceRequests.createdAt,
      employeeId: employees.id,
      employeeCode: employees.employeeCode,
      employeeName: people.displayName,
      advanceTypeName: advanceTypeDefinitions.name,
    })
    .from(employeeAdvanceRequests)
    .innerJoin(employees, eq(employeeAdvanceRequests.employeeId, employees.id))
    .innerJoin(people, eq(employees.personId, people.id))
    .innerJoin(advanceTypeDefinitions, eq(employeeAdvanceRequests.advanceTypeId, advanceTypeDefinitions.id))
    .where(eq(employeeAdvanceRequests.organizationId, organizationId))
    .orderBy(desc(employeeAdvanceRequests.createdAt));
    
  return requests;
}

export async function processAdvanceRequest(
  requestId: string,
  status: "APPROVED" | "REJECTED",
  approvedAmount?: number,
  repaymentMonths?: number
) {
  return await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(employeeAdvanceRequests)
      .where(eq(employeeAdvanceRequests.id, requestId))
      .limit(1);

    if (!existing) throw new Error("Request not found.");
    if (existing.status !== "PENDING") throw new Error("Only PENDING requests can be processed.");

    const payload: any = {
      status,
      updatedAt: new Date(),
    };

    if (status === "APPROVED") {
      if (!approvedAmount || !repaymentMonths) {
        throw new Error("Approved amount and repayment months are required for approval.");
      }
      payload.approvedAmount = approvedAmount.toString();
      payload.remainingBalance = approvedAmount.toString();
      payload.repaymentMonths = repaymentMonths;
    }

    const [updated] = await tx
      .update(employeeAdvanceRequests)
      .set(payload)
      .where(eq(employeeAdvanceRequests.id, requestId))
      .returning();

    // PHASE 4: Auto-Amortization Schedule Generation
    if (status === "APPROVED" && approvedAmount && repaymentMonths) {
      const baseInstallment = Math.floor(approvedAmount / repaymentMonths);
      const remainder = approvedAmount - (baseInstallment * repaymentMonths);

      const schedules = [];
      const now = new Date();
      let currentMonth = now.getMonth() + 1; // 1-12
      let currentYear = now.getFullYear();

      for (let i = 1; i <= repaymentMonths; i++) {
        // Distribute remainder to the first installment (or last, depending on preference)
        const amt = i === 1 ? baseInstallment + remainder : baseInstallment;

        // Advance to next month (assume deduction starts next calendar month)
        currentMonth += 1;
        if (currentMonth > 12) {
          currentMonth = 1;
          currentYear += 1;
        }

        const startDate = new Date(currentYear, currentMonth - 1, 1).toISOString().split('T')[0];
        const endDate = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0];

        schedules.push({
          advanceRequestId: updated.id,
          installmentNumber: i,
          cycleStartDate: startDate,
          cycleEndDate: endDate,
          deductionAmount: amt.toString(),
          status: "PENDING",
        });
      }

      const { advanceRepaymentSchedules } = await import("@/db/schema");
      await tx.insert(advanceRepaymentSchedules).values(schedules);
    }

    return updated;
  });
}
