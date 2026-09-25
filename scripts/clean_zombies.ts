import { db } from "../src/db/index";
import { authUsers } from "../src/db/schema";
import { sql, inArray } from "drizzle-orm";

async function main() {
  const isDryRun = process.argv.includes("--execute") ? false : true;

  console.log("Analyzing database for zombie accounts using raw SQL references...");
  
  // Find zombies that have NO links anywhere
  const query = sql`
    SELECT id FROM "user" 
    WHERE "id" NOT IN (SELECT "user_id" FROM "employees" WHERE "user_id" IS NOT NULL)
    AND "id" NOT IN (SELECT "actor_user_id" FROM "audit_events" WHERE "actor_user_id" IS NOT NULL)
    AND "id" NOT IN (SELECT "recipient_user_id" FROM "notification_events" WHERE "recipient_user_id" IS NOT NULL)
  `;
  
  const result = await db.execute(query);
  const pureZombieIds = result.rows.map((r: any) => r.id as string);

  console.log(`Found ${pureZombieIds.length} pure zombie accounts (no employees, no audit events, no notifications).`);

  if (pureZombieIds.length === 0) {
    console.log("No pure zombie accounts found. System is clean!");
    process.exit(0);
  }

  if (isDryRun) {
    console.log("\n[DRY RUN] No records were deleted.");
    console.log("To execute the deletion, run this script with the '--execute' flag.");
  } else {
    console.log("\n[EXECUTE] Proceeding with deletion of pure zombies...");
    let deletedCount = 0;
    const chunkSize = 500;
    for (let i = 0; i < pureZombieIds.length; i += chunkSize) {
      const chunk = pureZombieIds.slice(i, i + chunkSize);
      
      // Use Drizzle's inArray for safe type binding
      await db.delete(authUsers).where(inArray(authUsers.id, chunk));
      deletedCount += chunk.length;
      console.log(`Deleted chunk: ${deletedCount}/${pureZombieIds.length}`);
    }
    console.log(`Successfully deleted ${deletedCount} pure zombie account(s).`);
  }
}

main()
  .catch((e) => {
    console.error("Error analyzing/cleaning zombies:", e);
    process.exit(1);
  })
  .then(() => process.exit(0));
