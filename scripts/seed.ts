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
  people,
  employees,
  employeeRoleAssignments,
  businessRoles
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

  // 2.5 Seed Predefined Roles
  const predefinedRoles = [
    { identifier: "owner", name: "Owner", purpose: "System owner with full authority" },
    { identifier: "manager", name: "Manager", purpose: "Branch or department manager" },
    { identifier: "hr", name: "HR", purpose: "Human resources and people operations" },
    { identifier: "supervisor", name: "Supervisor", purpose: "Shift or area supervisor" },
    { identifier: "cashier", name: "Cashier", purpose: "Cash handling and billing" },
    { identifier: "kitchen_in_charge", name: "Kitchen In-Charge", purpose: "Kitchen management" },
    { identifier: "service_team", name: "Service Team", purpose: "Customer service staff" },
    { identifier: "kitchen_team", name: "Kitchen Team", purpose: "Kitchen staff" },
    { identifier: "others", name: "Others", purpose: "Other roles" }
  ];

  for (const roleDef of predefinedRoles) {
    let [record] = await db
      .select()
      .from(businessRoles)
      .where(and(eq(businessRoles.organizationId, org.id), eq(businessRoles.identifier, roleDef.identifier)))
      .limit(1);

    if (!record) {
      [record] = await db
        .insert(businessRoles)
        .values({
          organizationId: org.id,
          identifier: roleDef.identifier,
          name: roleDef.name,
          purpose: roleDef.purpose,
        })
        .returning();
      console.log(` Created role: ${record.name}`);
    } else {
      console.log(`ℹ️ Role already exists: ${record.name}`);
    }
  }

  // 3. Create / Ensure Owner User
  const phone = "9790014356";
  const email = `${phone}@kalki.internal`;
  const password = "Welcome@01";
  const name = "Kalki System Owner";

  // Clean up any incomplete/previous registration for this email
  const existingUsers = await db
    .select({ id: authUsers.id })
    .from(authUsers)
    .where(eq(authUsers.email, email));

  let userId: string;
  if (existingUsers.length > 0) {
    console.log(`👤 User already exists: ${email}. Renaming old user to allow recreation...`);
    for (const u of existingUsers) {
      await db.update(authUsers).set({ email: `old_${Date.now()}@kalki.local` }).where(eq(authUsers.id, u.id));
    }
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
  userId = signupResult.user.id;
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

  // 6. Ensure Employee Profile for Owner
  let [person] = await db
    .select()
    .from(people)
    .where(eq(people.displayName, name))
    .limit(1);

  if (!person) {
    [person] = await db.insert(people).values({
      firstName: "Kalki",
      lastName: "Owner",
      displayName: name,
      phone: phone,
    }).returning();
  }

  let [employee] = await db
    .select()
    .from(employees)
    .where(eq(employees.personId, person.id))
    .limit(1);

  if (!employee) {
    [employee] = await db.insert(employees).values({
      personId: person.id,
      organizationId: org.id,
      locationId: locationRecords[0].id,
      userId: userId,
      employeeCode: "OWNER-01",
      employmentStartDate: new Date(),
      status: "ACTIVE",
      jobTitle: "System Owner",
      biometricId: "OWNER-BIO-1",
    }).returning();
  } else {
    // ensure status is ACTIVE and user is correctly linked if already exists
    [employee] = await db.update(employees)
      .set({ status: "ACTIVE", userId: userId })
      .where(eq(employees.id, employee.id))
      .returning();
  }

  // Ensure owner role is assigned
  const [ownerRole] = await db
    .select()
    .from(businessRoles)
    .where(and(eq(businessRoles.organizationId, org.id), eq(businessRoles.identifier, "owner")))
    .limit(1);

  if (ownerRole) {
    const [assignment] = await db
      .select()
      .from(employeeRoleAssignments)
      .where(and(eq(employeeRoleAssignments.employeeId, employee.id), eq(employeeRoleAssignments.roleId, ownerRole.id)))
      .limit(1);

    if (!assignment) {
      await db.insert(employeeRoleAssignments).values({
        employeeId: employee.id,
        roleId: ownerRole.id,
        organizationId: org.id,
        locationId: locationRecords[0].id,
        isActive: true,
      });
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
