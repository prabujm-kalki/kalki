import { db } from "../src/db/index";
import { organizations } from "../src/db/schema";
import { syncLeaveBalancesForOrganization } from "../src/domains/attendance/accrualEngine";

async function main() {
  console.log("Starting full organization leave balance sync...");

  const allOrgs = await db.select().from(organizations);
  for (const org of allOrgs) {
    console.log(`Syncing balances for organization: ${org.name} (${org.id})...`);
    await db.transaction(async (tx) => {
      await syncLeaveBalancesForOrganization(tx, org.id, null);
    });
    console.log(`Finished syncing organization: ${org.name}`);
  }

  console.log("All organizations synced successfully!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Error running sync script:", err);
  process.exit(1);
});
