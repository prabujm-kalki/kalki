import { db } from "./src/db";
import { payslips, payrollRuns, employees, people } from "./src/db/schema";
import { eq } from "drizzle-orm";

async function test() {
  const [run] = await db.select().from(payrollRuns).limit(1);
  if (!run) {
    console.log("No run found");
    return;
  }
  
  console.log("Testing with runId:", run.id);
  
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
  .where(eq(payslips.payrollRunId, run.id));
  
  console.log("Found payslips:", slipRows.length);
  console.log(JSON.stringify(slipRows[0], null, 2));
}

test().catch(console.error).finally(() => process.exit(0));
