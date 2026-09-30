import { db } from "../src/db";
import { authUsers, employees, people } from "../src/db/schema";
import { eq, ilike } from "drizzle-orm";

async function run() {
  const allUsers = await db.select().from(authUsers).where(ilike(authUsers.name, "%prabha%"));
  console.log("Users:", allUsers);
  
  const allPeople = await db.select().from(people).where(ilike(people.displayName, "%prabha%"));
  console.log("People:", allPeople);

  if (allUsers.length > 0 && allPeople.length > 0) {
    const p = allPeople[0];
    const u = allUsers[0];
    const emp = await db.select().from(employees).where(eq(employees.personId, p.id));
    console.log("Employee:", emp);
    
    if (emp.length > 0) {
      await db.update(employees).set({ userId: u.id }).where(eq(employees.id, emp[0].id));
      console.log("Linked user to employee.");
    }
  }
  process.exit(0);
}
run();
