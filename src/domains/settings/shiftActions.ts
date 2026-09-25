"use server";

import { db } from "@/db";
import { shiftDefinitions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function getShifts(organizationId: string, locationId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) throw new Error("Unauthorized");

  const shifts = await db.select().from(shiftDefinitions).where(
    and(
      eq(shiftDefinitions.organizationId, organizationId),
      eq(shiftDefinitions.locationId, locationId)
    )
  );
  return shifts;
}

export async function saveShift(payload: {
  id?: string;
  organizationId: string;
  locationId: string;
  code: string;
  name: string;
  startTime: string;
  endTime: string;
  gracePeriodMinutes: number;
  minHoursHalfDay: string;
  minHoursFullDay: string;
  restBreakMinutes: number;
  isActive: boolean;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Basic Auth Check (In real app, check permissions)
  if (payload.id) {
    await db.update(shiftDefinitions)
      .set({
        name: payload.name,
        code: payload.code,
        startTime: payload.startTime,
        endTime: payload.endTime,
        gracePeriodMinutes: payload.gracePeriodMinutes,
        minHoursHalfDay: payload.minHoursHalfDay,
        minHoursFullDay: payload.minHoursFullDay,
        restBreakMinutes: payload.restBreakMinutes,
        isActive: payload.isActive,
        updatedAt: new Date()
      })
      .where(eq(shiftDefinitions.id, payload.id));
  } else {
    await db.insert(shiftDefinitions).values({
      organizationId: payload.organizationId,
      locationId: payload.locationId,
      name: payload.name,
      code: payload.code,
      startTime: payload.startTime,
      endTime: payload.endTime,
      gracePeriodMinutes: payload.gracePeriodMinutes,
      minHoursHalfDay: payload.minHoursHalfDay,
      minHoursFullDay: payload.minHoursFullDay,
      restBreakMinutes: payload.restBreakMinutes,
      isActive: payload.isActive
    });
  }
  return { success: true };
}
