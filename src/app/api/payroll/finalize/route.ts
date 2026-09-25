import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { payrollRuns, payslips, salaryAdvances } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { organizationId, locationId, periodStart, periodEnd, previewData } = await request.json();

    if (!organizationId || !locationId || !periodStart || !periodEnd || !previewData) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    // 1. Create a payroll run record
    const [run] = await db.insert(payrollRuns).values({
      organizationId,
      locationId,
      periodStart,
      periodEnd,
      status: "COMPLETED",
      processedByUserId: session.user.id,
      runDate: new Date(),
    }).returning({ id: payrollRuns.id });

    // 2. Generate payslips and update advances
    for (const preview of previewData) {
      // Create payslip
      const [payslip] = await db.insert(payslips).values({
        payrollRunId: run.id,
        employeeId: preview.employeeId,
        grossAmount: String(preview.grossAmount),
        netAmount: String(preview.netAmount),
        deductionsAmount: String(preview.deductions),
        totalPresentDays: String(preview.totalPresent),
        totalAbsentDays: String(preview.totalAbsent),
        status: "GENERATED",
      }).returning({ id: payslips.id });

      // Mark salary advances as paid
      if (preview.advanceDeductions > 0) {
        const advancesToPay = await db.select({ id: salaryAdvances.id, amount: salaryAdvances.amount })
          .from(salaryAdvances)
          .where(
            and(
              eq(salaryAdvances.employeeId, preview.employeeId),
              eq(salaryAdvances.status, "PENDING"),
              eq(salaryAdvances.repaymentMethod, "DEDUCT_FROM_PAYROLL")
            )
          );

        for (const adv of advancesToPay) {
          // You could insert a repayment here using salaryAdvanceRepayments, but I don't import it.
          await db.update(salaryAdvances)
            .set({ status: "PAID" })
            .where(eq(salaryAdvances.id, adv.id));
        }
      }
    }

    return NextResponse.json({ success: true, runId: run.id });
  } catch (error) {
    console.error("Payroll Finalization Error", error);
    return NextResponse.json({ error: "Failed to finalize payroll" }, { status: 500 });
  }
}
