import { config } from 'dotenv';
config({ path: '.env' });
import { db } from '../src/db/index';
import { employees, people, shiftDefinitions } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { fetchValidatedAttendance } from '../src/domains/payroll/services';

async function run() {
  const emp = await db.select({
    id: employees.id,
    code: employees.employeeCode,
    name: people.displayName
  })
  .from(employees)
  .innerJoin(people, eq(employees.personId, people.id))
  .where(eq(employees.employeeCode, 'KAL-EMP-0017'))
  .then(res => res[0]);
  
  if (!emp) {
    console.log('Employee not found');
    process.exit(1);
  }
  
  const from = '2026-09-21';
  const to = '2026-09-27';
  
  const attendance = await fetchValidatedAttendance(emp.id, 'MONTHLY', from, to);
  console.log("ATTENDANCE:", JSON.stringify(attendance, null, 2));
  
  process.exit(0);
}
run().catch(console.error);
