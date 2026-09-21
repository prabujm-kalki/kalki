import { NextResponse } from "next/server";
import { db } from "@/db";
import { roles, businessRoles, organizationMemberships } from "@/db/schema";
import { requireAuthenticatedUser } from "@/lib/authorization";
import { eq, ne, and } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Hide the OWNER role from the UI completely
    const allRoles = await db.select().from(roles).where(ne(roles.code, "OWNER"));
    return NextResponse.json(allRoles);
  } catch (error) {
    console.error("Failed to fetch roles:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { name, code } = body;

    if (!name || !code) {
      return NextResponse.json({ error: "Name and code are required" }, { status: 400 });
    }

    // Get the user's active organization to mirror the role
    const activeOrgs = await db.select().from(organizationMemberships)
      .where(and(eq(organizationMemberships.userId, user.id), eq(organizationMemberships.isActive, true)))
      .limit(1);
      
    if (activeOrgs.length === 0) {
      return NextResponse.json({ error: "User has no active organization" }, { status: 400 });
    }

    const orgId = activeOrgs[0].organizationId;

    // Use a transaction to ensure both are created simultaneously and consistently
    const newRole = await db.transaction(async (tx) => {
      const [insertedRole] = await tx.insert(roles).values({
        name,
        code,
      }).returning();

      // Mirror creation to businessRoles with the exact SAME ID to unify the system
      await tx.insert(businessRoles).values({
        id: insertedRole.id,
        organizationId: orgId,
        name: insertedRole.name,
        identifier: insertedRole.code,
        purpose: `Unified application role for ${insertedRole.name}`,
        isActive: true,
      });

      return insertedRole;
    });

    return NextResponse.json(newRole);
  } catch (error) {
    console.error("Failed to create role:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
