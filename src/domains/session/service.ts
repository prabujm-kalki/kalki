import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { locations, organizations } from "@/db/schema";
import { loadAuthorizationGrants } from "@/lib/authorization";
import {
  employeePermissions,
  isEmployeeOperationAuthorized,
  type EmployeePermission,
} from "@/lib/authorization-policy";

type Actor = { id: string; name?: string | null; email?: string | null } | null;

const readablePermissions = [
  employeePermissions.read,
  employeePermissions.create,
  employeePermissions.update,
] as const;

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

function permissionsForScope(
  actorId: string,
  organizationId: string,
  locationId: string,
  grants: Awaited<ReturnType<typeof loadAuthorizationGrants>>,
) {
  return readablePermissions.filter((permission) => isEmployeeOperationAuthorized(
    { id: actorId },
    { organizationId, locationId, permission },
    grants,
  ));
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
    const permissions = permissionsForScope(actor.id, row.organizationId, row.locationId, grants) as EmployeePermission[];
    if (!grants.isOwner && !permissions.includes(employeePermissions.read)) return [];
    return [{
      organizationId: row.organizationId,
      locationId: row.locationId,
      organizationName: row.organizationName,
      locationName: row.locationName,
      organizationCode: row.organizationCode,
      locationCode: row.locationCode,
      permissions,
    }];
  });

  return {
    user: {
      id: actor.id,
      name: actor.name ?? null,
      email: actor.email ?? null,
    },
    isOwner: grants.isOwner,
    scopes,
  };
}
