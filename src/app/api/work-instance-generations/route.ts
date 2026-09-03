import { NextResponse } from "next/server";
import { generateWorkInstance, RolesWorkServiceError } from "@/domains/roles-work/service";
import { requireAuthenticatedUser } from "@/lib/authorization";

export async function POST(request: Request) {
  const user = await requireAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  try {
    return NextResponse.json({ workInstance: await generateWorkInstance(user, await request.json()) }, { status: 201 });
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
