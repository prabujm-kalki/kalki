import { db } from './src/db/index';
import { payrollRuns, payslips, employees, people } from './src/db/schema';
import { eq } from 'drizzle-orm';

const run = async () => {
  const id = 'c3cb3cad-9f27-4500-9d99-5d1c80d8a757';
  const r = await db.select().from(payrollRuns).where(eq(payrollRuns.id, id));
  console.log("RUNS:", r);

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
    .where(eq(payslips.payrollRunId, id));

  console.log("SLIPS:", slips);
  process.exit(0);
};

run();
