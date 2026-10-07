import { db } from "./src/db";
import { sql } from "drizzle-orm";
import { fixedAssets } from "./src/db/schema";
import { eq } from "drizzle-orm";

async function run() {
  try {
    const data = await db.select().from(fixedAssets).where(eq(fixedAssets.organizationId, 'b5334ab2-b652-432b-8c16-774c90406261'));
    console.log("SUCCESS", data);
  } catch (e: any) {
    console.error("FULL ERROR", e);
  } finally {
    process.exit(0);
  }
}

run();
