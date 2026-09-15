import { NextResponse } from "next/server";
import { db } from "@/db";
import { permissions, rolePermissions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuthenticatedUser } from "@/lib/authorization";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: roleId } = await params;

    // Fetch all existing permissions assigned to this role
    const assignedPermissions = await db.select({
      id: permissions.id,
      code: permissions.code,
      name: permissions.name,
    })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(rolePermissions.roleId, roleId));

    return NextResponse.json(assignedPermissions);
  } catch (error) {
    console.error("Failed to fetch role permissions:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: roleId } = await params;
    const body = await request.json();
    const { code, name, enabled } = body;

    if (!code || typeof enabled !== "boolean") {
      return NextResponse.json({ error: "code and enabled are required" }, { status: 400 });
    }

    // 1. Ensure the permission exists in the permissions table (create if not)
    let [perm] = await db.select().from(permissions)
      .where(eq(permissions.code, code))
      .limit(1);

    if (!perm) {
      const [newPerm] = await db.insert(permissions).values({ code, name: name || code }).returning();
      perm = newPerm;
    }

    // 2. Toggle the assignment in rolePermissions
    if (enabled) {
      // Upsert/Insert
      const exists = await db.select().from(rolePermissions)
        .where(and(eq(rolePermissions.roleId, roleId), eq(rolePermissions.permissionId, perm.id)))
        .limit(1);
      
      if (exists.length === 0) {
        await db.insert(rolePermissions).values({ roleId, permissionId: perm.id });
      }
    } else {
      // Delete
      await db.delete(rolePermissions)
        .where(and(eq(rolePermissions.roleId, roleId), eq(rolePermissions.permissionId, perm.id)));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update role permission:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
