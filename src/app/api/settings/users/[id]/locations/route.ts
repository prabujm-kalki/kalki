import { NextResponse } from "next/server";
import { db } from "@/db";
import { locationMemberships, locations } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuthenticatedUser } from "@/lib/authorization";
import { getOrganizationForUser } from "@/lib/get-organization-for-user";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("organizationId") || await getOrganizationForUser(user.id);
    if (!orgId) return NextResponse.json({ error: "No organization found" }, { status: 400 });

    const { id: userId } = await params;

    // Fetch all locations for the organization
    const allOrgLocations = await db
      .select({
        id: locations.id,
        name: locations.name,
        code: locations.code,
        isActive: locations.isActive,
      })
      .from(locations)
      .where(and(eq(locations.organizationId, orgId), eq(locations.isActive, true)));

    // Fetch user's active location memberships
    const userMemberships = await db
      .select({
        locationId: locationMemberships.locationId,
      })
      .from(locationMemberships)
      .where(
        and(
          eq(locationMemberships.userId, userId),
          eq(locationMemberships.organizationId, orgId),
          eq(locationMemberships.isActive, true)
        )
      );

    const assignedLocationIds = userMemberships.map((m) => m.locationId);

    return NextResponse.json({
      locations: allOrgLocations,
      assignedLocationIds,
    });
  } catch (error) {
    console.error("Failed to fetch user locations:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: userId } = await params;
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const orgId = body.organizationId || searchParams.get("organizationId") || await getOrganizationForUser(user.id);
    if (!orgId) return NextResponse.json({ error: "No organization found" }, { status: 400 });

    const { locationId, enabled, allLocations } = body;

    // Handle "Grant All Locations" or "Revoke All Locations" bulk action
    if (typeof allLocations === "boolean") {
      if (allLocations) {
        // Fetch all locations in org
        const allOrgLocs = await db
          .select({ id: locations.id })
          .from(locations)
          .where(and(eq(locations.organizationId, orgId), eq(locations.isActive, true)));

        for (const loc of allOrgLocs) {
          const existing = await db
            .select()
            .from(locationMemberships)
            .where(
              and(
                eq(locationMemberships.userId, userId),
                eq(locationMemberships.organizationId, orgId),
                eq(locationMemberships.locationId, loc.id)
              )
            )
            .limit(1);

          if (existing.length === 0) {
            await db.insert(locationMemberships).values({
              userId,
              organizationId: orgId,
              locationId: loc.id,
              isActive: true,
            });
          } else if (!existing[0].isActive) {
            await db
              .update(locationMemberships)
              .set({ isActive: true })
              .where(eq(locationMemberships.id, existing[0].id));
          }
        }
      } else {
        // Revoke all
        await db
          .delete(locationMemberships)
          .where(
            and(
              eq(locationMemberships.userId, userId),
              eq(locationMemberships.organizationId, orgId)
            )
          );
      }
      return NextResponse.json({ success: true });
    }

    if (!locationId || typeof enabled !== "boolean") {
      return NextResponse.json({ error: "locationId and enabled are required" }, { status: 400 });
    }

    if (enabled) {
      const existing = await db
        .select()
        .from(locationMemberships)
        .where(
          and(
            eq(locationMemberships.userId, userId),
            eq(locationMemberships.organizationId, orgId),
            eq(locationMemberships.locationId, locationId)
          )
        )
        .limit(1);

      if (existing.length === 0) {
        await db.insert(locationMemberships).values({
          userId,
          organizationId: orgId,
          locationId,
          isActive: true,
        });
      } else if (!existing[0].isActive) {
        await db
          .update(locationMemberships)
          .set({ isActive: true })
          .where(eq(locationMemberships.id, existing[0].id));
      }
    } else {
      await db
        .delete(locationMemberships)
        .where(
          and(
            eq(locationMemberships.userId, userId),
            eq(locationMemberships.organizationId, orgId),
            eq(locationMemberships.locationId, locationId)
          )
        );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update user locations:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
