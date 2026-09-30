import { NextResponse } from "next/server";
import { db } from "@/db";
import { payslips, payrollRuns, advanceTypeDefinitions } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET() {
  try {
    const p = await db.select().from(payslips)
      .innerJoin(payrollRuns, eq(payslips.payrollRunId, payrollRuns.id))
      .where(eq(payslips.employeeId, '661e41b7-f7eb-483c-80f5-ca9a79c2abd9'));

    const types = await db.select().from(advanceTypeDefinitions);

    return NextResponse.json({
      success: true,
      payslips: p,
      types
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, stack: err.stack, details: err });
  }
}
