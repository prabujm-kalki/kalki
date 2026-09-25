import { db } from "./src/db";
import { authUsers, employees, locationMemberships, locations, organizationMemberships } from "./src/db/schema";
import { eq, or, ilike } from "drizzle-orm";

async function run() {
  const matchedUsers = await db.select().from(authUsers).where(
    or(
      ilike(authUsers.email, "%6381575274%"),
      ilike(authUsers.name, "%6381575274%")
    )
  );

  console.log("Matched Users:");
  console.log(JSON.stringify(matchedUsers, null, 2));

  for (const u of matchedUsers) {
    const orgMemberships = await db.select().from(organizationMemberships).where(eq(organizationMemberships.userId, u.id));
    console.log(`\nOrganization Memberships for User ${u.id}:`);
    console.log(JSON.stringify(orgMemberships, null, 2));

    const locMemberships = await db.select({
      id: locationMemberships.id,
      locationId: locationMemberships.locationId,
      locationName: locations.name,
      isActive: locationMemberships.isActive
    }).from(locationMemberships)
      .leftJoin(locations, eq(locationMemberships.locationId, locations.id))
      .where(eq(locationMemberships.userId, u.id));
    
    console.log(`\nLocation Memberships for User ${u.id}:`);
    console.log(JSON.stringify(locMemberships, null, 2));
    
    const empRecs = await db.select().from(employees).where(eq(employees.userId, u.id));
    console.log(`\nEmployee records for User ${u.id}:`);
    console.log(JSON.stringify(empRecs, null, 2));
  }
  
  process.exit(0);
}

run().catch(console.error);
