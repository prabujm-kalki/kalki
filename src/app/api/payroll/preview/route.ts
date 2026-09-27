import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { employees, people, salaryAdvances, employeeSalaryStructures, employeeSalaryStructureComponents, salaryComponents, attendanceSummaries, rawBiometricPunches, shiftDefinitions } from "@/db/schema";
import { and, eq, gte, lte } from "drizzle-orm";
import { sql } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { organizationId, locationId, periodStart, periodEnd, payBasis = "MONTHLY" } = await request.json();

    if (!organizationId || !locationId || !periodStart || !periodEnd) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    // 1. Fetch active employees who match the selected payBasis in their active structure
    const employeeRows = await db
      .select({
        id: employees.id,
        employeeCode: employees.employeeCode,
        name: people.firstName,
        defaultShiftId: employees.defaultShiftId,
      })
      .from(employees)
      .innerJoin(people, eq(people.id, employees.personId))
      .innerJoin(employeeSalaryStructures, eq(employeeSalaryStructures.employeeId, employees.id))
      .where(
        and(
          eq(employees.organizationId, organizationId),
          eq(employees.locationId, locationId),
          eq(employees.status, "ACTIVE"),
          eq(employeeSalaryStructures.isActive, true),
          eq(employeeSalaryStructures.payBasis, payBasis)
        )
      );

    const preview = [];
    const anomalies = [];

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

      
      // 3. Get employee shift
      let shift = null;
      if (emp.defaultShiftId) {
        const shiftRes = await db.select().from(shiftDefinitions).where(eq(shiftDefinitions.id, emp.defaultShiftId)).limit(1);
        if (shiftRes.length > 0) shift = shiftRes[0];
      }

      // 4. Calculate actual present / absent from attendance logs
      const startD = new Date(periodStart);
      const endD = new Date(periodEnd);
      endD.setHours(23, 59, 59, 999);
      const totalDaysInPeriod = Math.max(1, Math.round((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24)));

      const summaries = await db.select({ 
        status: attendanceSummaries.status,
        firstPunchIn: attendanceSummaries.firstPunchIn,
        lastPunchOut: attendanceSummaries.lastPunchOut,
        isRegularized: attendanceSummaries.isRegularized,
        netHours: attendanceSummaries.netHours,
        attendanceDate: attendanceSummaries.attendanceDate
      })
        .from(attendanceSummaries)
        .where(
          and(
            eq(attendanceSummaries.employeeId, emp.id),
            gte(attendanceSummaries.attendanceDate, periodStart),
            lte(attendanceSummaries.attendanceDate, periodEnd)
          )
        );

      let totalPresent = 0;
      let totalNetHours = 0;

      for (const sum of summaries) {
        // Check for anomalies (missed punches)
        if (sum.firstPunchIn && !sum.lastPunchOut && !sum.isRegularized) {
          anomalies.push({
            employeeId: emp.id,
            employeeName: emp.name + " (" + emp.employeeCode + ")",
            date: sum.attendanceDate,
            reason: "Missed punch out"
          });
        }

        let dayPresent = 0;
        if (sum.status === "PRESENT" || sum.status === "LATE") {
          dayPresent = 1;
        }

        // Validate against shift rules
        if (shift && sum.netHours) {
           const net = Number(sum.netHours);
           const minHalf = Number(shift.minHoursHalfDay);
           const minFull = Number(shift.minHoursFullDay);
           if (net >= minFull) {
              dayPresent = 1;
           } else if (net >= minHalf) {
              dayPresent = 0.5;
           } else {
              dayPresent = 0;
           }
        }
        
        totalPresent += dayPresent;
        totalNetHours += Number(sum.netHours || 0);
      }

      // The payroll engine no longer falls back to raw biometric punches.
      // Raw punches must be processed into attendance_summaries by the Attendance module.
      // If summaries.length === 0, the employee's totalPresent and totalNetHours will naturally be 0.

      const totalAbsent = Math.max(0, totalDaysInPeriod - totalPresent);

      // 5. Component-Level Matrix Calculation
      const structure = await db
        .select({ id: employeeSalaryStructures.id })
        .from(employeeSalaryStructures)
        .where(and(eq(employeeSalaryStructures.employeeId, emp.id), eq(employeeSalaryStructures.isActive, true)))
        .orderBy(sql`${employeeSalaryStructures.effectiveFrom} DESC`)
        .limit(1);

      let proRatedGross = 0;
      let finalDeductions = 0;

      if (structure.length > 0) {
        const components = await db
          .select({
            type: salaryComponents.type,
            name: salaryComponents.name,
            amount: employeeSalaryStructureComponents.amount,
          })
          .from(employeeSalaryStructureComponents)
          .innerJoin(salaryComponents, eq(salaryComponents.id, employeeSalaryStructureComponents.componentId))
          .where(eq(employeeSalaryStructureComponents.structureId, structure[0].id));

        const uniqueComps = Array.from(new Map(components.map(c => [c.name, c])).values());
        for (const comp of uniqueComps as any[]) {
          const amt = Number(comp.amount) || 0;
          console.log(`[DEBUG PAYROLL] Eval Comp: ${comp.name}, amt: ${amt}, payBasis: ${payBasis}`);
          if (comp.type === "EARNING") {
            if (payBasis === "MONTHLY" || payBasis === "WEEKLY") {
               proRatedGross += (amt / totalDaysInPeriod) * totalPresent;
            } else if (payBasis === "DAILY") {
               proRatedGross += amt * totalPresent;
            } else if (payBasis === "HOURLY") {
               if (comp.name.toLowerCase().includes("basic") || comp.name.toLowerCase().includes("hourly")) {
                  proRatedGross += amt * totalNetHours;
               }
               // Other fixed allowances are excluded for pure hourly
            }
          } else if (comp.type === "DEDUCTION") {
            finalDeductions += amt;
          }
        }
      }

      if (totalPresent === 0 && payBasis !== "HOURLY") {
        proRatedGross = 0;
        finalDeductions = 0;
      } else if (payBasis === "HOURLY" && totalNetHours === 0) {
        proRatedGross = 0;
        finalDeductions = 0;
      }

      proRatedGross = Math.round(proRatedGross * 100) / 100;

      const netAmount = Math.max(0, proRatedGross - finalDeductions - advanceDeductions);

      preview.push({
        employeeId: emp.id,
        employeeName: emp.name + " (" + emp.employeeCode + ")",
        totalPresent,
        totalAbsent,
        grossAmount: proRatedGross,
        deductions: finalDeductions,
        advanceDeductions,
        netAmount
      });
    }

    if (anomalies.length > 0) {
      const uniqueEmps = Array.from(new Set(anomalies.map(a => a.employeeName))).join(', ');
      return NextResponse.json({ 
        error: `Incomplete attendance cycle. Missing punch-outs detected for: ${uniqueEmps}. Please regularize attendance first.`, 
        anomalies 
      }, { status: 400 });
    }

    return NextResponse.json({ preview });
  } catch (error: any) {
    console.error("Preview Generation Error", error);
    return NextResponse.json({ error: "Failed to generate preview: " + (error.message || error.toString()) }, { status: 500 });
  }
}
