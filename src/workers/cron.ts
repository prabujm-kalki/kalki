import cron from "node-cron";
import { runLeaveAccruals } from "../domains/attendance/accrualEngine";
import { generateDailyStockTasks } from "../domains/purchasing/stockAssessmentTasks";
import { runEscalationSweeper } from "../domains/tasks/sweeper";

// Helper for error logging
const logError = (taskName: string, error: unknown) => {
  console.error(`[CRON ERROR] ${taskName} failed:`, error instanceof Error ? error.message : error);
};

// 0. Minute-by-Minute Universal Escalation Sweeper
cron.schedule("* * * * *", async () => {
  try {
    const result = await runEscalationSweeper();
    if (result.success && result.escalatedCount > 0) {
      console.log(`[CRON] Sweeper escalated ${result.escalatedCount} task(s).`);
    }
  } catch (error) {
    logError("Universal Escalation Sweeper", error);
  }
});

// 0. Hourly Task Engine Check for Daily Stock Assessment
cron.schedule("0 * * * *", async () => {
  console.log("[CRON] Checking for Scheduled Daily Stock Assessment Tasks...");
  try {
    const result = await generateDailyStockTasks();
    if (result.success && result.tasksCreated && result.tasksCreated > 0) {
      console.log(`[CRON] Daily Stock Tasks generated successfully. Count: ${result.tasksCreated}`);
    }
  } catch (error) {
    logError("Daily Stock Assessment Tasks", error);
  }
});

// 1. Monthly Accrual: Runs at 00:01 on the 1st of every month
// Minute: 1, Hour: 0, Day of Month: 1, Month: *, Day of Week: *
cron.schedule("1 0 1 * *", async () => {
  console.log("[CRON] Executing Monthly Leave Accruals...");
  try {
    const result = await runLeaveAccruals();
    if (result.success) {
      console.log("[CRON] Monthly Leave Accruals completed successfully.");
    } else {
      console.warn("[CRON] Monthly Leave Accruals completed with warnings/issues:", result);
    }
  } catch (error) {
    logError("Monthly Leave Accruals", error);
  }
});

// 2. Yearly Accrual: Runs at 00:01 on January 1st
// Minute: 1, Hour: 0, Day of Month: 1, Month: 1, Day of Week: *
cron.schedule("1 0 1 1 *", async () => {
  console.log("[CRON] Executing Yearly Leave Accruals...");
  try {
    const result = await runLeaveAccruals();
    if (result.success) {
      console.log("[CRON] Yearly Leave Accruals completed successfully.");
    } else {
      console.warn("[CRON] Yearly Leave Accruals completed with warnings/issues:", result);
    }
  } catch (error) {
    logError("Yearly Leave Accruals", error);
  }
});

console.log("[CRON] Workers initialized. Listening for scheduled tasks...");
