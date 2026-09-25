import { db } from "../src/db";
import { rawBiometricPunches, employees, people } from "../src/db/schema";
import { eq, and, gte, desc } from "drizzle-orm";

async function main() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const data = await db.select({
    id: rawBiometricPunches.id,
    punchTimestamp: rawBiometricPunches.punchTimestamp,
    employeeCode: employees.employeeCode,
    displayName: people.displayName,
    orgId: rawBiometricPunches.organizationId
  })
  .from(rawBiometricPunches)
  .innerJoin(employees, eq(rawBiometricPunches.employeeId, employees.id))
  .innerJoin(people, eq(employees.personId, people.id))
  .where(gte(rawBiometricPunches.punchTimestamp, startOfDay))
  .orderBy(desc(rawBiometricPunches.punchTimestamp))
  .limit(20);

  console.log(JSON.stringify(data, null, 2));
  process.exit(0);
}
main();
