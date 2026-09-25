import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { employees, people, salaryAdvances, employeeSalaryStructures, employeeSalaryStructureComponents, salaryComponents, attendanceSummaries, rawBiometricPunches } from "@/db/schema";
import { and, eq, gte, lte } from "drizzle-orm";
import { sql } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { organizationId, locationId, periodStart, periodEnd } = await request.json();

    if (!organizationId || !locationId || !periodStart || !periodEnd) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    // 1. Fetch all employees in this location
    const employeeRows = await db
      .select({
        id: employees.id,
        employeeCode: employees.employeeCode,
        name: people.firstName,
      })
      .from(employees)
      .innerJoin(people, eq(people.id, employees.personId))
      .where(
        and(
          eq(employees.organizationId, organizationId),
          eq(employees.locationId, locationId),
          eq(employees.status, "ACTIVE")
        )
      );

    const preview = [];

    // Process each employee
    for (const emp of employeeRows) {
      // 2. Fetch pending salary advances
      const advances = await db
        .select({
          amount: salaryAdvances.amount,
        })
        .from(salaryAdvances)
        .where(
          and(
            eq(salaryAdvances.employeeId, emp.id),
            eq(salaryAdvances.status, "PENDING"),
            eq(salaryAdvances.repaymentMethod, "DEDUCT_FROM_PAYROLL")
          )
        );

      let advanceDeductions = 0;
      for (const adv of advances) {
        advanceDeductions += Number(adv.amount);
      }

      // 3. Calculate gross pay from salary structure
      // For this wizard we assume the latest structure
      const structure = await db
        .select({ id: employeeSalaryStructures.id })
        .from(employeeSalaryStructures)
        .where(eq(employeeSalaryStructures.employeeId, emp.id))
        .orderBy(sql`${employeeSalaryStructures.effectiveFrom} DESC`)
        .limit(1);

      let grossAmount = 0;
      let deductions = 0; // standard statutory deductions can be calculated here

      if (structure.length > 0) {
        const components = await db
          .select({
            type: salaryComponents.type,
            amount: employeeSalaryStructureComponents.amount,
          })
          .from(employeeSalaryStructureComponents)
          .innerJoin(salaryComponents, eq(salaryComponents.id, employeeSalaryStructureComponents.componentId))
          .where(eq(employeeSalaryStructureComponents.structureId, structure[0].id));

        for (const comp of components) {
          if (comp.type === "EARNING") {
            grossAmount += Number(comp.amount);
          } else if (comp.type === "DEDUCTION") {
            deductions += Number(comp.amount);
          }
        }
      }

      // 4. Calculate actual present / absent from attendance logs
      const startD = new Date(periodStart);
      const endD = new Date(periodEnd);
      endD.setHours(23, 59, 59, 999);
      const totalDaysInPeriod = Math.max(1, Math.round((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24)));

      const summaries = await db.select({ status: attendanceSummaries.status })
        .from(attendanceSummaries)
        .where(
          and(
            eq(attendanceSummaries.employeeId, emp.id),
            gte(attendanceSummaries.attendanceDate, periodStart),
            lte(attendanceSummaries.attendanceDate, periodEnd)
          )
        );

      let totalPresent = 0;
      for (const sum of summaries) {
        if (sum.status === "PRESENT" || sum.status === "LATE") {
          totalPresent++;
        }
      }

      // Fallback: If attendance summaries haven't been generated yet, look at raw punches
      if (totalPresent === 0) {
        const rawPunches = await db.select({ timestamp: rawBiometricPunches.punchTimestamp })
          .from(rawBiometricPunches)
          .where(
            and(
              eq(rawBiometricPunches.employeeId, emp.id),
              gte(rawBiometricPunches.punchTimestamp, startD),
              lte(rawBiometricPunches.punchTimestamp, endD)
            )
          );
        
        // Count unique dates
        const uniqueDates = new Set(rawPunches.map(p => {
          const d = new Date(p.timestamp);
          return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        }));
        
        totalPresent = uniqueDates.size;
      }

      const totalAbsent = Math.max(0, totalDaysInPeriod - totalPresent);

      // Adjust gross pay based on attendance? For now we just use the fixed structure amount
      // In a real system, you would pro-rate it based on totalPresent / totalDaysInPeriod.

      const netAmount = grossAmount - deductions - advanceDeductions;

      preview.push({
        employeeId: emp.id,
        employeeName: emp.name + " (" + emp.employeeCode + ")",
        totalPresent,
        totalAbsent,
        grossAmount,
        deductions,
        advanceDeductions,
        netAmount
      });
    }

    return NextResponse.json({ preview });
  } catch (error) {
    console.error("Preview Generation Error", error);
    return NextResponse.json({ error: "Failed to generate preview" }, { status: 500 });
  }
}
