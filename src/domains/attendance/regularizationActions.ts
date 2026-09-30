"use server";

import { db } from "@/db";
import { attendanceRegularizationRequests, rawBiometricPunches, employees } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getSessionContext } from "@/domains/session/service";

export async function submitRegularizationRequest(payload: {
  date: string;
  requestedPunchType: string;
  requestedTime: Date;
  reason: string;
  organizationId: string;
  locationId: string;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) throw new Error("Unauthorized");
  
  const context = await getSessionContext(session.user);
  const scope = context.scopes.find(s => s.organizationId === payload.organizationId && s.locationId === payload.locationId);
  if (!scope) throw new Error("Forbidden");

  const empRecords = await db.select().from(employees).where(
    and(eq(employees.userId, session.user.id), eq(employees.organizationId, payload.organizationId))
  );
  const employee = empRecords[0];
  if (!employee) throw new Error("Employee not found");

  // Validate if punch type already exists on this date
  const startOfDay = new Date(payload.date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(payload.date);
  endOfDay.setHours(23, 59, 59, 999);

  const { gte, lte } = await import("drizzle-orm");

  const existingPunches = await db.select().from(rawBiometricPunches).where(
    and(
      eq(rawBiometricPunches.employeeId, employee.id),
      gte(rawBiometricPunches.punchTimestamp, startOfDay),
      lte(rawBiometricPunches.punchTimestamp, endOfDay)
    )
  );

  if (existingPunches.some(p => p.punchType === payload.requestedPunchType)) {
    return { error: `You have already recorded a ${payload.requestedPunchType.replace("_", " ")} on this date.` };
  }

  // Validate chronological order
  const tempPunches = [...existingPunches, { punchType: payload.requestedPunchType, punchTimestamp: payload.requestedTime }];

  const pi = tempPunches.find(p => p.punchType === "PUNCH_IN")?.punchTimestamp;
  const bi = tempPunches.find(p => p.punchType === "BREAK_IN")?.punchTimestamp;
  const bo = tempPunches.find(p => p.punchType === "BREAK_OUT")?.punchTimestamp;
  const po = tempPunches.find(p => p.punchType === "PUNCH_OUT")?.punchTimestamp;

  if (pi && bi && pi.getTime() > bi.getTime()) return { error: "Break In time cannot be earlier than Punch In time." };
  if (bi && bo && bi.getTime() > bo.getTime()) return { error: "Break Out time cannot be earlier than Break In time." };
  if (bo && po && bo.getTime() > po.getTime()) return { error: "Punch Out time cannot be earlier than Break Out time." };
  if (pi && po && pi.getTime() > po.getTime()) return { error: "Punch Out time cannot be earlier than Punch In time." };
  if (pi && bo && pi.getTime() > bo.getTime()) return { error: "Break Out time cannot be earlier than Punch In time." };
  if (bi && po && bi.getTime() > po.getTime()) return { error: "Punch Out time cannot be earlier than Break In time." };

  const existingRequests = await db.select().from(attendanceRegularizationRequests).where(
    and(
      eq(attendanceRegularizationRequests.employeeId, employee.id),
      eq(attendanceRegularizationRequests.date, payload.date),
      eq(attendanceRegularizationRequests.requestedPunchType, payload.requestedPunchType),
      eq(attendanceRegularizationRequests.status, "PENDING")
    )
  );

  if (existingRequests.length > 0) {
    return { error: `A regularization request for this date and punch type has already been submitted.` };
  }

  await db.insert(attendanceRegularizationRequests).values({
    organizationId: payload.organizationId,
    locationId: payload.locationId,
    employeeId: employee.id,
    date: payload.date,
    requestedPunchType: payload.requestedPunchType,
    requestedTime: payload.requestedTime,
    reason: payload.reason,
    status: "PENDING",
  });

  return { success: true };
}

export async function getMissingPunchTypesForDate(date: string, organizationId: string, locationId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) throw new Error("Unauthorized");
  
  const empRecords = await db.select().from(employees).where(
    and(eq(employees.userId, session.user.id), eq(employees.organizationId, organizationId))
  );
  const employee = empRecords[0];
  if (!employee) return [];

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const { gte, lte } = await import("drizzle-orm");

  const existingPunches = await db.select().from(rawBiometricPunches).where(
    and(
      eq(rawBiometricPunches.employeeId, employee.id),
      gte(rawBiometricPunches.punchTimestamp, startOfDay),
      lte(rawBiometricPunches.punchTimestamp, endOfDay)
    )
  );

  const hasPI = existingPunches.some(p => p.punchType === "PUNCH_IN");
  const hasBI = existingPunches.some(p => p.punchType === "BREAK_IN");
  const hasBO = existingPunches.some(p => p.punchType === "BREAK_OUT");
  const hasPO = existingPunches.some(p => p.punchType === "PUNCH_OUT");

  const available = [];
  if (!hasPI) available.push({ value: "PUNCH_IN", label: "Punch IN" });
  if (!hasBI) available.push({ value: "BREAK_IN", label: "Break IN" });
  if (!hasBO) available.push({ value: "BREAK_OUT", label: "Break OUT" });
  if (!hasPO) available.push({ value: "PUNCH_OUT", label: "Punch OUT" });

  return available;
}

export async function processRegularizationRequest(requestId: string, action: "APPROVE" | "REJECT") {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) throw new Error("Unauthorized");
  
  const context = await getSessionContext(session.user);
  
  const requests = await db.select().from(attendanceRegularizationRequests).where(eq(attendanceRegularizationRequests.id, requestId));
  const req = requests[0];
  if (!req) throw new Error("Request not found");

  const scope = context.scopes.find(s => s.organizationId === req.organizationId && s.locationId === req.locationId);
  if (!scope) throw new Error("Forbidden");
  
  // Basic RBAC: owner or manager
  if (!context.isOwner) {
    const hasApprovalsAccess = scope.permissions.includes("attendance.approvals:execute");
    if (!hasApprovalsAccess) throw new Error("Forbidden: Missing approvals permission");
  }

  const managerRecords = await db.select().from(employees).where(
    and(eq(employees.userId, session.user.id), eq(employees.organizationId, req.organizationId))
  );
  const managerId = managerRecords[0]?.id;

  if (action === "REJECT") {
    await db.update(attendanceRegularizationRequests)
      .set({ status: "REJECTED", approvedBy: managerId })
      .where(eq(attendanceRegularizationRequests.id, requestId));
    return { success: true };
  }

  // If APPROVE
  await db.transaction(async (tx) => {
    await tx.update(attendanceRegularizationRequests)
      .set({ status: "APPROVED", approvedBy: managerId })
      .where(eq(attendanceRegularizationRequests.id, requestId));

    // Fetch employee to get biometricId
    const emps = await tx.select().from(employees).where(eq(employees.id, req.employeeId));
    const emp = emps[0];

    await tx.insert(rawBiometricPunches).values({
      organizationId: req.organizationId,
      locationId: req.locationId,
      employeeId: req.employeeId,
      biometricId: emp?.biometricId || req.employeeId,
      punchTimestamp: req.requestedTime,
      punchType: req.requestedPunchType,
      sourceType: "MANUAL_REGULARIZATION",
      machineId: "SYSTEM",
    });
  });

  return { success: true };
}
