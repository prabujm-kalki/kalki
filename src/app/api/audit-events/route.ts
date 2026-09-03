import { NextResponse } from "next/server";
import { listAuditEvents, AuditQueryError } from "@/domains/audit/query";
import { requireAuthenticatedUser } from "@/lib/authorization";

export async function GET(request: Request) {
  const user = await requireAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  try {
    return NextResponse.json({ auditEvents: await listAuditEvents(user, params) });
  } catch (error) {
    if (!(error instanceof AuditQueryError)) throw error;
    const status = error.code === "AUTHENTICATION_REQUIRED" ? 401 : error.code === "INVALID_INPUT" ? 400 : 403;
    return NextResponse.json({ error: error.message }, { status });
  }
}
