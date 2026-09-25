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

export function calculateMonthsElapsed(employmentStartDate: Date, today: Date = new Date()) {
  let monthsElapsed = 0;
  if (employmentStartDate <= today) {
    let startYear = employmentStartDate.getFullYear();
    let startMonth = employmentStartDate.getMonth();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    if (employmentStartDate.getDate() > 1) {
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

    if (startYear === currentYear && startMonth < currentMonth) {
      monthsElapsed = currentMonth - startMonth;
    }
  }
  return monthsElapsed;
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
  
  // Calculate eligible months in the current year.
  // Policy: Employees only earn leaves for fully completed calendar months.
  const monthsElapsed = calculateMonthsElapsed(employmentStartDate, today);

  for (const leaveType of activeLeaves) {
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

    await tx.insert(employeeLeaveBalances).values({
      organizationId,
      locationId,
      employeeId,
      leaveTypeId: leaveType.id,
      accrued: accruedAmount.toFixed(2),
      closingBalance: accruedAmount.toFixed(2)
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
    const monthsElapsed = calculateMonthsElapsed(empStartDate, today);

    for (const leaveType of activeLeaves) {
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
        const closingBal = accruedAmount + Number(balance.carriedForward) - Number(balance.taken);

        await tx.update(employeeLeaveBalances)
          .set({ 
            accrued: accruedAmount.toFixed(2),
            closingBalance: closingBal.toFixed(2),
            updatedAt: new Date()
          })
          .where(eq(employeeLeaveBalances.id, balance.id));
      } else {
        await tx.insert(employeeLeaveBalances).values({
          organizationId: emp.organizationId,
          locationId: emp.locationId,
          employeeId: emp.id,
          leaveTypeId: leaveType.id,
          accrued: accruedAmount.toFixed(2),
          closingBalance: accruedAmount.toFixed(2)
        });
      }
    }
  }
}
