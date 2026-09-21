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
    
    // Check if it's the old single-permission format or the new batch format
    if (body.permissions && Array.isArray(body.permissions)) {
      // Batch mode
      const permissionIds: string[] = body.permissions;
      
      await db.transaction(async (tx) => {
        await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
        if (permissionIds.length > 0) {
          const insertData = permissionIds.map(id => ({ roleId, permissionId: id }));
          await tx.insert(rolePermissions).values(insertData);
        }
      });
      return NextResponse.json({ success: true });
    }

    // Legacy single-mode for backward compatibility
    const { code, name, enabled } = body;
    if (!code || typeof enabled !== "boolean") {
      return NextResponse.json({ error: "code and enabled are required" }, { status: 400 });
    }

    let [perm] = await db.select().from(permissions)
      .where(eq(permissions.code, code))
      .limit(1);

    if (!perm) {
      const [newPerm] = await db.insert(permissions).values({ code, name: name || code }).returning();
      perm = newPerm;
    }

    if (enabled) {
      const exists = await db.select().from(rolePermissions)
        .where(and(eq(rolePermissions.roleId, roleId), eq(rolePermissions.permissionId, perm.id)))
        .limit(1);
      if (exists.length === 0) {
        await db.insert(rolePermissions).values({ roleId, permissionId: perm.id });
      }
    } else {
      await db.delete(rolePermissions)
        .where(and(eq(rolePermissions.roleId, roleId), eq(rolePermissions.permissionId, perm.id)));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update role permission:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
