import { db } from "./src/db";
import { vendorItems } from "./src/db/schema";

async function main() {
  const items = await db.select().from(vendorItems);
  console.log(items);
}
main().then(() => process.exit(0)).catch(console.error);
