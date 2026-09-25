import { config } from "dotenv";
config({ path: ".env" });
import { db } from "../src/db";
import { employees } from "../src/db/schema";
import { syncLeaveBalancesForOrganization } from "../src/domains/attendance/accrualEngine";
import { ilike } from "drizzle-orm";

async function run() {
  try {
    const allEmployees = await db.select().from(employees);
    const orgIds = new Set(allEmployees.map(e => e.organizationId));
    
    console.log(`Found ${orgIds.size} organizations. Syncing leave balances...`);
    
    await db.transaction(async (tx) => {
      for (const orgId of orgIds) {
        await syncLeaveBalancesForOrganization(tx, orgId);
      }
    });
    
    console.log("Successfully synced leave balances for all organizations.");
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}
run();
