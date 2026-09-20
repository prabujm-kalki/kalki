import "dotenv/config";
import { randomUUID } from "node:crypto";
import { eq, inArray, sql } from "drizzle-orm";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import {
  auditEvents,
  authAccounts,
  authSessions,
  authUsers,
  employees,
  locationMemberships,
  locationRoleAssignments,
  locations,
  organizationMemberships,
  organizationRoleAssignments,
  organizations,
  permissions,
  people,
  rolePermissions,
  roles,
} from "@/db/schema";
import {
  createEmployee,
  EmployeeServiceError,
  getEmployee,
  updateEmployee,
  transitionEmployeeLifecycle,
} from "@/domains/employees/service";
import { employeePermissions } from "@/lib/authorization-policy";
import { ensureSystemOwner } from "../helpers/system-owner";

const organizationId = randomUUID();
const secondOrganizationId = randomUUID();
const locationId = randomUUID();
const secondLocationId = randomUUID();
const authorizedUserId = `employee-test-authorized-${randomUUID()}`;
const deniedUserId = `employee-test-denied-${randomUUID()}`;
let ownerUserId = "";
const roleId = randomUUID();
const permissionId = randomUUID();
const createPermissionId = randomUUID();
const updatePermissionId = randomUUID();
const testRunId = randomUUID().slice(0, 8);
const createdEmployeeIds: string[] = [];
const createdPersonIds: string[] = [];
const createdPermissionIds: string[] = [];

const authorizedActor = { id: authorizedUserId };
const deniedActor = { id: deniedUserId };
const ownerActor = { id: "" };

const employeeInput = (employeeCode: string, targetLocationId = locationId) => ({
  organizationId,
  locationId: targetLocationId,
  jobTitle: "Operations Associate",
  employmentStartDate: "2026-09-01",
  biometricId: `BIO-${employeeCode}`,
  familyContacts: [{ category: "EMERGENCY_CONTACT", name: "test", mobile: "9876543210", relationship: "test" }],
  person: { firstName: `Test${testRunId}`,
    lastName: "Employee",
    displayName: `Test Employee ${employeeCode}`,
    phone: `99${Math.floor(Math.random() * 10000000).toString().padStart(8, '0')}`,
  },
});

async function insertUser(id: string) {
  await db.insert(authUsers).values({
    id,
    name: id,
    email: `${id}@example.invalid`,
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

beforeAll(async () => {
  await db.insert(organizations).values([
    { id: organizationId, name: "Test Organization", code: `TEST-${organizationId.slice(0, 8)}` },
    { id: secondOrganizationId, name: "Other Organization", code: `TEST-${secondOrganizationId.slice(0, 8)}` },
  ]);
  await db.insert(locations).values([
    { id: locationId, organizationId, name: "Test Location", code: "TEST-LOC" },
    { id: secondLocationId, organizationId: secondOrganizationId, name: "Other Location", code: "OTHER-LOC" },
  ]);
  ownerUserId = (await ensureSystemOwner()).userId;
  ownerActor.id = ownerUserId;
  await Promise.all([
    insertUser(authorizedUserId),
    insertUser(deniedUserId),
  ]);
  const existingPermissions = await db
    .select({ id: permissions.id, code: permissions.code })
    .from(permissions)
    .where(
      inArray(permissions.code, [
        employeePermissions.read,
        employeePermissions.create,
        employeePermissions.update,
      ]),
    );
  const readPermissionId =
    existingPermissions.find((permission) => permission.code === employeePermissions.read)
      ?.id ?? permissionId;
  const createEmployeePermissionId =
    existingPermissions.find((permission) => permission.code === employeePermissions.create)
      ?.id ?? createPermissionId;
  const updateEmployeePermissionId =
    existingPermissions.find((permission) => permission.code === employeePermissions.update)
      ?.id ?? updatePermissionId;
  const missingPermissions = [
    !existingPermissions.some((permission) => permission.code === employeePermissions.read)
      ? { id: readPermissionId, code: employeePermissions.read, name: "Read employees" }
      : null,
    !existingPermissions.some((permission) => permission.code === employeePermissions.create)
      ? { id: createEmployeePermissionId, code: employeePermissions.create, name: "Create employees" }
      : null,
    !existingPermissions.some((permission) => permission.code === employeePermissions.update)
      ? { id: updateEmployeePermissionId, code: employeePermissions.update, name: "Update employees" }
      : null,
  ].filter((permission): permission is { id: string; code: string; name: string } => permission !== null);
  if (missingPermissions.length > 0) {
    await db.insert(permissions).values(missingPermissions);
    createdPermissionIds.push(...missingPermissions.map((permission) => permission.id));
  }
  await db.insert(roles).values({
    id: roleId,
    code: `EMPLOYEE-READER-${roleId.slice(0, 8)}`,
    name: "Employee reader",
  });
  await db.insert(rolePermissions).values([
    { roleId, permissionId: readPermissionId },
    { roleId, permissionId: createEmployeePermissionId },
    { roleId, permissionId: updateEmployeePermissionId },
  ]);
  await db.insert(organizationMemberships).values([
    { userId: authorizedUserId, organizationId },
    { userId: deniedUserId, organizationId },
  ]);
  await db.insert(locationMemberships).values([
    { userId: authorizedUserId, organizationId, locationId },
  ]);
  await db.insert(locationRoleAssignments).values({
    userId: authorizedUserId,
    organizationId,
    locationId,
    roleId,
  });
  await db.insert(organizationRoleAssignments).values({
    userId: authorizedUserId,
    organizationId,
    roleId,
  });
});

afterAll(async () => {
  for (const employeeId of createdEmployeeIds) {
    await db.delete(employees).where(eq(employees.id, employeeId));
  }
  for (const personId of createdPersonIds) {
    await db.delete(people).where(eq(people.id, personId));
  }
        for (const createdPermissionId of createdPermissionIds) {
    await db.delete(permissions).where(eq(permissions.id, createdPermissionId));
  }
});

describe("Employee service", () => {
  it("creates a Person and Employee atomically for an authorized scope", async () => {
    const result = await createEmployee(
      authorizedActor,
      employeeInput("AUTH-001"),
    );

    expect(result).toMatchObject({
      organizationId,
      locationId,
      person: {
        firstName: `Test${testRunId}`,
        lastName: "Employee",
      },
    });
    createdEmployeeIds.push(result.id);
    createdPersonIds.push(result.person.id);
    expect(result.person.id).toBeDefined();
  });

  it("regression: creates and retrieves an employee with an email correctly", async () => {
    const payload = employeeInput("EMAIL-001");
    payload.person.email = "test@example.com";
    const created = await createEmployee(authorizedActor, payload);
    
    createdEmployeeIds.push(created.id);
    createdPersonIds.push(created.person.id);

    // Verify it is returned from createEmployee (via selectEmployee)
    expect(created.person.email).toBe("test@example.com");

    // Verify it is returned from getEmployee
    const retrieved = await getEmployee(authorizedActor, created.id);
    expect(retrieved.person.email).toBe("test@example.com");
  });

  it("denies creation without the required permission", async () => {
    await expect(
      createEmployee(deniedActor, employeeInput("DENY-001")),
    ).rejects.toMatchObject({ code: "ACCESS_DENIED" });
  });

  it("denies creation in another organization or location", async () => {
    await expect(
      createEmployee(authorizedActor, {
        ...employeeInput("CROSS-ORG-001"),
        organizationId: secondOrganizationId,
        locationId: secondLocationId,
      }),
    ).rejects.toMatchObject({ code: "ACCESS_DENIED" });

    await expect(
      createEmployee(authorizedActor, employeeInput("CROSS-LOC-001", secondLocationId)),
    ).rejects.toMatchObject({ code: "ACCESS_DENIED" });
  });

  it("retrieves an employee only within the caller's authorized scope", async () => {
    const employee = await getEmployee(authorizedActor, "not-a-uuid").catch(
      (error) => error,
    );
    expect(employee).toBeInstanceOf(EmployeeServiceError);

    const createdForRetrieval = await createEmployee(
      authorizedActor,
      employeeInput("AUTH-002"),
    );
    createdEmployeeIds.push(createdForRetrieval.id);
    createdPersonIds.push(createdForRetrieval.person.id);
    const created = await getEmployee(authorizedActor, createdForRetrieval.id);
    expect(created.employeeCode).toMatch(/-EMP-/);

    await expect(getEmployee(deniedActor, created.id)).rejects.toMatchObject({
      code: "EMPLOYEE_NOT_FOUND",
    });
  });

  it("allows Owner retrieval across organizations and locations", async () => {
    const ownerEmployee = await createEmployee(
      ownerActor,
      {
        ...employeeInput("OWNER-001"),
        organizationId: secondOrganizationId,
        locationId: secondLocationId,
      },
    );
    createdEmployeeIds.push(ownerEmployee.id);
    createdPersonIds.push(ownerEmployee.person.id);

    const result = await getEmployee(ownerActor, ownerEmployee.id);
    expect(result.organizationId).toBe(secondOrganizationId);
    expect(result.locationId).toBe(secondLocationId);
  });

  it("updates an authorized employee profile without changing scope", async () => {
    const created = await createEmployee(
      authorizedActor,
      employeeInput("PROFILE-001"),
    );
    createdEmployeeIds.push(created.id);
    createdPersonIds.push(created.person.id);

    const updated = await updateEmployee(authorizedActor, created.id, {
      jobTitle: "Senior Operations Associate",
      person: { displayName: "Updated Employee" },
    });

    expect(updated).toMatchObject({
      id: created.id,
      organizationId,
      locationId,
      jobTitle: "Senior Operations Associate",
      person: { displayName: "Updated Employee" },
    });
  });

  it("supports one-way deactivation and preserves the separation fact", async () => {
    const created = await createEmployee(
      authorizedActor,
      employeeInput("LIFECYCLE-001"),
    );
    createdEmployeeIds.push(created.id);
    createdPersonIds.push(created.person.id);

    await db.update(employees)
      .set({ status: "ACTIVE" })
      .where(eq(employees.id, created.id));

    const inactive = await transitionEmployeeLifecycle(authorizedActor, created.id, {
      status: "INACTIVE",
      separationReason: "Resigned",
    });
    expect(inactive).toMatchObject({
      status: "INACTIVE",
    });

    await expect(
      transitionEmployeeLifecycle(authorizedActor, created.id, { status: "ACTIVE" }),
    ).rejects.toMatchObject({ code: "INVALID_LIFECYCLE_TRANSITION" });
    await expect(
      transitionEmployeeLifecycle(authorizedActor, created.id, { status: "ACTIVE" }),
    ).rejects.toMatchObject({ code: "INVALID_LIFECYCLE_TRANSITION" });
  });

  it("denies unauthorized and cross-scope profile updates", async () => {
    const created = await createEmployee(
      authorizedActor,
      employeeInput("UPDATE-DENY-001"),
    );
    createdEmployeeIds.push(created.id);
    createdPersonIds.push(created.person.id);

    await expect(
      updateEmployee(deniedActor, created.id, { jobTitle: "Denied" }),
    ).rejects.toMatchObject({ code: "EMPLOYEE_NOT_FOUND" });

    const otherScopeEmployee = await createEmployee(ownerActor, {
      ...employeeInput("UPDATE-CROSS-SCOPE-001"),
      organizationId: secondOrganizationId,
      locationId: secondLocationId,
    });
    createdEmployeeIds.push(otherScopeEmployee.id);
    createdPersonIds.push(otherScopeEmployee.person.id);
    await expect(
      updateEmployee(authorizedActor, otherScopeEmployee.id, {
        jobTitle: "Denied",
      }),
    ).rejects.toMatchObject({ code: "EMPLOYEE_NOT_FOUND" });
  });
});

