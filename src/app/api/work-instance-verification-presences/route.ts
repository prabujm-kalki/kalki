import { NextResponse } from "next/server";
import { z } from "zod";
import {
  captureVerification,
  validateEvidenceMetadata,
} from "@/domains/evidence/service";
import {
  getWorkInstanceVerificationPresence,
  RolesWorkServiceError,
} from "@/domains/roles-work/service";
import { requireAuthenticatedUser } from "@/lib/authorization";

const verificationPresenceScopeSchema = z.object({
  organizationId: z.string().uuid(),
  locationId: z.string().uuid(),
  workInstanceId: z.string().uuid(),
});

export async function GET(request: Request) {
  const user = await requireAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  const scope = verificationPresenceScopeSchema.safeParse(params);
  if (!scope.success) {
    return NextResponse.json(
      { error: "Organization, location, and work instance are required" },
      { status: 400 },
    );
  }
  try {
    return NextResponse.json({ verificationPresence: await getWorkInstanceVerificationPresence(user, scope.data) });
  } catch (error) {
    return serviceErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const user = await requireAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  try {
    const body = await request.json();
    validateEvidenceMetadata(body?.metadata);
    return NextResponse.json(
      { verificationPresence: await captureVerification(user, body) },
      { status: 201 },
    );
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
