import { db } from "../src/db";
import { authUsers, employees, organizationMemberships, locationMemberships, people, employeeRoleAssignments, employeeFamilyContacts, employeeSalaryInfo } from "../src/db/schema";
import { ilike, or, eq } from "drizzle-orm";

async function cleanup() {
  console.log("Finding users with phone number 6381575274...");
  
  const matchedUsers = await db.select().from(authUsers).where(
    or(
      ilike(authUsers.email, "%6381575274%"),
      ilike(authUsers.name, "%6381575274%")
    )
  );
  
  const matchedPeople = await db.select().from(people).where(
    or(
      ilike(people.phone, "%6381575274%"),
      ilike(people.email, "%6381575274%")
    )
  );

  console.log(`Found ${matchedUsers.length} users and ${matchedPeople.length} people.`);

  for (const p of matchedPeople) {
    const emps = await db.select().from(employees).where(eq(employees.personId, p.id));
    for (const e of emps) {
       console.log(`Cleaning employee dependencies ${e.id}...`);
       await db.delete(employeeRoleAssignments).where(eq(employeeRoleAssignments.employeeId, e.id));
       await db.delete(employeeFamilyContacts).where(eq(employeeFamilyContacts.employeeId, e.id));
       await db.delete(employeeSalaryInfo).where(eq(employeeSalaryInfo.employeeId, e.id));
       await db.delete(employees).where(eq(employees.id, e.id));
    }
    console.log(`Deleting person ${p.id}...`);
    await db.delete(people).where(eq(people.id, p.id));
  }

  for (const u of matchedUsers) {
    console.log(`Cleaning up data for user ${u.id}...`);
    
    await db.delete(locationMemberships).where(eq(locationMemberships.userId, u.id));
    await db.delete(organizationMemberships).where(eq(organizationMemberships.userId, u.id));
    
    // Auth user
    await db.delete(authUsers).where(eq(authUsers.id, u.id));
    console.log(`Deleted user ${u.id}.`);
  }
  
  console.log("Cleanup complete!");
  process.exit(0);
}

cleanup().catch(console.error);
