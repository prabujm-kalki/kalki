import { db } from "../src/db";
import { organizations, locations } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  const orgs = await db.select().from(organizations);
  const locs = await db.select().from(locations);
  console.log("Orgs:", JSON.stringify(orgs, null, 2));
  console.log("Locs:", JSON.stringify(locs, null, 2));
  process.exit(0);
}
main();
