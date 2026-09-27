import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { payrollRuns, payslips, salaryAdvances } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(request: Request, { params }: { params: Promise<{ runId: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { runId } = await params;

    const runs = await db.select().from(payrollRuns).where(eq(payrollRuns.id, runId));
    if (runs.length === 0) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    if (runs[0].status !== "DRAFT") {
      return NextResponse.json({ error: "Only DRAFT payroll runs can be locked." }, { status: 400 });
    }

    await db.transaction(async (tx) => {
      // 1. Lock the Run
      await tx.update(payrollRuns)
        .set({ status: "LOCKED", updatedAt: new Date() })
        .where(eq(payrollRuns.id, runId));
      
      // 2. Lock the Payslips
      await tx.update(payslips)
        .set({ status: "LOCKED", updatedAt: new Date() })
        .where(eq(payslips.payrollRunId, runId));

      // 3. Mark mapped salary advances as PAID
      // First, get the employee IDs in this run
      const runPayslips = await tx.select({ employeeId: payslips.employeeId }).from(payslips).where(eq(payslips.payrollRunId, runId));
      
      for (const slip of runPayslips) {
        // Any pending advance set to deduct from payroll should be considered collected
        await tx.update(salaryAdvances)
          .set({ status: "PAID", updatedAt: new Date() })
          .where(
            and(
              eq(salaryAdvances.employeeId, slip.employeeId),
              eq(salaryAdvances.status, "PENDING"),
              eq(salaryAdvances.repaymentMethod, "DEDUCT_FROM_PAYROLL")
            )
          );
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to lock payroll run:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
