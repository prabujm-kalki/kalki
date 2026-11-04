"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { closeDay, unlockDayClose, getDayCloseContext, EODDenomination } from "./eod-service";
import { getSessionContext } from "@/domains/session/service";
import { TMBillService } from "@/domains/integrations/tmbill.service";
import { db } from "@/db";
import { employees } from "@/db/schema";

const eodSchema = z.object({
  organizationId: z.string().uuid(),
  locationId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  denominations: z.array(z.object({
    denomination: z.number().positive(),
    count: z.number().min(0)
  })),
  declaredUpi: z.number().min(0).optional().default(0),
  openingCashOverride: z.number().min(0).optional(),
});

export async function syncTMBillForDayClose(organizationId: string, locationId: string, date: string) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session || !session.user) {
      return { error: "Unauthorized" };
    }

    const tmbillService = new TMBillService(organizationId, locationId);
    
    // Format sync window for the selected date from 00:00:00 to now (or 23:59:59 if date is in past)
    const todayStr = new Date().toISOString().split("T")[0];
    const isToday = date === todayStr;
    const fromDate = `${date} 00:00:00`;
    
    let toDate = `${date} 23:59:59`;
    if (isToday) {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      toDate = `${date} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    }

    const syncResult = await tmbillService.syncOrders(fromDate, toDate);

    // Push synced orders into sales invoices and receipts
    const firstEmployee = await db.select().from(employees).limit(1);
    const systemUserId = firstEmployee.length > 0 ? firstEmployee[0].id : "00000000-0000-0000-0000-000000000000";
    const pushedCount = await tmbillService.pushToSalesInvoices(systemUserId, fromDate, toDate);

    return { 
      success: true, 
      data: {
        totalProcessed: syncResult?.totalProcessed || 0,
        pushedCount,
        syncedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      }
    };
  } catch (error: any) {
    console.error("syncTMBillForDayClose Error:", error);
    return { error: error.message || "Failed to sync TMBill data" };
  }
}

export async function fetchDayCloseContext(organizationId: string, locationId: string, date: string) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session || !session.user) {
      return { error: "Unauthorized" };
    }

    const data = await getDayCloseContext(organizationId, locationId, date);
    return { success: true, data };
  } catch (error: any) {
    console.error("fetchDayCloseContext Error:", error);
    return { error: error.message || "Failed to fetch day close context" };
  }
}

export async function submitDayClose(input: z.infer<typeof eodSchema>) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session || !session.user) {
      return { error: "Unauthorized" };
    }

    const validated = eodSchema.parse(input);

    const result = await closeDay(
      validated.organizationId,
      validated.locationId,
      validated.date,
      session.user.id,
      validated.denominations,
      validated.declaredUpi,
      validated.openingCashOverride
    );

    return { success: true, data: result.data };
  } catch (error: any) {
    console.error("EOD Close Error:", error);
    return { error: error.message || "Failed to close the day" };
  }
}

export async function reopenDayClose(organizationId: string, locationId: string, date: string) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session || !session.user) {
      return { error: "Unauthorized" };
    }

    const grants = await getSessionContext(session.user);
    if (!grants.isOwner) {
      return { error: "Permission Denied: Only Super Admin / Owners can reopen and edit a closed date." };
    }

    await unlockDayClose(organizationId, locationId, date, session.user.id);
    return { success: true };
  } catch (error: any) {
    console.error("reopenDayClose Error:", error);
    return { error: error.message || "Failed to reopen day close" };
  }
}
