import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSessionContext } from "@/domains/session/service";
import { getOrComputeBranchIntelligence } from "@/domains/purchasing/branchIntelligenceService";

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("organizationId");
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const forceRefresh = searchParams.get("forceRefresh") === "true";

    const context = await getSessionContext(session.user);
    const organizationId = orgId || context.scopes[0]?.organizationId;

    if (!organizationId) {
      return NextResponse.json({ error: "Missing organizationId" }, { status: 400 });
    }

    const result = await getOrComputeBranchIntelligence(organizationId, {
      startDate,
      endDate,
      forceRefresh,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result.data);
  } catch (error: any) {
    console.error("GET /api/purchasing/branch-intelligence error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
