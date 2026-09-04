import "dotenv/config";
import { eq, and, sql } from "drizzle-orm";
import { db } from "../src/db";
import {
  organizations,
  locations,
  systemAuthorities,
  organizationMemberships,
  locationMemberships,
  authUsers,
  authAccounts,
} from "../src/db/schema";
import { auth } from "../src/lib/auth";

async function seed() {
  console.log("🌱 Starting Kalki BOS database seed...");

  // 0. Ensure schema compatibility
  await db.execute(sql`ALTER TABLE "account" ADD COLUMN IF NOT EXISTS "issuer" text;`);

  // 1. Seed Organizations
  let [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.code, "KALKI"))
    .limit(1);

  if (!org) {
    [org] = await db
      .insert(organizations)
      .values({
        name: "Kalki Business Group",
        code: "KALKI",
        isActive: true,
      })
      .returning();
    console.log(` Created organization: ${org.name} (${org.code})`);
  } else {
    console.log(`ℹ️ Organization already exists: ${org.name}`);
  }

  // 2. Seed Locations from PRD
  const locationsToSeed = [
    { name: "Anakalpalayam (Pilot)", code: "AKP" },
    { name: "Avalpoondurai Restaurant", code: "APR" },
    { name: "Avalpoondurai Department Store", code: "APD" },
  ];

  const locationRecords = [];
  for (const loc of locationsToSeed) {
    let [record] = await db
      .select()
      .from(locations)
      .where(and(eq(locations.organizationId, org.id), eq(locations.code, loc.code)))
      .limit(1);

    if (!record) {
      [record] = await db
        .insert(locations)
        .values({
          organizationId: org.id,
          name: loc.name,
          code: loc.code,
          isActive: true,
        })
        .returning();
      console.log(` Created location: ${record.name} (${record.code})`);
    } else {
      console.log(`ℹ️ Location already exists: ${record.name}`);
    }
    locationRecords.push(record);
  }

  // 3. Create / Ensure Owner User
  const email = "admin@kalki.local";
  const password = "AdminPassword123!";
  const name = "Kalki System Owner";

  // Clean up any incomplete/previous registration for this email
  const existingUsers = await db
    .select({ id: authUsers.id })
    .from(authUsers)
    .where(eq(authUsers.email, email));

  for (const u of existingUsers) {
    await db.delete(systemAuthorities).where(eq(systemAuthorities.userId, u.id));
    await db.delete(organizationMemberships).where(eq(organizationMemberships.userId, u.id));
    await db.delete(locationMemberships).where(eq(locationMemberships.userId, u.id));
    await db.delete(authAccounts).where(eq(authAccounts.userId, u.id));
    await db.delete(authUsers).where(eq(authUsers.id, u.id));
  }

  console.log(`👤 Registering user: ${email}...`);
  const signupResult = await auth.api.signUpEmail({
    body: {
      email,
      password,
      name,
    },
  });

  if (!signupResult?.user?.id) {
    throw new Error(`Failed to create user via Better Auth: ${JSON.stringify(signupResult)}`);
  }
  const userId = signupResult.user.id;
  console.log(` User registered successfully with ID: ${userId}`);

  // 4. Ensure System Owner Authority (Clean up any old owner to satisfy uniqueness)
  await db.delete(systemAuthorities).where(eq(systemAuthorities.authority, "OWNER"));
  await db.insert(systemAuthorities).values({
    userId,
    authority: "OWNER",
  });
  console.log(` Granted OWNER system authority to ${email}`);

  // 5. Ensure Memberships
  const [existingOrgMember] = await db
    .select()
    .from(organizationMemberships)
    .where(
      and(
        eq(organizationMemberships.userId, userId),
        eq(organizationMemberships.organizationId, org.id),
      ),
    )
    .limit(1);

  if (!existingOrgMember) {
    await db.insert(organizationMemberships).values({
      userId,
      organizationId: org.id,
      isActive: true,
    });
    console.log(` Linked organization membership for ${email}`);
  }

  for (const loc of locationRecords) {
    const [existingLocMember] = await db
      .select()
      .from(locationMemberships)
      .where(
        and(
          eq(locationMemberships.userId, userId),
          eq(locationMemberships.organizationId, org.id),
          eq(locationMemberships.locationId, loc.id),
        ),
      )
      .limit(1);

    if (!existingLocMember) {
      await db.insert(locationMemberships).values({
        userId,
        organizationId: org.id,
        locationId: loc.id,
        isActive: true,
      });
      console.log(` Linked location membership: ${loc.name}`);
    }
  }

  console.log("\n Seed completed successfully!");
  console.log("-----------------------------------------");
  console.log("Credentials:");
  console.log(`  Email:    ${email}`);
  console.log(`  Password: ${password}`);
  console.log("-----------------------------------------");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
