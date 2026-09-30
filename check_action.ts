import { fetchMyAdvancesData } from './src/app/payroll/advances/actions.ts';
import { db } from './src/db/index.ts';
import { employees } from './src/db/schema.ts';
async function run() {
  const allEmps = await db.select().from(employees).limit(1);
  if (allEmps.length > 0) {
    const res = await fetchMyAdvancesData(allEmps[0].id);
    console.log(JSON.stringify(res, null, 2));
  }
  process.exit(0);
}
run();
