import { db } from "../src/db";
import { vendors } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function run() {
  await db.delete(vendors).where(eq(vendors.name, "Fresh Veggies Supplier"));
  console.log("Deleted");
  process.exit(0);
}
run();
