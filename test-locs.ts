import { db } from './src/db';
import { organizations, locations } from './src/db/schema';
import { eq } from 'drizzle-orm';

async function run() {
  const orgs = await db.select().from(organizations).where(eq(organizations.id, '15d2d5c5-e9ba-4996-8c27-73161d633857'));
  const locs = await db.select().from(locations).where(eq(locations.organizationId, '15d2d5c5-e9ba-4996-8c27-73161d633857'));
  console.log("Orgs:", JSON.stringify(orgs, null, 2));
  console.log("Locations:", JSON.stringify(locs, null, 2));
  process.exit(0);
}
run();
