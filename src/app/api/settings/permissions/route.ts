import { NextResponse } from "next/server";
import { db } from "@/db";
import { permissions } from "@/db/schema";
import { requireAuthenticatedUser } from "@/lib/authorization";
import { asc, notInArray } from "drizzle-orm";
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
