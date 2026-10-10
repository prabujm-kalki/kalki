import { NextResponse } from "next/server";
import { z } from "zod";
import { createRoleDefinition, getRoleDefinition, listRoleDefinitions, RolesWorkServiceError, setBusinessRoleActive, setRoleChecklistActive, setRoleChecklistItemActive, setRoleKpiActive, setRoleResponsibilityActive, setRoleResponsibilityWorkDefinition } from "@/domains/roles-work/service";
import { requireAuthenticatedUser } from "@/lib/authorization";
import { db } from "@/db";
import { businessRoles } from "@/db/schema";
import { eq } from "drizzle-orm";

const scopeSchema = z.object({ organizationId: z.string().uuid(), locationId: z.string().uuid() });

export async function GET(request: Request) {
  const user = await requireAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  const scope = scopeSchema.safeParse(params);
  if (!scope.success) return NextResponse.json({ error: "Organization and location are required" }, { status: 400 });
  try {
    const role = params.id ? await getRoleDefinition(user, scope.data, params.id) : undefined;
    return NextResponse.json(role ? { role } : { roles: await listRoleDefinitions(user, scope.data) });
  } catch (error) { return serviceErrorResponse(error); }
}

export async function POST(request: Request) {
  const user = await requireAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const organizationId = String(body.organizationId ?? "");
    const identifier = String(body.identifier ?? "");
    const name = String(body.name ?? "");
    const purpose = String(body.purpose ?? "");
    const departmentId = body.departmentId ? String(body.departmentId) : null;
    const reportsToRoleId = body.reportsToRoleId ? String(body.reportsToRoleId) : null;
    
    // Support for location-specific vs global roles
    const isGlobal = body.isGlobal === true;
    const locationId = isGlobal ? null : String(body.locationId ?? "");
    
    let finalIdentifier = identifier;
    if (!isGlobal && locationId) {
      finalIdentifier = `${identifier}_${locationId.substring(0, 8).toUpperCase()}`;
    } else if (isGlobal) {
      const { loadAuthorizationGrants } = await import("@/lib/authorization");
      const grants = await loadAuthorizationGrants(user.id);
      const isOrgAdmin = grants.isOwner || grants.organizationPermissions.some(p => p.organizationId === organizationId);
      if (!isOrgAdmin) {
        return NextResponse.json({ error: "Only organization admins can create global roles" }, { status: 403 });
      }
    }

    const [role] = await db.insert(businessRoles).values({
      organizationId,
      locationId: locationId || null, // null if empty string
      identifier: finalIdentifier,
      name,
      purpose,
      departmentId,
      reportsToRoleId,
    }).returning({ id: businessRoles.id });

    return NextResponse.json({ role });
  } catch (error) { 
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create role" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const user = await requireAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const roleId = new URL(request.url).searchParams.get("id");
  if (!roleId) return NextResponse.json({ error: "Role definition id is required" }, { status: 400 });
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const scope = {
      organizationId: String(body.organizationId ?? ""),
      locationId: String(body.locationId ?? ""),
      roleId,
      isActive: body.isActive as boolean,
    };

    if (typeof body.name === "string") {
      const isGlobal = body.isGlobal === true;
      const locationId = isGlobal ? null : String(body.locationId ?? "");

      let finalIdentifier = String(body.identifier ?? "");
      if (!isGlobal && locationId) {
        const suffix = `_${locationId.substring(0, 8).toUpperCase()}`;
        if (!finalIdentifier.endsWith(suffix)) {
          finalIdentifier = `${finalIdentifier}${suffix}`;
        }
      } else if (isGlobal) {
        const { loadAuthorizationGrants } = await import("@/lib/authorization");
        const grants = await loadAuthorizationGrants(user.id);
        const isOrgAdmin = grants.isOwner || grants.organizationPermissions.some(p => p.organizationId === scope.organizationId);
        if (!isOrgAdmin) {
          return NextResponse.json({ error: "Only organization admins can update global roles" }, { status: 403 });
        }
      }

      const [role] = await db.update(businessRoles)
        .set({
          name: body.name,
          purpose: String(body.purpose ?? ""),
          departmentId: body.departmentId ? String(body.departmentId) : null,
          reportsToRoleId: body.reportsToRoleId ? String(body.reportsToRoleId) : null,
          identifier: finalIdentifier,
          locationId: locationId || null,
        })
        .where(eq(businessRoles.id, roleId))
        .returning({ id: businessRoles.id });
      return NextResponse.json({ role });
    }

    const childKeys = [
      typeof body.responsibilityId === "string" ? "responsibilityId" : null,
      typeof body.kpiId === "string" ? "kpiId" : null,
      typeof body.checklistId === "string" ? "checklistId" : null,
      typeof body.checklistItemId === "string" ? "checklistItemId" : null,
    ].filter((key) => key !== null);
    if (childKeys.length > 1) {
      return NextResponse.json({ error: "Role configuration status can update one child at a time" }, { status: 400 });
    }
    if (typeof body.checklistItemId === "string") {
      return NextResponse.json({ role: await setRoleChecklistItemActive(user, { ...scope, checklistItemId: body.checklistItemId }) });
    }
    if (typeof body.checklistId === "string") {
      return NextResponse.json({ role: await setRoleChecklistActive(user, { ...scope, checklistId: body.checklistId }) });
    }
    if (typeof body.kpiId === "string") {
      return NextResponse.json({ role: await setRoleKpiActive(user, { ...scope, kpiId: body.kpiId }) });
    }
    if (typeof body.responsibilityId === "string") {
      if (Object.prototype.hasOwnProperty.call(body, "workSituationDefinitionId")) {
        if (typeof body.isActive === "boolean") {
          return NextResponse.json({ error: "Role responsibility status and work definition reference cannot be updated together" }, { status: 400 });
        }
        return NextResponse.json({
          role: await setRoleResponsibilityWorkDefinition(user, {
            organizationId: scope.organizationId,
            locationId: scope.locationId,
            roleId,
            responsibilityId: body.responsibilityId,
            workSituationDefinitionId: body.workSituationDefinitionId === null ? null : String(body.workSituationDefinitionId ?? ""),
          }),
        });
      }
      return NextResponse.json({ role: await setRoleResponsibilityActive(user, { ...scope, responsibilityId: body.responsibilityId }) });
    }
    return NextResponse.json({
      role: await setBusinessRoleActive(user, scope),
    });
  } catch (error) { return serviceErrorResponse(error); }
}

function serviceErrorResponse(error: unknown) {
  if (!(error instanceof RolesWorkServiceError)) throw error;
  const status = error.code === "AUTHENTICATION_REQUIRED" ? 401 : error.code === "INVALID_INPUT" ? 400 : error.code === "NOT_FOUND" ? 404 : error.code === "DUPLICATE_RECORD" || error.code === "PREREQUISITE_NOT_SATISFIED" ? 409 : 403;
  return NextResponse.json({ error: error.message }, { status });
}
