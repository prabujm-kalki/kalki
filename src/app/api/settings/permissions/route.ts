import { NextResponse } from "next/server";
import { db } from "@/db";
import { permissions } from "@/db/schema";
import { requireAuthenticatedUser } from "@/lib/authorization";
import { asc, inArray } from "drizzle-orm";
import { SYSTEM_PERMISSIONS } from "@/lib/permissions.config";

export async function GET(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Sync config with database
    const existing = await db.select().from(permissions);
    const existingCodes = new Set(existing.map((p) => p.code));

    const toInsert = [];
    for (const config of SYSTEM_PERMISSIONS) {
      for (const action of config.actions) {
        const code = `${config.module}.${config.submodule}:${action}`;
        if (!existingCodes.has(code)) {
          // Special fallback for employee:read -> employee.general:read logic? 
          // Actually, our old permissions were just "employee:read". 
          // For consistency with the old data and avoid breaking existing assignments,
          // if it's 'employee' module and 'general' submodule, map to "employee:action".
          const legacyCode = config.module === "employee" && config.submodule === "general" 
            ? `employee:${action}` 
            : code;
            
          if (!existingCodes.has(legacyCode)) {
            toInsert.push({ code: legacyCode, name: legacyCode });
          }
        }
      }
    }

    if (toInsert.length > 0) {
      await db.insert(permissions).values(toInsert).onConflictDoNothing();
    }

    const allPermissions = await db.select().from(permissions).orderBy(asc(permissions.code));
    return NextResponse.json(allPermissions);
  } catch (error) {
    console.error("Failed to fetch permissions:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
