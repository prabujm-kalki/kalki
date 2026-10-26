import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { locations, organizations, authUsers, employees, people } from "@/db/schema";
import { loadAuthorizationGrants } from "@/lib/authorization";

type Actor = { id: string; name?: string | null; email?: string | null } | null;

export class SessionServiceError extends Error {
  constructor(
    message: string,
    public readonly code: "AUTHENTICATION_REQUIRED",
  ) {
    super(message);
    this.name = "SessionServiceError";
  }
}

function requireActor(actor: Actor): asserts actor is { id: string; name?: string | null; email?: string | null } {
  if (!actor) throw new SessionServiceError("Authentication required", "AUTHENTICATION_REQUIRED");
}

export async function getSessionContext(actor: Actor) {
  requireActor(actor);
  const grants = await loadAuthorizationGrants(actor.id);
  const locationRows = grants.isOwner
    ? await db.select({
      organizationId: locations.organizationId,
      locationId: locations.id,
      organizationName: organizations.name,
      locationName: locations.name,
      organizationCode: organizations.code,
      locationCode: locations.code,
      organizationLogoUrl: organizations.logoUrl,
    }).from(locations).innerJoin(
      organizations,
      eq(organizations.id, locations.organizationId),
    ).where(and(eq(locations.isActive, true), eq(organizations.isActive, true))).orderBy(
      asc(organizations.name),
      asc(locations.name),
    )
    : grants.locationMemberships.length === 0
      ? []
      : await db.select({
        organizationId: locations.organizationId,
        locationId: locations.id,
        organizationName: organizations.name,
        locationName: locations.name,
        organizationCode: organizations.code,
        locationCode: locations.code,
        organizationLogoUrl: organizations.logoUrl,
      }).from(locations).innerJoin(
        organizations,
        eq(organizations.id, locations.organizationId),
      ).where(and(
        eq(locations.isActive, true),
        eq(organizations.isActive, true),
        inArray(locations.id, grants.locationMemberships.map((membership) => membership.locationId)),
      )).orderBy(asc(organizations.name), asc(locations.name));

  const scopes = locationRows.flatMap((row) => {
    if (!grants.isOwner && !grants.locationMemberships.some((membership) => (
      membership.organizationId === row.organizationId && membership.locationId === row.locationId
    ))) {
      return [];
    }
    
    // Aggregate all permissions for this specific scope
    const scopePermissions = new Set<string>();
    
    // Add organization-level permissions
    grants.organizationPermissions.forEach(p => {
      if (p.organizationId === row.organizationId) {
        scopePermissions.add(p.permission);
      }
    });
    
    // Add location-level permissions
    grants.locationPermissions.forEach(p => {
      if (p.organizationId === row.organizationId && p.locationId === row.locationId) {
        scopePermissions.add(p.permission);
      }
    });

    return [{
      organizationId: row.organizationId,
      locationId: row.locationId,
      organizationName: row.organizationName,
      locationName: row.locationName,
      organizationCode: row.organizationCode,
      locationCode: row.locationCode,
      organizationLogoUrl: row.organizationLogoUrl,
      permissions: Array.from(scopePermissions),
    }];
  });

  // Fetch avatar photo if available
  let userImage: string | null = null;
  const [empRecord] = await db
    .select({
      empPhoto: employees.photoUrl,
      personPhoto: people.photoUrl,
    })
    .from(employees)
    .leftJoin(people, eq(people.id, employees.personId))
    .where(eq(employees.userId, actor.id))
    .limit(1);

  if (empRecord?.empPhoto || empRecord?.personPhoto) {
    userImage = empRecord.empPhoto || empRecord.personPhoto || null;
  } else {
    const [authRow] = await db
      .select({ image: authUsers.image })
      .from(authUsers)
      .where(eq(authUsers.id, actor.id))
      .limit(1);
    userImage = authRow?.image || null;
  }

  return {
    user: {
      id: actor.id,
      name: actor.name ?? null,
      email: actor.email ?? null,
      image: userImage,
    },
    isOwner: grants.isOwner,
    scopes,
  };
}
