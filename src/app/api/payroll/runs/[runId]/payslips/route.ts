import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { payslips, payrollRuns, employees, people } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: Request, 
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { runId } = await params;

    if (!runId) {
      return NextResponse.json({ error: "Missing runId" }, { status: 400 });
    }

    const [run] = await db.select().from(payrollRuns).where(eq(payrollRuns.id, runId));
    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    const slipRows = await db.select({
      payslip: payslips,
      employee: {
        employeeCode: employees.employeeCode,
        name: people.firstName
      }
    })
    .from(payslips)
    .innerJoin(employees, eq(employees.id, payslips.employeeId))
    .innerJoin(people, eq(people.id, employees.personId))
    .where(eq(payslips.payrollRunId, runId));

    return NextResponse.json({ run, payslips: slipRows });
  } catch (error: any) {
    console.error("Error fetching payslips for run:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
