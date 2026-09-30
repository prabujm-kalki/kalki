import { db } from './src/db/index.ts';
import { advanceTypeDefinitions, organizations } from './src/db/schema.ts';
async function run() {
  const allOrgs = await db.select({ id: organizations.id }).from(organizations);
  const types = await db.select().from(advanceTypeDefinitions).limit(1);
  if (types.length === 0) {
    console.log("No types found to duplicate!");
    process.exit(0);
  }
  const baseType = types[0];
  
  for (const org of allOrgs) {
    if (org.id === baseType.organizationId) continue;
    await db.insert(advanceTypeDefinitions).values({
      organizationId: org.id,
      locationId: baseType.locationId,
      code: baseType.code,
      name: baseType.name,
      calculationBasis: baseType.calculationBasis,
      maxCapPercentage: baseType.maxCapPercentage,
      maxRepaymentMonths: baseType.maxRepaymentMonths,
      minTenureDays: baseType.minTenureDays,
      allowConcurrentAdvances: baseType.allowConcurrentAdvances,
      isActive: baseType.isActive
    }).catch(e => console.error("Already exists or error for org", org.id, e.message));
  }
  console.log("Duplicated types to all orgs.");
  process.exit(0);
}
run();
