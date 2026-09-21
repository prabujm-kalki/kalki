import { db } from "../src/db";
import { people, employees, authUsers } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function run() {
  const [person] = await db.select().from(people).where(eq(people.phone, "9790014354"));
  if (!person) throw new Error("Person not found");
  
  const [employee] = await db.select().from(employees).where(eq(employees.personId, person.id));
  if (!employee) throw new Error("Employee not found");
  
  const authEmail = `${person.phone}@kalki.internal`;
  const [authUser] = await db.select().from(authUsers).where(eq(authUsers.email, authEmail));
  
  if (!authUser) {
     throw new Error("Auth user not found either!");
  }
  
  console.log("Found auth user id:", authUser.id);
  await db.update(employees).set({ userId: authUser.id }).where(eq(employees.id, employee.id));
  console.log("Updated employee with user id");
}

run().catch(console.error).then(() => process.exit(0));
