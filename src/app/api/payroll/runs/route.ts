import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { payrollRuns } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const organizationId = url.searchParams.get("organizationId");
    const locationId = url.searchParams.get("locationId");

    if (!organizationId || !locationId) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const runs = await db.select()
      .from(payrollRuns)
      .where(
        and(
          eq(payrollRuns.organizationId, organizationId),
          eq(payrollRuns.locationId, locationId)
        )
      )
      .orderBy(desc(payrollRuns.runDate));

    return NextResponse.json({ runs });
  } catch (error: any) {
    console.error("Failed to fetch payroll runs:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
