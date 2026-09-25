import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { employees, people, salaryAdvances, employeeSalaryStructures, employeeSalaryStructureComponents, salaryComponents } from "@/db/schema";
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

      // Just a mock estimation based on check-ins
      const totalPresent = 22; // default to 22 if no logs for testing
      const totalDaysInPeriod = 30; // mock
      const totalAbsent = totalDaysInPeriod - totalPresent;

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
