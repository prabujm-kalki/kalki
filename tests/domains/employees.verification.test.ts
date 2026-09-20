import "dotenv/config";
import { randomUUID } from "node:crypto";
import { eq, inArray, sql } from "drizzle-orm";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import {
  auditEvents,
  employeeFamilyContacts,
  employeeSalaryInfo,
  employeeHistoryStatus,
  employeeHistoryBranch,
  employeeHistoryReporting,
  employeeHistoryCategory,
  employeeHistorySalary,
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

const authorizedUserId = `employee-test-authorized-${randomUUID()}`;
const deniedUserId = `employee-test-denied-${randomUUID()}`;
let ownerUserId = "";

const authorizedActor = { id: authorizedUserId };
const deniedActor = { id: deniedUserId };
const ownerActor = { id: "" };

const organizationId = randomUUID();
const secondOrganizationId = randomUUID();
const locationId = randomUUID();
const secondLocationId = randomUUID();

const roleId = randomUUID();
const permissionId = "1bdc50ab-e9f0-4560-848e-fdb9d5e35919";
const createPermissionId = "2bdc50ab-e9f0-4560-848e-fdb9d5e35919";
const updatePermissionId = "3bdc50ab-e9f0-4560-848e-fdb9d5e35919";

const createdPermissionIds: string[] = [];
const createdEmployeeIds: string[] = [];
const createdPersonIds: string[] = [];

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

const employeeInput = (employeeCode: string, targetLocationId = locationId) => ({
  organizationId,
  locationId: targetLocationId,
  jobTitle: "Operations Associate",
  employmentStartDate: "2026-09-01",
  biometricId: `BIO-${employeeCode}`,
  familyContacts: [{ category: "EMERGENCY_CONTACT", name: "test", mobile: "9876543210", relationship: "test" }],
  person: { firstName: `Test${randomUUID().slice(0, 8)}`,
    lastName: "Employee",
    displayName: `Test Employee ${employeeCode}`,
    phone: `99${Math.floor(Math.random() * 10000000).toString().padStart(8, '0')}`,
    email: `test.${employeeCode}@example.invalid`,
  },
});

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
    await db.delete(employeeHistoryReporting).where(eq(employeeHistoryReporting.reportingEmployeeId, employeeId));
  }
  for (const employeeId of createdEmployeeIds) {
    await db.delete(employeeHistoryReporting).where(eq(employeeHistoryReporting.employeeId, employeeId));
    await db.delete(employeeHistoryStatus).where(eq(employeeHistoryStatus.employeeId, employeeId));
    await db.delete(employeeHistoryBranch).where(eq(employeeHistoryBranch.employeeId, employeeId));
    await db.delete(employeeHistoryCategory).where(eq(employeeHistoryCategory.employeeId, employeeId));
    await db.delete(employeeHistorySalary).where(eq(employeeHistorySalary.employeeId, employeeId));
    await db.delete(employeeFamilyContacts).where(eq(employeeFamilyContacts.employeeId, employeeId));
    await db.delete(employeeSalaryInfo).where(eq(employeeSalaryInfo.employeeId, employeeId));
  }
  for (const employeeId of createdEmployeeIds) {
    await db.update(employees).set({ reportingEmployeeId: null }).where(eq(employees.id, employeeId));
  }
  for (const employeeId of createdEmployeeIds) {
    await db.delete(employees).where(eq(employees.id, employeeId));
  }
  for (const personId of createdPersonIds) {
    await db.delete(people).where(eq(people.id, personId));
  }
});

describe("Phase 2 Verification Strengthening", () => {
  describe("Activation Test Coverage", () => {
    it("DRAFT creation with incomplete onboarding succeeds", async () => {
      const draft = await createEmployee(authorizedActor, employeeInput("V-DRAFT-001"));
      createdEmployeeIds.push(draft.id);
      createdPersonIds.push(draft.person.id);
      expect(draft.status).toBe("DRAFT");
    });

    it("Activation fails when mandatory fields are missing", async () => {
      const draft = await createEmployee(authorizedActor, employeeInput("V-FAIL-001"));
      createdEmployeeIds.push(draft.id);
      createdPersonIds.push(draft.person.id);
      
      await expect(
        transitionEmployeeLifecycle(authorizedActor, draft.id, { status: "ACTIVE", onboardingDeclared: true })
      ).rejects.toMatchObject({ code: "INVALID_LIFECYCLE_TRANSITION", message: expect.stringContaining("demographic data") });
    });

    it("Married employee requires spouse data, non-married does not", async () => {
      const marriedDraft = await createEmployee(authorizedActor, employeeInput("V-MARR-001"));
      createdEmployeeIds.push(marriedDraft.id);
      createdPersonIds.push(marriedDraft.person.id);
      
      await db.update(employees).set({ 
        aadhaarDocumentUrl: 'doc', photoUrl: 'photo', gender: 'Male', maritalStatus: 'Married', residentialAddress: 'Addr', category: 'Permanent', employmentStartDate: new Date()
      }).where(eq(employees.id, marriedDraft.id));
      await db.insert(employeeFamilyContacts).values({ organizationId, employeeId: marriedDraft.id, category: 'EMERGENCY_CONTACT', name: 'E', relationship: 'R', mobile: 'M', recordedBy: authorizedActor.id });
      await db.insert(employeeFamilyContacts).values({ organizationId, employeeId: marriedDraft.id, category: 'PARENT', fatherName: 'F', motherName: 'M', recordedBy: authorizedActor.id });
      await db.insert(employeeSalaryInfo).values({ organizationId, employeeId: marriedDraft.id, salaryType: 'Monthly', paymentMethod: 'Cash', amount: '1000', effectiveFrom: new Date(), recordedBy: authorizedActor.id });
      
      await db.update(people).set({ dateOfBirth: new Date() }).where(eq(people.id, marriedDraft.person.id));
      await expect(transitionEmployeeLifecycle(authorizedActor, marriedDraft.id, { status: "ACTIVE", onboardingDeclared: true })).rejects.toMatchObject({ code: "INVALID_LIFECYCLE_TRANSITION" });
      
      const singleDraft = await createEmployee(authorizedActor, employeeInput("V-SING-001"));
      createdEmployeeIds.push(singleDraft.id);
      createdPersonIds.push(singleDraft.person.id);
      
      await db.update(employees).set({ 
        aadhaarDocumentUrl: 'doc', photoUrl: 'photo', gender: 'Male', maritalStatus: 'Single', residentialAddress: 'Addr', category: 'Permanent', employmentStartDate: new Date()
      }).where(eq(employees.id, singleDraft.id));
      await db.insert(employeeFamilyContacts).values({ organizationId, employeeId: singleDraft.id, category: 'EMERGENCY_CONTACT', name: 'E', relationship: 'R', mobile: 'M', recordedBy: authorizedActor.id });
      await db.insert(employeeFamilyContacts).values({ organizationId, employeeId: singleDraft.id, category: 'PARENT', fatherName: 'F', motherName: 'M', recordedBy: authorizedActor.id });
      await db.insert(employeeSalaryInfo).values({ organizationId, employeeId: singleDraft.id, salaryType: 'Monthly', paymentMethod: 'Cash', amount: '1000', effectiveFrom: new Date(), recordedBy: authorizedActor.id });
      
      await db.update(people).set({ dateOfBirth: new Date() }).where(eq(people.id, singleDraft.person.id));
      const activated = await transitionEmployeeLifecycle(authorizedActor, singleDraft.id, { status: "ACTIVE", onboardingDeclared: true });
      expect(activated.status).toBe("ACTIVE");
    });
  });

  describe("Lifecycle State Machine Tests", () => {
    it("Exhaustive valid and invalid transitions", async () => {
      const e = await createEmployee(authorizedActor, employeeInput("V-LIFE-001"));
      createdEmployeeIds.push(e.id);
      createdPersonIds.push(e.person.id);
      
      await expect(transitionEmployeeLifecycle(authorizedActor, e.id, { status: "INACTIVE", separationReason: "R" })).rejects.toMatchObject({ code: "INVALID_LIFECYCLE_TRANSITION" });
      
      // Setup for ACTIVE
      await db.update(employees).set({ aadhaarDocumentUrl: 'doc', photoUrl: 'photo', gender: 'Male', maritalStatus: 'Single', residentialAddress: 'Addr', category: 'Permanent', employmentStartDate: new Date() }).where(eq(employees.id, e.id));
      await db.insert(employeeFamilyContacts).values({ organizationId, employeeId: e.id, category: 'EMERGENCY_CONTACT', name: 'E', relationship: 'R', mobile: 'M', recordedBy: authorizedActor.id });
      await db.insert(employeeFamilyContacts).values({ organizationId, employeeId: e.id, category: 'PARENT', fatherName: 'F', motherName: 'M', recordedBy: authorizedActor.id });
      await db.insert(employeeSalaryInfo).values({ organizationId, employeeId: e.id, salaryType: 'Monthly', paymentMethod: 'Cash', amount: '1000', effectiveFrom: new Date(), recordedBy: authorizedActor.id });
      
      await db.update(people).set({ dateOfBirth: new Date() }).where(eq(people.id, e.person.id));
      const active = await transitionEmployeeLifecycle(authorizedActor, e.id, { status: "ACTIVE", onboardingDeclared: true });
      expect(active.status).toBe("ACTIVE");
      
      const inactive = await transitionEmployeeLifecycle(authorizedActor, e.id, { status: "INACTIVE", separationReason: "R" });
      expect(inactive.status).toBe("INACTIVE");
      
      await expect(transitionEmployeeLifecycle(authorizedActor, e.id, { status: "ACTIVE", onboardingDeclared: true })).rejects.toMatchObject({ code: "INVALID_LIFECYCLE_TRANSITION" });
      
      const exited = await transitionEmployeeLifecycle(authorizedActor, e.id, { status: "EXITED", separationReason: "R" });
      expect(exited.status).toBe("EXITED");
      
      await expect(transitionEmployeeLifecycle(authorizedActor, e.id, { status: "ACTIVE", onboardingDeclared: true })).rejects.toMatchObject({ code: "INVALID_LIFECYCLE_TRANSITION" });
    });
  });
  
  describe("Reporting Person Tests", () => {
    it("Valid, self, and cross-org reporting", async () => {
      const a = await createEmployee(authorizedActor, employeeInput("V-RPT-A-01"));
      createdEmployeeIds.push(a.id);
      createdPersonIds.push(a.person.id);
      
      const b = await createEmployee(authorizedActor, employeeInput("V-RPT-B-01"));
      createdEmployeeIds.push(b.id);
      createdPersonIds.push(b.person.id);
      
      // Valid
      const valid = await updateEmployee(authorizedActor, b.id, { reportingEmployeeId: a.id });
      expect(valid.reportingEmployeeId).toBe(a.id);
      
      // Self
      await expect(updateEmployee(authorizedActor, b.id, { reportingEmployeeId: b.id })).rejects.toMatchObject({ code: "CYCLE_DETECTED" });
      
      // Direct cycle
      await expect(updateEmployee(authorizedActor, a.id, { reportingEmployeeId: b.id })).rejects.toMatchObject({ code: "CYCLE_DETECTED" });
    });
  });
  
  describe("Audit & History Logging", () => {
    it("Creates audit events and history rows", async () => {
      const a = await createEmployee(authorizedActor, employeeInput("V-AUD-001"));
      createdEmployeeIds.push(a.id);
      createdPersonIds.push(a.person.id);
      
      await db.update(employees).set({ aadhaarDocumentUrl: 'doc', photoUrl: 'photo', gender: 'Male', maritalStatus: 'Single', residentialAddress: 'Addr', category: 'Permanent', employmentStartDate: new Date() }).where(eq(employees.id, a.id));
      await db.insert(employeeFamilyContacts).values({ organizationId, employeeId: a.id, category: 'EMERGENCY_CONTACT', name: 'E', relationship: 'R', mobile: 'M', recordedBy: authorizedActor.id });
      await db.insert(employeeFamilyContacts).values({ organizationId, employeeId: a.id, category: 'PARENT', fatherName: 'F', motherName: 'M', recordedBy: authorizedActor.id });
      await db.insert(employeeSalaryInfo).values({ organizationId, employeeId: a.id, salaryType: 'Monthly', paymentMethod: 'Cash', amount: '1000', effectiveFrom: new Date(), recordedBy: authorizedActor.id });
      
      await db.update(people).set({ dateOfBirth: new Date() }).where(eq(people.id, a.person.id));
      await transitionEmployeeLifecycle(authorizedActor, a.id, { status: "ACTIVE", onboardingDeclared: true });
      
      // check history branch and category
      const hist = await db.select().from(employeeHistoryBranch).where(eq(employeeHistoryBranch.employeeId, a.id));
      expect(hist.length).toBeGreaterThan(0);
      
      const audits = await db.select().from(auditEvents).where(eq(auditEvents.entityId, a.id));
      expect(audits.length).toBeGreaterThan(0);
    });
  });
  describe("Mobile Validation", () => {
    it("rejects duplicate primary mobile", async () => {
      const payload1 = employeeInput("MOB-DUP-1");
      payload1.person.phone = "9876543210";
      const emp1 = await createEmployee(authorizedActor, payload1);
      createdEmployeeIds.push(emp1.id);
      createdPersonIds.push(emp1.person.id);

      const payload2 = employeeInput("MOB-DUP-2");
      payload2.person.phone = "9876543210";
      await expect(createEmployee(authorizedActor, payload2)).rejects.toMatchObject({
        code: "INVALID_INPUT",
        message: "Mobile number is already registered to another employee"
      });
      
      const retrieved = await getEmployee(authorizedActor, emp1.id);
      expect(retrieved.person.phone).toBe("9876543210");
      
      const updated = await updateEmployee(authorizedActor, emp1.id, {
        person: { phone: "9876543210" }
      });
      expect(updated.person.phone).toBe("9876543210");
      
      const payload3 = employeeInput("MOB-DUP-3");
      payload3.person.phone = "9999999999";
      const emp3 = await createEmployee(authorizedActor, payload3);
      createdEmployeeIds.push(emp3.id);
      createdPersonIds.push(emp3.person.id);
      
      await expect(updateEmployee(authorizedActor, emp1.id, {
        person: { phone: "9999999999" }
      })).rejects.toMatchObject({
        code: "INVALID_INPUT",
        message: "Mobile number is already registered to another employee"
      });
    });

    it("validates mobile number formats", async () => {
      const p = employeeInput("MOB-FMT");
      const testCases = [
        "1234", "12345", "12345678", "123456789", "12345678901",
        "abcdefghij", "98765abcde", "98765-43210", "98765 43210"
      ];
      for (const invalidPhone of testCases) {
        p.person.phone = invalidPhone;
        await expect(createEmployee(authorizedActor, p)).rejects.toMatchObject({
          code: "INVALID_INPUT"
        });
      }
      p.person.phone = "9876543211";
      const validEmp = await createEmployee(authorizedActor, p);
      createdEmployeeIds.push(validEmp.id);
      createdPersonIds.push(validEmp.person.id);
      expect(validEmp.person.phone).toBe("9876543211");
    });
  });
});
