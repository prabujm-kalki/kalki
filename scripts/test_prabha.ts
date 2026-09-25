import { db } from "../src/db";
import { employees } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  const data = await db.select().from(employees).where(eq(employees.id, "6ca1172f-3f8f-4899-89c5-566b4646ed38"));
  console.log(JSON.stringify(data, null, 2));
  process.exit(0);
}
main();
