import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { payrollRuns, payslips, employees, people } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request, { params }: { params: Promise<{ runId: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { runId } = await params;
    console.log("API RECEIVED RUN ID:", runId);

    const runs = await db.select().from(payrollRuns).where(eq(payrollRuns.id, runId));
    if (runs.length === 0) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    const run = runs[0];

    const slips = await db
      .select({
        id: payslips.id,
        employeeCode: employees.employeeCode,
        employeeName: people.firstName,
        totalPresentDays: payslips.totalPresentDays,
        totalAbsentDays: payslips.totalAbsentDays,
        grossAmount: payslips.grossAmount,
        deductionsAmount: payslips.deductionsAmount,
        netAmount: payslips.netAmount,
        status: payslips.status,
      })
      .from(payslips)
      .innerJoin(employees, eq(employees.id, payslips.employeeId))
      .innerJoin(people, eq(people.id, employees.personId))
      .where(eq(payslips.payrollRunId, runId));

    return NextResponse.json({ run, payslips: slips });
  } catch (error: any) {
    console.error("Failed to fetch run details:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
