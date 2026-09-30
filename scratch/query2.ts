import { db } from "../src/db";
import { authUsers, employees, people, organizations, locations } from "../src/db/schema";
import { eq, ilike } from "drizzle-orm";

async function run() {
  const allUsers = await db.select().from(authUsers).where(ilike(authUsers.name, "%prabha%"));
  console.log("Users:", allUsers);
  if (allUsers.length === 0) return;
  const user = allUsers[0];

  let emp = await db.select().from(employees).where(eq(employees.userId, user.id));
  if (emp.length > 0) {
    console.log("Employee already linked:", emp[0]);
    process.exit(0);
  }

  // Find person with Prabha in name
  const allPeople = await db.select().from(people).where(ilike(people.displayName, "%prabha%"));
  if (allPeople.length > 0) {
    const person = allPeople[0];
    const emps = await db.select().from(employees).where(eq(employees.personId, person.id));
    if (emps.length > 0) {
      await db.update(employees).set({ userId: user.id }).where(eq(employees.id, emps[0].id));
      console.log("Linked existing employee to user prabha");
      process.exit(0);
    }
  }

  console.log("No person found for prabha");
  process.exit(0);
}
run();
