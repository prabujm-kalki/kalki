import "dotenv/config";
import { db } from "../src/db/index.js";
import { roles, businessRoles } from "../src/db/schema.js";

async function restore() {
  const br = await db.select().from(businessRoles);
  const r = await db.select().from(roles);
  const rIds = new Set(r.map(x => x.id));
  
  let count = 0;
  for (const b of br) {
    if (!rIds.has(b.id)) {
      console.log("Restoring role:", b.name, b.identifier);
      await db.insert(roles).values({
        id: b.id,
        name: b.name,
        code: b.identifier,
        description: b.purpose || "Restored from businessRoles"
      });
      count++;
    }
  }
  console.log("Restored " + count + " roles!");
  process.exit(0);
}

restore();
