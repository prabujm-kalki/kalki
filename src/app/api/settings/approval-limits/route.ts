import { NextResponse } from "next/server";
import { db } from "@/db";
import { approvalLimits } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuthenticatedUser } from "@/lib/authorization";

export async function GET(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(request.url);
    const orgId = url.searchParams.get("organizationId");
    if (!orgId) return NextResponse.json({ error: "organizationId is required" }, { status: 400 });

    const limits = await db.select().from(approvalLimits).where(eq(approvalLimits.organizationId, orgId));
    return NextResponse.json({ limits });
  } catch (error) {
    console.error("GET approval-limits error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { organizationId, limits } = body;

    if (!organizationId) {
      return NextResponse.json({ error: "organizationId is required" }, { status: 400 });
    }

    if (!Array.isArray(limits)) {
      return NextResponse.json({ error: "limits must be an array" }, { status: 400 });
    }

    // Delete existing limits for this organization
    await db.delete(approvalLimits).where(eq(approvalLimits.organizationId, organizationId));

    // Insert new limits
    if (limits.length > 0) {
      const newLimits = limits.map((l: any) => ({
        organizationId,
        roleId: l.roleId,
        module: l.module || 'purchase_orders',
        maxLimit: String(l.maxLimit),
        isActive: l.isActive !== undefined ? l.isActive : true,
      }));
      await db.insert(approvalLimits).values(newLimits);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST approval-limits error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
