import { db } from "../src/db";
import { roles } from "../src/db/schema";
import { like, or } from "drizzle-orm";

async function main() {
  console.log("Fetching roles...");
  const allRoles = await db.select().from(roles);
  
  console.log(`Found ${allRoles.length} total roles.`);
  
  const testPatterns = [
    "%P4_HR%",
    "%EMPLOYEE-READER%",
    "%HR_ROLE%",
    "%HR_cd%",
    "%HR_fd%",
    "%GATE-ROLE%"
  ];
  
  const deleted = await db.delete(roles).where(
    or(
      ...testPatterns.map(pattern => like(roles.code, pattern))
    )
  ).returning();
  
  console.log(`Deleted ${deleted.length} test roles.`);
  process.exit(0);
}

main().catch(console.error);
