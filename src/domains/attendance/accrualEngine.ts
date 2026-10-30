import { db } from "@/db";
import { 
  leaveTypes, 
  employees, 
  employeeLeaveBalances, 
  leaveAccrualExecutionLogs 
} from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function runLeaveAccruals() {
  const today = new Date();
  // Using local timezone date for logic
  const year = today.getFullYear();
  const month = today.getMonth() + 1; // 1-12
  const day = today.getDate();

  // Determine what type of accrual to run today
  const isStartOfYear = (month === 1 && day === 1);
  const isStartOfMonth = (day === 1);

  if (!isStartOfYear && !isStartOfMonth) {
    console.log("Not an accrual date (Not 1st of month or Jan 1st). Skipping.");
    return { success: true, message: "Not an accrual date." };
  }

  // Define frequencies to run today
  const frequenciesToRun: string[] = [];
  if (isStartOfMonth) frequenciesToRun.push("MONTHLY");
  if (isStartOfYear) frequenciesToRun.push("YEARLY");

  const results = [];

  for (const frequency of frequenciesToRun) {
    const executionDateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    // Idempotency check inside transaction
    try {
      await db.transaction(async (tx) => {
        // 1. Guardrail: Check if already run for this frequency and date
        const existingLog = await tx.select()
          .from(leaveAccrualExecutionLogs)
          .where(and(
            eq(leaveAccrualExecutionLogs.executionDate, executionDateStr),
            eq(leaveAccrualExecutionLogs.frequencyType, frequency),
            eq(leaveAccrualExecutionLogs.status, "SUCCESS")
          ))
          .limit(1);

        if (existingLog.length > 0) {
          console.log(`Accrual for ${frequency} already ran on ${executionDateStr}. Skipping.`);
          return; // Skip if already successful
        }

        // 2. Fetch active leave types for this frequency
        const activeLeaves = await tx.select()
          .from(leaveTypes)
          .where(and(
            eq(leaveTypes.isActive, true),
            eq(leaveTypes.accrualFrequency, frequency)
          ));

        if (activeLeaves.length === 0) {
          // Log success even if no leave types found
          await tx.insert(leaveAccrualExecutionLogs).values({
            executionDate: executionDateStr,
            frequencyType: frequency,
            status: "SUCCESS"
          });
          return;
        }

        // 3. Fetch active employees
        const activeEmployees = await tx.select()
          .from(employees)
          .where(eq(employees.isActive, true));

        // 4. Process accruals
        for (const leaveType of activeLeaves) {
          const amountToAdd = frequency === "YEARLY" 
            ? Number(leaveType.annualAllocation) 
            : Number(leaveType.accrualRate || 0);

          if (amountToAdd <= 0) continue;

          for (const emp of activeEmployees) {
            // CHECK IF EMPLOYEE IS ELIGIBLE (End-of-Month completion policy)
            if (frequency === "MONTHLY") {
              const hireDate = new Date(emp.employmentStartDate);
              // They are eligible today (e.g. Oct 1st) ONLY IF they completed the previous month.
              // Their hire date must be on or before the 1st of the previous month.
              const prevMonth1st = new Date(year, month - 2, 1); 
              if (hireDate > prevMonth1st) {
                 continue;
              }
            }
            // Check if a balance record exists
            const existingBalance = await tx.select()
              .from(employeeLeaveBalances)
              .where(and(
                eq(employeeLeaveBalances.employeeId, emp.id),
                eq(employeeLeaveBalances.leaveTypeId, leaveType.id)
              ))
              .limit(1);

            if (existingBalance.length > 0) {
              const balance = existingBalance[0];
              const newAccrued = Number(balance.accrued) + amountToAdd;
              const closingBal = newAccrued + Number(balance.carriedForward) - Number(balance.taken);

              await tx.update(employeeLeaveBalances)
                .set({
                  accrued: newAccrued.toFixed(2),
                  closingBalance: closingBal.toFixed(2),
                  updatedAt: new Date()
                })
                .where(eq(employeeLeaveBalances.id, balance.id));
            } else {
              // Create new balance record
              await tx.insert(employeeLeaveBalances).values({
                organizationId: emp.organizationId,
                locationId: emp.locationId,
                employeeId: emp.id,
                leaveTypeId: leaveType.id,
                accrued: amountToAdd.toFixed(2),
                taken: "0.00",
                carriedForward: "0.00",
                closingBalance: amountToAdd.toFixed(2)
              });
            }
          }
        }

        // 5. Log success
        await tx.insert(leaveAccrualExecutionLogs).values({
          executionDate: executionDateStr,
          frequencyType: frequency,
          status: "SUCCESS"
        });

      });
      
      results.push({ frequency, status: "SUCCESS" });
      console.log(`Accrual Engine completed successfully for ${frequency}`);

    } catch (error) {
      console.error(`Accrual Engine failed for ${frequency}:`, error);
      
      // Log failure outside transaction (so it persists even if tx rolled back)
      try {
        await db.insert(leaveAccrualExecutionLogs).values({
          executionDate: executionDateStr,
          frequencyType: frequency,
          status: "FAILED"
        });
      } catch (logError) {
        console.error("Failed to log failure state:", logError);
      }
      results.push({ frequency, status: "FAILED", error });
    }
  }

  return { success: true, results };
}

export function calculateMonthsElapsed(
  employmentStartDate: Date, 
  today: Date = new Date(),
  policyEffectiveDate?: Date | null
) {
  // If a policy effective date exists and the employee joined before it,
  // calculation begins from the policy effective date (e.g. 2026-11-01),
  // ensuring zero unearned historical accumulation.
  let effectiveStartDate = employmentStartDate;
  if (policyEffectiveDate && employmentStartDate < policyEffectiveDate) {
    effectiveStartDate = policyEffectiveDate;
  }

  let monthsElapsed = 0;
  if (effectiveStartDate <= today) {
    let startYear = effectiveStartDate.getFullYear();
    let startMonth = effectiveStartDate.getMonth();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    if (effectiveStartDate.getDate() > 1) {
      startMonth += 1;
      if (startMonth > 11) {
        startMonth = 0;
        startYear += 1;
      }
    }

    if (startYear < currentYear) {
      startYear = currentYear;
      startMonth = 0;
    }

    if (startYear === currentYear && startMonth <= currentMonth) {
      // E.g. If policy effective date is 2026-10-01 and today is 2026-10-28,
      // (10 - 10 + 1) = 1 month of opening entitlement is allocated immediately
      // so their dashboard is not blank.
      monthsElapsed = (currentMonth - startMonth) + 1;
    }
  }
  return monthsElapsed;
}

export function calculateEligibleCarryForward(
  employmentStartDate: Date,
  leaveType: { maxCarryForwardDays: string | null; annualAllocation: string | null; accrualRate?: string | null; policyEffectiveDate?: string | null },
  today: Date = new Date()
): number {
  const maxCarry = Number(leaveType.maxCarryForwardDays || 0);
  if (maxCarry <= 0) return 0;

  // If policy was introduced in the current year, there is NO historical carry-forward from prior years
  if (leaveType.policyEffectiveDate) {
    const policyYear = new Date(leaveType.policyEffectiveDate).getFullYear();
    const currentYear = today.getFullYear();
    if (policyYear >= currentYear) {
      return 0; // Brand new policy rollout has zero prior year carry-forward
    }
  }

  // An employee is eligible for carry-forward into the current calendar year
  // only if they were employed in a prior calendar year.
  const empStartYear = employmentStartDate.getFullYear();
  const currentYear = today.getFullYear();

  if (empStartYear < currentYear) {
    const annual = Number(leaveType.annualAllocation || 0);
    const policyStartDate = leaveType.policyEffectiveDate 
      ? new Date(leaveType.policyEffectiveDate) 
      : employmentStartDate;
    const effectiveStartDate = employmentStartDate > policyStartDate ? employmentStartDate : policyStartDate;

    // Calculate months in prior years (from effectiveStartDate up to Dec 31 of prior year)
    let priorMonths = 0;
    const priorYearEnd = new Date(currentYear - 1, 11, 31);
    if (effectiveStartDate <= priorYearEnd) {
      let sy = effectiveStartDate.getFullYear();
      let sm = effectiveStartDate.getMonth();
      if (effectiveStartDate.getDate() > 1) {
        sm += 1;
        if (sm > 11) { sm = 0; sy += 1; }
      }
      if (sy < currentYear) {
        priorMonths = ((currentYear - 1) - sy) * 12 + (12 - sm);
      }
    }

    const monthlyRate = Number(leaveType.accrualRate || (annual / 12));
    const totalPotentialCarry = Number((priorMonths * monthlyRate).toFixed(2));
    const eligibleAmount = Math.min(totalPotentialCarry > 0 ? totalPotentialCarry : maxCarry, maxCarry);
    return Math.max(0, eligibleAmount);
  }

  return 0;
}

export async function initializeEmployeeLeaves(
  tx: any, 
  employeeId: string, 
  organizationId: string, 
  locationId: string | null, 
  employmentStartDate: Date
) {
  // Fetch active leave types for the organization
  const activeLeaves = await tx.select()
    .from(leaveTypes)
    .where(and(
      eq(leaveTypes.isActive, true),
      eq(leaveTypes.organizationId, organizationId)
    ));

  if (activeLeaves.length === 0) return;

  const today = new Date();
  
  for (const leaveType of activeLeaves) {
    const policyDate = leaveType.policyEffectiveDate ? new Date(leaveType.policyEffectiveDate) : null;
    const monthsElapsed = calculateMonthsElapsed(employmentStartDate, today, policyDate);
    let accruedAmount = 0;
    
    if (leaveType.accrualFrequency === "YEARLY") {
      accruedAmount = Number(leaveType.annualAllocation);
    } else if (leaveType.accrualFrequency === "MONTHLY") {
      accruedAmount = monthsElapsed * Number(leaveType.accrualRate || 0);
    }

    // Cap at annual allocation to be safe
    if (accruedAmount < 0) accruedAmount = 0;
    if (accruedAmount > Number(leaveType.annualAllocation)) {
      accruedAmount = Number(leaveType.annualAllocation);
    }

    const carriedForwardAmount = calculateEligibleCarryForward(employmentStartDate, leaveType, today);
    const closingBal = accruedAmount + carriedForwardAmount;

    await tx.insert(employeeLeaveBalances).values({
      organizationId,
      locationId,
      employeeId,
      leaveTypeId: leaveType.id,
      accrued: accruedAmount.toFixed(2),
      taken: "0.00",
      carriedForward: carriedForwardAmount.toFixed(2),
      closingBalance: closingBal.toFixed(2)
    });
  }
}

export async function syncLeaveBalancesForOrganization(
  tx: any,
  organizationId: string,
  locationId: string | null = null
) {
  // Fetch active leave types for the organization
  let leaveTypesQuery = tx.select().from(leaveTypes).where(
    and(
      eq(leaveTypes.isActive, true),
      eq(leaveTypes.organizationId, organizationId)
    )
  );
  const activeLeaves = await leaveTypesQuery;
  
  if (activeLeaves.length === 0) return;

  // Fetch active employees
  let employeesQuery = tx.select().from(employees).where(
    and(
      eq(employees.isActive, true),
      eq(employees.organizationId, organizationId)
    )
  );
  const activeEmployees = await employeesQuery;

  if (activeEmployees.length === 0) return;

  const today = new Date();

  for (const emp of activeEmployees) {
    if (!emp.employmentStartDate) continue;
    const empStartDate = new Date(emp.employmentStartDate);

    for (const leaveType of activeLeaves) {
      const policyDate = leaveType.policyEffectiveDate ? new Date(leaveType.policyEffectiveDate) : null;
      const monthsElapsed = calculateMonthsElapsed(empStartDate, today, policyDate);
      let accruedAmount = 0;
      
      if (leaveType.accrualFrequency === "YEARLY") {
        accruedAmount = Number(leaveType.annualAllocation);
      } else if (leaveType.accrualFrequency === "MONTHLY") {
        accruedAmount = monthsElapsed * Number(leaveType.accrualRate || 0);
      }

      // Cap at annual allocation to be safe
      if (accruedAmount < 0) accruedAmount = 0;
      if (accruedAmount > Number(leaveType.annualAllocation)) {
        accruedAmount = Number(leaveType.annualAllocation);
      }

      // Determine carried forward amount
      const eligibleCarryForward = calculateEligibleCarryForward(empStartDate, leaveType, today);

      // Check if a balance record already exists
      const existingBalance = await tx.select()
        .from(employeeLeaveBalances)
        .where(and(
          eq(employeeLeaveBalances.employeeId, emp.id),
          eq(employeeLeaveBalances.leaveTypeId, leaveType.id)
        ))
        .limit(1);

      if (existingBalance.length > 0) {
        const balance = existingBalance[0];
        // Update carried forward to the policy's calculated eligible carry-forward
        const carriedForwardToApply = eligibleCarryForward;
        const closingBal = Math.max(0, accruedAmount + carriedForwardToApply - Number(balance.taken || 0));

        await tx.update(employeeLeaveBalances)
          .set({ 
            accrued: accruedAmount.toFixed(2),
            carriedForward: carriedForwardToApply.toFixed(2),
            closingBalance: closingBal.toFixed(2),
            updatedAt: new Date()
          })
          .where(eq(employeeLeaveBalances.id, balance.id));
      } else {
        const closingBal = accruedAmount + eligibleCarryForward;
        await tx.insert(employeeLeaveBalances).values({
          organizationId: emp.organizationId,
          locationId: emp.locationId,
          employeeId: emp.id,
          leaveTypeId: leaveType.id,
          accrued: accruedAmount.toFixed(2),
          taken: "0.00",
          carriedForward: eligibleCarryForward.toFixed(2),
          closingBalance: closingBal.toFixed(2)
        });
      }
    }
  }
}
