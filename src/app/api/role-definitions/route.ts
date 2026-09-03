import { NextResponse } from "next/server";
import { z } from "zod";
import { createRoleDefinition, getRoleDefinition, listRoleDefinitions, RolesWorkServiceError, setBusinessRoleActive } from "@/domains/roles-work/service";
import { requireAuthenticatedUser } from "@/lib/authorization";

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
  try { return NextResponse.json({ role: await createRoleDefinition(user, await request.json()) }, { status: 201 }); }
  catch (error) { return serviceErrorResponse(error); }
}

export async function PATCH(request: Request) {
  const user = await requireAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const roleId = new URL(request.url).searchParams.get("id");
  if (!roleId) return NextResponse.json({ error: "Role definition id is required" }, { status: 400 });
  try {
    const body = (await request.json()) as Record<string, unknown>;
    return NextResponse.json({
      role: await setBusinessRoleActive(user, {
        organizationId: String(body.organizationId ?? ""),
        locationId: String(body.locationId ?? ""),
        roleId,
        isActive: body.isActive as boolean,
      }),
    });
  } catch (error) { return serviceErrorResponse(error); }
}

function serviceErrorResponse(error: unknown) {
  if (!(error instanceof RolesWorkServiceError)) throw error;
  const status = error.code === "AUTHENTICATION_REQUIRED" ? 401 : error.code === "INVALID_INPUT" ? 400 : error.code === "NOT_FOUND" ? 404 : error.code === "DUPLICATE_RECORD" || error.code === "PREREQUISITE_NOT_SATISFIED" ? 409 : 403;
  return NextResponse.json({ error: error.message }, { status });
}
