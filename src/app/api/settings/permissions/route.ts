import { NextResponse } from "next/server";
import { db } from "@/db";
import { permissions, rolePermissions } from "@/db/schema";
import { requireAuthenticatedUser } from "@/lib/authorization";
import { asc, notInArray, eq } from "drizzle-orm";
import { SYSTEM_PERMISSIONS } from "@/lib/permissions.config";

export async function GET(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Build list of all active codes from config
    const activeCodes = new Set<string>();
    for (const config of SYSTEM_PERMISSIONS) {
      for (const action of config.actions) {
        activeCodes.add(`${config.module}.${config.submodule}:${action}`);
      }
    }
    const activeCodesArray = Array.from(activeCodes);

    // Sync config with database
    const existing = await db.select().from(permissions);
    const existingCodes = new Set(existing.map((p) => p.code));

    // Insert new ones
    const toInsert = [];
    for (const code of activeCodesArray) {
      if (!existingCodes.has(code)) {
        toInsert.push({ code, name: code });
      }
    }

    if (toInsert.length > 0) {
      await db.insert(permissions).values(toInsert).onConflictDoNothing();
    }

    // Auto-migrate role assignments from legacy tasks.tasks permissions to new task submodules
    const legacyTaskPerms = existing.filter((p) => p.code.startsWith("tasks.tasks:"));
    if (legacyTaskPerms.length > 0) {
      const allActivePerms = await db.select().from(permissions);
      const permMap = new Map(allActivePerms.map((p) => [p.code, p.id]));

      for (const legacyPerm of legacyTaskPerms) {
        const action = legacyPerm.code.split(":")[1];
        const assignedRoles = await db
          .select()
          .from(rolePermissions)
          .where(eq(rolePermissions.permissionId, legacyPerm.id));

        for (const roleAssignment of assignedRoles) {
          const targetCodes: string[] = [];
          if (action === "read") {
            targetCodes.push(
              "tasks.routines_&_queue:read",
              "tasks.supervisor_audit:read",
              "tasks.history_&_compliance:read",
              "tasks.configuration:read"
            );
          } else if (action === "create") {
            targetCodes.push(
              "tasks.routines_&_queue:create",
              "tasks.configuration:create"
            );
          } else if (action === "update") {
            targetCodes.push(
              "tasks.routines_&_queue:update",
              "tasks.supervisor_audit:update",
              "tasks.supervisor_audit:approve",
              "tasks.configuration:update"
            );
          } else if (action === "delete") {
            targetCodes.push(
              "tasks.routines_&_queue:delete",
              "tasks.configuration:delete"
            );
          }

          for (const targetCode of targetCodes) {
            const targetId = permMap.get(targetCode);
            if (targetId) {
              await db
                .insert(rolePermissions)
                .values({
                  roleId: roleAssignment.roleId,
                  permissionId: targetId,
                })
                .onConflictDoNothing();
            }
          }
        }
      }
    }

    // Delete obsolete ones
    const obsoleteCodes = Array.from(existingCodes).filter(code => !activeCodes.has(code));
    if (obsoleteCodes.length > 0) {
      await db.delete(permissions).where(notInArray(permissions.code, activeCodesArray));
    }

    const allPermissions = await db.select().from(permissions).orderBy(asc(permissions.code));
    return NextResponse.json(allPermissions);
  } catch (error) {
    console.error("Failed to fetch permissions:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
