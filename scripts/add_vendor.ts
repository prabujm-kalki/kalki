import { db } from "../src/db";
import { vendors, organizations, locations } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function run() {
  const [org] = await db.select().from(organizations).limit(1);
  const [loc] = await db.select().from(locations).limit(1);
  
  if (!org || !loc) {
    console.log("No organization or location found!");
    process.exit(1);
  }
  
  await db.insert(vendors).values({
    organizationId: org.id,
    locationId: loc.id,
    name: "Fresh Veggies Supplier",
    isActive: true,
  });
  
  console.log("Vendor added successfully");
  process.exit(0);
}
run();
