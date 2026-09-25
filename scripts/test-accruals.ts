import { db } from "../src/db";
import { 
  leaveTypes, 
  employees, 
  employeeLeaveBalances, 
  leaveAccrualExecutionLogs 
} from "../src/db/schema";
import { eq, and } from "drizzle-orm";

export async function runLeaveAccrualsForce() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1; // 1-12
  const day = today.getDate();

  // Define frequencies to run today
  const frequenciesToRun = ["MONTHLY", "YEARLY"];
  const results = [];

  for (const frequency of frequenciesToRun) {
    const executionDateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    try {
      await db.transaction(async (tx) => {
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
          return;
        }

        const activeLeaves = await tx.select()
          .from(leaveTypes)
          .where(and(
            eq(leaveTypes.isActive, true),
            eq(leaveTypes.accrualFrequency, frequency)
          ));

        if (activeLeaves.length === 0) {
          await tx.insert(leaveAccrualExecutionLogs).values({
            executionDate: executionDateStr,
            frequencyType: frequency,
            status: "SUCCESS"
          });
          return;
        }

        const activeEmployees = await tx.select()
          .from(employees)
          .where(eq(employees.isActive, true));

        for (const leaveType of activeLeaves) {
          const amountToAdd = frequency === "YEARLY" 
            ? Number(leaveType.annualAllocation) 
            : Number(leaveType.accrualRate || 0);

          if (amountToAdd <= 0) continue;

          for (const emp of activeEmployees) {
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

async function test() {
  console.log("Starting forced test...");
  try {
    const res = await runLeaveAccrualsForce();
    console.log("Result:", res);
  } catch(e) {
    console.error(e);
  }
}

test();
