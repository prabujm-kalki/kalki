import { db } from "../src/db";
import { businessRoles } from "../src/db/schema";

async function run() {
  const roles = await db.select().from(businessRoles);
  console.log("=== Roles ===");
  roles.forEach(r => {
    console.log(`ID: ${r.id}, Name: ${r.name}`);
  });
  process.exit(0);
}

run().catch(console.error);
