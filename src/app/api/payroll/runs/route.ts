import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { payrollRuns, payslips } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");
    const locationId = searchParams.get("locationId");

    if (!organizationId || !locationId) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    // Fetch payroll runs and calculate sums of payslips
    const runs = await db.select({
      id: payrollRuns.id,
      periodStart: payrollRuns.periodStart,
      periodEnd: payrollRuns.periodEnd,
      runDate: payrollRuns.runDate,
      status: payrollRuns.status,
      payslipsCount: sql<number>`count(${payslips.id})`.mapWith(Number),
      totalGross: sql<number>`sum(CAST(${payslips.grossAmount} AS NUMERIC))`.mapWith(Number),
      totalNet: sql<number>`sum(CAST(${payslips.netAmount} AS NUMERIC))`.mapWith(Number)
    })
    .from(payrollRuns)
    .leftJoin(payslips, eq(payslips.payrollRunId, payrollRuns.id))
    .where(
      and(
        eq(payrollRuns.organizationId, organizationId),
        eq(payrollRuns.locationId, locationId)
      )
    )
    .groupBy(payrollRuns.id)
    .orderBy(desc(payrollRuns.runDate));

    return NextResponse.json(runs);
  } catch (error) {
    console.error("Error fetching payroll runs:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
