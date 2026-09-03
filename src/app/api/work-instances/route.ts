import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createWorkInstance,
  getWorkInstance,
  listWorkInstances,
  RolesWorkServiceError,
  transitionWorkInstance,
  type TransitionWorkInstanceInput,
} from "@/domains/roles-work/service";
import { requireAuthenticatedUser } from "@/lib/authorization";

const scopeSchema = z.object({
  organizationId: z.string().uuid(),
  locationId: z.string().uuid(),
});

export async function GET(request: Request) {
  const user = await requireAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  const scope = scopeSchema.safeParse(params);
  if (!scope.success) {
    return NextResponse.json({ error: "Organization and location are required" }, { status: 400 });
  }
  try {
    const instance = params.id ? await getWorkInstance(user, scope.data, params.id) : undefined;
    const listQuery = {
      ...scope.data,
      ...(params.state ? { state: params.state } : {}),
      ...(params.assignedEmployeeId ? { assignedEmployeeId: params.assignedEmployeeId } : {}),
      ...(params.workSituationDefinitionId ? { workSituationDefinitionId: params.workSituationDefinitionId } : {}),
      ...(params.sourceReference ? { sourceReference: params.sourceReference } : {}),
    };
    return NextResponse.json(
      instance ? { workInstance: instance } : { workInstances: await listWorkInstances(user, listQuery) },
    );
  } catch (error) {
    return serviceErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const user = await requireAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  try {
    return NextResponse.json({ workInstance: await createWorkInstance(user, await request.json()) }, { status: 201 });
  } catch (error) {
    return serviceErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  const user = await requireAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const instanceId = new URL(request.url).searchParams.get("id");
  if (!instanceId) return NextResponse.json({ error: "Work instance id is required" }, { status: 400 });
  try {
    const body = (await request.json()) as Record<string, unknown>;
    return NextResponse.json({
      workInstance: await transitionWorkInstance(user, {
        organizationId: String(body.organizationId ?? ""),
        locationId: String(body.locationId ?? ""),
        instanceId,
        state: body.state as TransitionWorkInstanceInput["state"],
      }),
    });
  } catch (error) {
    return serviceErrorResponse(error);
  }
}

function serviceErrorResponse(error: unknown) {
  if (!(error instanceof RolesWorkServiceError)) throw error;
  const status =
    error.code === "AUTHENTICATION_REQUIRED"
      ? 401
      : error.code === "INVALID_INPUT" || error.code === "INVALID_TRANSITION"
        ? 400
        : error.code === "NOT_FOUND"
          ? 404
          : error.code === "DUPLICATE_RECORD" || error.code === "PREREQUISITE_NOT_SATISFIED"
            ? 409
            : 403;
  return NextResponse.json({ error: error.message }, { status });
}
