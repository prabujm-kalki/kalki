import { db } from "../src/db";
import { rawBiometricPunches } from "../src/db/schema";
import { desc } from "drizzle-orm";

async function main() {
  const data = await db.select().from(rawBiometricPunches).orderBy(desc(rawBiometricPunches.punchTimestamp)).limit(5);
  console.log(JSON.stringify(data, null, 2));
  process.exit(0);
}
main();
