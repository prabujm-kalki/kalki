const fs = require('fs');

let code = fs.readFileSync('src/app/api/payroll/preview/route.ts', 'utf8');

// 1. Add shiftDefinitions import
code = code.replace(
  'import { employees, people, salaryAdvances, employeeSalaryStructures, employeeSalaryStructureComponents, salaryComponents, attendanceSummaries, rawBiometricPunches } from "@/db/schema";',
  'import { employees, people, salaryAdvances, employeeSalaryStructures, employeeSalaryStructureComponents, salaryComponents, attendanceSummaries, rawBiometricPunches, shiftDefinitions } from "@/db/schema";'
);

// 2. Add defaultShiftId to employee select
code = code.replace(
  'employeeCode: employees.employeeCode,\n        name: people.firstName,\n      })',
  'employeeCode: employees.employeeCode,\n        name: people.firstName,\n        defaultShiftId: employees.defaultShiftId,\n      })'
);

// 3. Replace the entire gross calculation block (from line 74 to line 189)
const replacementBlock = `
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

      // Fallback: If attendance summaries haven't been generated yet, look at raw punches
      if (summaries.length === 0) {
        const rawPunches = await db.select({ timestamp: rawBiometricPunches.punchTimestamp })
          .from(rawBiometricPunches)
          .where(
            and(
              eq(rawBiometricPunches.employeeId, emp.id),
              gte(rawBiometricPunches.punchTimestamp, startD),
              lte(rawBiometricPunches.punchTimestamp, endD)
            )
          );
        
        const uniqueDates = new Set(rawPunches.map(p => {
          const d = new Date(p.timestamp);
          return \`\${d.getFullYear()}-\${d.getMonth()}-\${d.getDate()}\`;
        }));
        
        totalPresent = uniqueDates.size;
        totalNetHours = totalPresent * (shift ? Number(shift.minHoursFullDay) : 8); 
      }

      const totalAbsent = Math.max(0, totalDaysInPeriod - totalPresent);

      // 5. Component-Level Matrix Calculation
      const structure = await db
        .select({ id: employeeSalaryStructures.id })
        .from(employeeSalaryStructures)
        .where(eq(employeeSalaryStructures.employeeId, emp.id))
        .orderBy(sql\`\${employeeSalaryStructures.effectiveFrom} DESC\`)
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
        for (const comp of uniqueComps) {
          const amt = Number(comp.amount) || 0;
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
`;

const startIndex = code.indexOf('// 3. Calculate gross pay from salary structure');
const endIndex = code.indexOf('preview.push({');

if (startIndex === -1 || endIndex === -1) {
  console.log('Could not find bounds!');
  process.exit(1);
}

const newCode = code.substring(0, startIndex) + replacementBlock + '\n      ' + code.substring(endIndex);

fs.writeFileSync('src/app/api/payroll/preview/route.ts', newCode);
console.log('Successfully updated preview logic!');
