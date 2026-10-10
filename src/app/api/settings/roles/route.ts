import { NextResponse } from "next/server";
import { db } from "@/db";
import { roles, businessRoles, organizationMemberships } from "@/db/schema";
import { requireAuthenticatedUser } from "@/lib/authorization";
import { eq, ne, and, sql } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get("locationId");
    const organizationId = searchParams.get("organizationId");

    let condition = ne(roles.code, "OWNER");
    
    if (organizationId) {
      condition = and(condition, eq(roles.organizationId, organizationId)) as any;
    }
    
    // We only want roles that are Global (locationId IS NULL) 
    // OR belong to the specific location.
    if (locationId) {
      condition = and(
        condition, 
        sql`(${roles.locationId} IS NULL OR ${roles.locationId} = ${locationId})`
      ) as any;
    }

    const allRoles = await db.select().from(roles).where(condition);
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
    const { name, code, organizationId, locationId } = body;

    if (!name || !code) {
      return NextResponse.json({ error: "Name and code are required" }, { status: 400 });
    }

    // Get the user's active organization to mirror the role
    let orgId = organizationId;
    if (!orgId) {
      const activeOrgs = await db.select().from(organizationMemberships)
        .where(and(eq(organizationMemberships.userId, user.id), eq(organizationMemberships.isActive, true)))
        .limit(1);
        
      if (activeOrgs.length === 0) {
        return NextResponse.json({ error: "User has no active organization" }, { status: 400 });
      }
      orgId = activeOrgs[0].organizationId;
    }

    const [newRole] = await db.insert(roles).values({
      name,
      code,
      organizationId: orgId,
      locationId: locationId || null,
    }).returning();

    return NextResponse.json(newRole);
  } catch (error) {
    console.error("Failed to create role:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
