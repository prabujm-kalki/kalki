import { config } from "dotenv";
config({ path: ".env" });
import { db } from "../src/db";
import { employeeChangeRequests } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  const proposals = await db.select().from(employeeChangeRequests).where(eq(employeeChangeRequests.status, "PENDING"));
  console.log(JSON.stringify(proposals, null, 2));
  process.exit(0);
}
main();
