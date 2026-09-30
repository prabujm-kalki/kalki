import { db } from "../src/db";
import { authUsers, employees, people, organizations, locations } from "../src/db/schema";
import { eq, ilike } from "drizzle-orm";
import { listEmployees } from "../src/domains/employees/service";

async function run() {
  const allUsers = await db.select().from(authUsers).where(ilike(authUsers.name, "%prabha%"));
  if (allUsers.length === 0) return console.log("User Prabha not found");
  const user = allUsers[0];
  console.log("Found User ID:", user.id);

  const orgs = await db.select().from(organizations).limit(1);
  const locs = await db.select().from(locations).limit(1);

  if (orgs.length === 0 || locs.length === 0) return console.log("Missing org/loc");

  const orgId = orgs[0].id;
  const locId = locs[0].id;
  console.log("Org:", orgId, "Loc:", locId);

  try {
    const emps = await listEmployees({ id: user.id }, { organizationId: orgId, locationId: locId });
    console.log("Employees returned by listEmployees:", emps.length);
    
    const myEmp = emps.find(e => e.userId === user.id);
    console.log("Found matched employee:", myEmp ? myEmp.id : null);
    
    // Also check the db directly to see if locationId matches!
    const dbEmp = await db.select().from(employees).where(eq(employees.userId, user.id));
    console.log("Direct DB lookup for user.id:", dbEmp.map(e => ({ id: e.id, locationId: e.locationId })));

  } catch (err) {
    console.error("Error calling listEmployees:", err);
  }

  process.exit(0);
}
run();
