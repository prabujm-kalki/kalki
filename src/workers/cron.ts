import cron from "node-cron";
import { runLeaveAccruals } from "../domains/attendance/accrualEngine";

// Helper for error logging
const logError = (taskName: string, error: unknown) => {
  console.error(`[CRON ERROR] ${taskName} failed:`, error instanceof Error ? error.message : error);
};

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
