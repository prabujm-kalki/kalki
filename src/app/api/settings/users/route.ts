import { NextResponse } from "next/server";
import { db } from "@/db";
import { authUsers, organizationMemberships, employees, people, locations, systemAuthorities } from "@/db/schema";
import { requireAuthenticatedUser, loadAuthorizationGrants } from "@/lib/authorization";
import { eq, and, sql } from "drizzle-orm";
import { getOrganizationForUser } from "@/lib/get-organization-for-user";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const grants = await loadAuthorizationGrants(user.id);
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("organizationId") || await getOrganizationForUser(user.id);
    if (!orgId) return NextResponse.json({ error: "No organization found" }, { status: 400 });

    const includeSystemOwners = searchParams.get("includeSystemOwners") === "true";

    // Query users that have an active membership in the selected organization
    const orgUsers = await db
      .select({
        id: authUsers.id,
        name: authUsers.name,
        image: authUsers.image,
        phone: people.phone,
        photoUrl: sql<string | null>`COALESCE(${employees.photoUrl}, ${people.photoUrl})`,
        employeeCode: employees.employeeCode,
        locationId: employees.locationId,
        locationName: locations.name,
        isSystemOwner: sql<boolean>`CASE WHEN ${systemAuthorities.authority} = 'OWNER' THEN true ELSE false END`,
      })
      .from(organizationMemberships)
      .innerJoin(authUsers, eq(organizationMemberships.userId, authUsers.id))
      .leftJoin(systemAuthorities, and(eq(systemAuthorities.userId, authUsers.id), eq(systemAuthorities.authority, "OWNER")))
      .leftJoin(employees, and(eq(employees.userId, authUsers.id), eq(employees.organizationId, orgId)))
      .leftJoin(people, eq(employees.personId, people.id))
      .leftJoin(locations, eq(employees.locationId, locations.id))
      .where(
        and(
          eq(organizationMemberships.organizationId, orgId),
          eq(organizationMemberships.isActive, true)
        )
      )
      .orderBy(authUsers.name);

    // Always exclude System Owner accounts from the organization directory
    const filteredUsers = orgUsers.filter((u) => !u.isSystemOwner);

    return NextResponse.json(filteredUsers);
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
