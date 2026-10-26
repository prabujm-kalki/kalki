import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { db } from "@/db";
import { organizations, locations, locationMemberships, organizationMemberships } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { requireAuthenticatedUser, loadAuthorizationGrants } from "@/lib/authorization";

export async function GET(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const grants = await loadAuthorizationGrants(user.id);
    if (!grants.isOwner) {
      return NextResponse.json({ error: "Forbidden: Only System Owners can view organizations list" }, { status: 403 });
    }

    const orgRows = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        code: organizations.code,
        isActive: organizations.isActive,
        logoUrl: organizations.logoUrl,
        createdAt: organizations.createdAt,
        updatedAt: organizations.updatedAt,
      })
      .from(organizations)
      .orderBy(asc(organizations.name));

    // Fetch location counts for each organization
    const locRows = await db
      .select({
        id: locations.id,
        organizationId: locations.organizationId,
        name: locations.name,
        code: locations.code,
        isActive: locations.isActive,
      })
      .from(locations)
      .orderBy(asc(locations.name));

    const orgsWithLocations = orgRows.map((org) => {
      const orgLocs = locRows.filter((loc) => loc.organizationId === org.id);
      return {
        ...org,
        locations: orgLocs,
        locationsCount: orgLocs.length,
      };
    });

    return NextResponse.json({ organizations: orgsWithLocations });
  } catch (error: any) {
    console.error("Failed to fetch organizations:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const grants = await loadAuthorizationGrants(user.id);
    if (!grants.isOwner) {
      return NextResponse.json({ error: "Forbidden: Only System Owners can create organizations" }, { status: 403 });
    }

    const body = await request.json();
    const { name, code, logoUrl, defaultLocationName, defaultLocationCode } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Organization Name is required" }, { status: 400 });
    }

    const trimmedName = name.trim();
    const trimmedCode = (code || trimmedName.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 10)).trim();

    if (!trimmedCode) {
      return NextResponse.json({ error: "Valid organization code is required" }, { status: 400 });
    }

    // Check code uniqueness
    const existing = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.code, trimmedCode))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json({ error: `Organization code "${trimmedCode}" already exists. Please choose a different code.` }, { status: 409 });
    }

    // Insert organization and optionally initial location within a transaction
    const result = await db.transaction(async (tx) => {
      const [newOrg] = await tx
        .insert(organizations)
        .values({
          name: trimmedName,
          code: trimmedCode,
          isActive: true,
          logoUrl: logoUrl || null,
        })
        .returning();

      // Automatically add System Owner as an active member of this organization
      await tx.insert(organizationMemberships).values({
        organizationId: newOrg.id,
        userId: user.id,
        isActive: true,
      });

      // If initial location details provided (or default location is created)
      let initialLoc = null;
      if (defaultLocationName && defaultLocationName.trim()) {
        const locName = defaultLocationName.trim();
        const locCode = (defaultLocationCode || locName.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 6)).trim();

        [initialLoc] = await tx
          .insert(locations)
          .values({
            organizationId: newOrg.id,
            name: locName,
            code: locCode,
            isActive: true,
          })
          .returning();

        // Assign membership to owner for this location
        await tx.insert(locationMemberships).values({
          organizationId: newOrg.id,
          locationId: initialLoc.id,
          userId: user.id,
          isActive: true,
        });
      }

      return { organization: newOrg, location: initialLoc };
    });

    return NextResponse.json({ success: true, ...result }, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create organization:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
