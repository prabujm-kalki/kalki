import "dotenv/config";
import { db } from "../db/index";
import { organizations, locations, auditEvents, authUsers } from "../db/schema";
import { ilike, not, or, and, eq } from "drizzle-orm";

async function main() {
  const orgs = await db.select({ id: organizations.id, name: organizations.name }).from(organizations);
  console.log("Total orgs:", orgs.length);
  
  const testOrgs = orgs.filter(o => o.name.toLowerCase().includes("organization") || o.name.toLowerCase().includes("audit query"));
  
  const toDelete = testOrgs.filter(o => o.name !== "Default Organization" && o.name !== "Main Organization");
  
  console.log("Orgs to delete:", toDelete.map(o => o.name).join(", "));
  
  for (const org of toDelete) {
    console.log(`Deleting ${org.name}...`);
    // Locations will cascade or we can delete them first.
    // wait, if we drop organizations, locations will be dropped if there is a cascade.
    // Let's delete them.
    await db.delete(organizations).where(eq(organizations.id, org.id));
  }
  
  console.log("Done");
  process.exit(0);
}

main().catch(console.error);
