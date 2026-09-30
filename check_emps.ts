import { fetchMyAdvancesData } from './src/app/payroll/advances/actions.ts';
import { db } from './src/db/index.ts';
import { employees } from './src/db/schema.ts';

async function run() {
  const allEmps = await db.select().from(employees).limit(1);
  if (allEmps.length > 0) {
    console.log("Employee ID:", allEmps[0].id, "OrgID:", allEmps[0].organizationId);
    try {
      // NOTE: this will throw because auth.api.getSession won't work in CLI context
      // But we can manually mock it!
    } catch(e) {}
  }
}
run();
