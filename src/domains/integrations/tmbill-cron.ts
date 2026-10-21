import { db } from "@/db";
import { tmbillConfigs, tmbillSyncLogs, employees } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { TMBillService } from "./tmbill.service";

/**
 * Formats a Date object as "YYYY-MM-DD HH:mm:ss" in local time.
 */
function formatDateTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mi = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

/**
 * Calculates the start and end timestamps for the current sync window based on
 * the location's configured businessDayStartTime (e.g. "06:00" or "02:00").
 */
function getBusinessDayRange(businessDayStartTime: string = "06:00") {
  const [hStr, mStr] = businessDayStartTime.split(":");
  const startHour = parseInt(hStr || "6", 10);
  const startMinute = parseInt(mStr || "0", 10);

  const now = new Date();
  let startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    startHour,
    startMinute,
    0,
    0
  );

  // If the current time is before today's business day cutoff, the business day began yesterday
  if (
    now.getHours() < startHour ||
    (now.getHours() === startHour && now.getMinutes() < startMinute)
  ) {
    startOfToday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
  }

  // Sync from the beginning of this business day up through right now
  const fromDate = formatDateTime(startOfToday);
  const toDate = formatDateTime(now);

  return { fromDate, toDate };
}

/**
 * Executes automated TMBill sales sync for all active configurations where
 * autoSyncEnabled is true and the sync interval has elapsed.
 */
export async function runTMBillAutoSync() {
  // 1. Fetch all configurations that have auto-sync enabled
  const activeConfigs = await db
    .select()
    .from(tmbillConfigs)
    .where(eq(tmbillConfigs.autoSyncEnabled, true));

  if (activeConfigs.length === 0) {
    return { success: true, processedCount: 0, message: "No active TMBill configs with auto-sync enabled." };
  }

  // 2. Fetch a valid employee ID to act as createdUserId for sales invoices
  const [firstEmployee] = await db.select().from(employees).limit(1);
  const systemUserId = firstEmployee?.id || "00000000-0000-0000-0000-000000000000";

  let syncedCount = 0;
  const now = new Date();

  for (const config of activeConfigs) {
    try {
      const intervalMinutes = config.autoSyncIntervalMinutes || 60;

      // 3. Check when this configuration last ran a sync
      const logConditions = [
        eq(tmbillSyncLogs.organizationId, config.organizationId),
      ];
      if (config.locationId) {
        logConditions.push(eq(tmbillSyncLogs.locationId, config.locationId));
      }

      const [lastLog] = await db
        .select()
        .from(tmbillSyncLogs)
        .where(and(...logConditions))
        .orderBy(desc(tmbillSyncLogs.startedAt))
        .limit(1);

      if (lastLog?.startedAt) {
        const lastSyncTime = new Date(lastLog.startedAt).getTime();
        const elapsedMinutes = (now.getTime() - lastSyncTime) / (1000 * 60);

        // If the interval has not elapsed yet, skip this cycle
        if (elapsedMinutes < intervalMinutes) {
          continue;
        }
      }

      // 4. Calculate sync date range based on businessDayStartTime
      const { fromDate, toDate } = getBusinessDayRange(config.businessDayStartTime);

      console.log(
        `[TMBILL AUTO-SYNC] Running auto-sync for Org: ${config.organizationId}, Loc: ${config.locationId || "ALL"} from ${fromDate} to ${toDate}`
      );

      // 5. Instantiate service, pull orders from TMBill API, and push to sales invoices
      const service = new TMBillService(config.organizationId, config.locationId);
      const syncResult = await service.syncOrders(fromDate, toDate);
      const invoicesCreated = await service.pushToSalesInvoices(systemUserId, fromDate, toDate);

      console.log(
        `[TMBILL AUTO-SYNC] Completed. Orders processed: ${syncResult?.totalProcessed || 0}, Invoices created: ${invoicesCreated}`
      );

      syncedCount++;
    } catch (err) {
      console.error(
        `[TMBILL AUTO-SYNC ERROR] Failed syncing for Org ${config.organizationId}, Loc ${config.locationId}:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  return { success: true, processedCount: syncedCount };
}
