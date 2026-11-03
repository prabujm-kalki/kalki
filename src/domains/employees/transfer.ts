import { db } from "@/db";
import { 
  employees, 
  employeeHistoryBranch, 
  locationMemberships, 
  employeeRoleAssignments, 
  auditEvents, 
  people, 
  locations,
  shiftDefinitions
} from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { authorizeEmployeeOperation } from "@/lib/authorization";
import { employeePermissions } from "@/lib/authorization-policy";

export type Actor = { id: string } | null;

export interface TransferEmployeePayload {
  employeeId: string;
  targetLocationId: string;
  effectiveDate: string; // YYYY-MM-DD
  targetShiftId?: string | null;
  targetRoleId?: string | null;
  syncUserAccess?: boolean;
  notes?: string | null;
}

export async function transferEmployeeBranch(
  actor: Actor,
  payload: TransferEmployeePayload
) {
  if (!actor?.id) {
    throw new Error("Authentication required");
  }

  const [currentEmp] = await db
    .select({
      id: employees.id,
      organizationId: employees.organizationId,
      locationId: employees.locationId,
      userId: employees.userId,
      employeeCode: employees.employeeCode,
      defaultShiftId: employees.defaultShiftId,
      status: employees.status,
      displayName: people.displayName,
      personId: people.id,
    })
    .from(employees)
    .innerJoin(people, eq(employees.personId, people.id))
    .where(eq(employees.id, payload.employeeId))
    .limit(1);

  if (!currentEmp) {
    throw new Error("Employee not found.");
  }

  // Access check: actor must have update permission for current branch
  const authorized = await authorizeEmployeeOperation({
    userId: actor.id,
    organizationId: currentEmp.organizationId,
    locationId: currentEmp.locationId,
    permission: employeePermissions.update,
  });

  if (!authorized) {
    throw new Error("You do not have permission to transfer employees from this branch.");
  }

  if (currentEmp.locationId === payload.targetLocationId) {
    throw new Error("Employee is already assigned to this branch.");
  }

  // Validate target location
  const [targetLoc] = await db
    .select()
    .from(locations)
    .where(
      and(
        eq(locations.id, payload.targetLocationId),
        eq(locations.organizationId, currentEmp.organizationId),
        eq(locations.isActive, true)
      )
    )
    .limit(1);

  if (!targetLoc) {
    throw new Error("Target location not found or inactive.");
  }

  const [sourceLoc] = await db
    .select()
    .from(locations)
    .where(eq(locations.id, currentEmp.locationId))
    .limit(1);

  const actorEmployeeRows = await db
    .select({ id: employees.id })
    .from(employees)
    .where(eq(employees.userId, actor.id))
    .limit(1);
  const recordedByEmployeeId = actorEmployeeRows[0]?.id ?? null;

  const effectiveFromDate = new Date(`${payload.effectiveDate}T00:00:00+05:30`);
  const now = new Date();

  return await db.transaction(async (tx) => {
    // 1. Update Employee record
    const employeeUpdates: Record<string, any> = {
      locationId: payload.targetLocationId,
      updatedAt: now,
    };

    if (payload.targetShiftId !== undefined) {
      employeeUpdates.defaultShiftId = payload.targetShiftId || null;
    }

    await tx
      .update(employees)
      .set(employeeUpdates)
      .where(eq(employees.id, currentEmp.id));

    // 2. Insert Branch Transfer History
    await tx.insert(employeeHistoryBranch).values({
      organizationId: currentEmp.organizationId,
      employeeId: currentEmp.id,
      locationId: payload.targetLocationId,
      effectiveFrom: effectiveFromDate,
      recordedBy: recordedByEmployeeId,
      recordedAt: now,
    });

    // 3. Sync User System Login Access (if user account exists and syncUserAccess is true)
    if (payload.syncUserAccess && currentEmp.userId) {
      // Check if membership for target location exists
      const existingMemberships = await tx
        .select()
        .from(locationMemberships)
        .where(
          and(
            eq(locationMemberships.userId, currentEmp.userId),
            eq(locationMemberships.organizationId, currentEmp.organizationId),
            eq(locationMemberships.locationId, payload.targetLocationId)
          )
        )
        .limit(1);

      if (existingMemberships.length === 0) {
        await tx.insert(locationMemberships).values({
          userId: currentEmp.userId,
          organizationId: currentEmp.organizationId,
          locationId: payload.targetLocationId,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
      } else if (!existingMemberships[0].isActive) {
        await tx
          .update(locationMemberships)
          .set({ isActive: true, updatedAt: now })
          .where(eq(locationMemberships.id, existingMemberships[0].id));
      }
    }

    // 4. Update Role Assignment if targetRoleId is provided
    if (payload.targetRoleId) {
      // Deactivate active roles from source branch
      await tx
        .update(employeeRoleAssignments)
        .set({ isActive: false, updatedAt: now })
        .where(
          and(
            eq(employeeRoleAssignments.employeeId, currentEmp.id),
            eq(employeeRoleAssignments.organizationId, currentEmp.organizationId)
          )
        );

      // Assign new role at target branch
      await tx.insert(employeeRoleAssignments).values({
        organizationId: currentEmp.organizationId,
        employeeId: currentEmp.id,
        roleId: payload.targetRoleId,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    // 5. Immutable Audit Event
    await tx.insert(auditEvents).values({
      organizationId: currentEmp.organizationId,
      locationId: payload.targetLocationId,
      actorUserId: actor.id,
      eventType: "EMPLOYEE_BRANCH_TRANSFERRED",
      action: "TRANSFER",
      entityType: "employee",
      entityId: currentEmp.id,
      metadata: {
        fromLocationId: currentEmp.locationId,
        fromLocationName: sourceLoc?.name || "Unknown",
        toLocationId: payload.targetLocationId,
        toLocationName: targetLoc.name,
        effectiveDate: payload.effectiveDate,
        targetShiftId: payload.targetShiftId,
        targetRoleId: payload.targetRoleId,
        notes: payload.notes || undefined,
      },
      createdAt: now,
    });

    return {
      success: true,
      employeeId: currentEmp.id,
      fromLocationName: sourceLoc?.name,
      toLocationName: targetLoc.name,
    };
  });
}
