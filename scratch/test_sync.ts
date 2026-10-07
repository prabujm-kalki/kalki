import { TMBillService } from "../src/domains/integrations/tmbill.service";
import { db } from "../src/db";
import { organizations } from "../src/db/schema";
import { eq } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

async function run() {
  console.log("Fetching organization...");
  const orgs = await db.select().from(organizations).limit(1);
  if (orgs.length === 0) {
    console.log("No org found!");
    process.exit(1);
  }
  
  const orgId = orgs[0].id;
  console.log("Using Org:", orgId);

  const service = new TMBillService(orgId);
  console.log("Starting sync...");
  const result = await service.syncOrders("2026-10-06 00:00:00", "2026-10-07 23:59:59");
  console.log("Sync result:", result);
  process.exit(0);
}

run();
