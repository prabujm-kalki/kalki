import { describe, it, expect, beforeAll } from "vitest";
import { db } from "@/db";
import {
  organizations, locations, roles, permissions, rolePermissions,
  organizationMemberships, locationMemberships, locationRoleAssignments,
  authUsers, systemAuthorities, employees, employeeSalaryInfo,
  people, employeeHistorySalary
} from "@/db/schema";
import { 
  createEmployee, updateEmployee, transitionEmployeeLifecycle,
  setEmployeeSalaryInfo, getOrganizationHierarchy, getContactDirectory
} from "@/domains/employees/service";
import { randomUUID } from "crypto";
import { eq, inArray } from "drizzle-orm";

describe("Phase 4 Final Gate Audit Tests", () => {
  let orgId: string;
  let locA: string;
  let locB: string;
  let hrUserId: string;
  let ownerUserId: string;
  let roleId: string;

  beforeAll(async () => {
    orgId = randomUUID();
    locA = randomUUID();
    locB = randomUUID();
    hrUserId = `hr-user-${randomUUID()}`;
    ownerUserId = `owner-user-${randomUUID()}`;
    roleId = randomUUID();

    const codeSuffix = orgId.split('-')[0];
    await db.insert(organizations).values([{ id: orgId, name: "Phase4 Audit Org", code: `P4A-${codeSuffix}`, gstNumber: `GST${codeSuffix}` }]);
    await db.insert(locations).values([
      { id: locA, organizationId: orgId, name: "Branch A", code: `B1-${codeSuffix}` },
      { id: locB, organizationId: orgId, name: "Branch B", code: `B2-${codeSuffix}` }
    ]);
    await db.insert(roles).values([{ id: roleId, name: "HR Role", code: `P4_HR_${codeSuffix}` }]);

    const existingPerms = await db.select().from(permissions).where(inArray(permissions.code, ["employee:create", "employee:update", "employee:read"]));
    const permMap = Object.fromEntries(existingPerms.map(p => [p.code, p.id]));

    await db.insert(rolePermissions).values([
      { roleId, permissionId: permMap["employee:create"] },
      { roleId, permissionId: permMap["employee:update"] },
      { roleId, permissionId: permMap["employee:read"] }
    ]);

    await db.insert(authUsers).values([
      { id: hrUserId, name: "HR", email: `hr-p4a-${randomUUID()}@test.com`, createdAt: new Date(), updatedAt: new Date() },
      { id: ownerUserId, name: "Owner", email: `owner-p4a-${randomUUID()}@test.com`, createdAt: new Date(), updatedAt: new Date() }
    ]);

    await db.insert(organizationMemberships).values([
      { userId: hrUserId, organizationId: orgId },
      { userId: ownerUserId, organizationId: orgId }
    ]);
    // HR only has access to Branch A
    await db.insert(locationMemberships).values([
      { userId: hrUserId, organizationId: orgId, locationId: locA },
      { userId: ownerUserId, organizationId: orgId, locationId: locA },
      { userId: ownerUserId, organizationId: orgId, locationId: locB },
    ]);
    await db.insert(locationRoleAssignments).values([
      { userId: hrUserId, organizationId: orgId, locationId: locA, roleId },
    ]);
    const existingOwner = await db.select().from(systemAuthorities).where(eq(systemAuthorities.authority, "OWNER"));
    if (existingOwner.length > 0) {
      ownerUserId = existingOwner[0].userId;
    } else {
      await db.insert(systemAuthorities).values([
        { userId: ownerUserId, authority: "OWNER" }
      ]);
    }
  });

  const buildActiveEmployee = async (name: string, loc: string, reportingTo?: string) => {
    const actor = { id: ownerUserId }; // Use owner to bypass branch creation issues
    const emp = await createEmployee(actor, {
      organizationId: orgId,
      locationId: loc,
      jobTitle: name,
      employmentStartDate: "2026-09-01",
      biometricId: `BIO-${randomUUID()}`,
      category: "Permanent",
      familyContacts: [{ category: "EMERGENCY_CONTACT", name: "test", mobile: "9876543210", relationship: "test" }],
      person: { firstName: name, displayName: name, phone: `99${Math.floor(Math.random() * 10000000).toString().padStart(8, "0")}`, dateOfBirth: "1990-01-01" }
    });
    await updateEmployee(actor, emp.id, {
      gender: "Male", maritalStatus: "Single", residentialAddress: "Address",
      aadhaarDocumentUrl: "url", photoUrl: "url", reportingEmployeeId: reportingTo
    });
    const { employeeFamilyContacts } = await import("@/db/schema");
    await db.insert(employeeFamilyContacts).values([
      { organizationId: orgId, employeeId: emp.id, category: "EMERGENCY_CONTACT", name: "E", relationship: "R", mobile: "9876543210" },
      { organizationId: orgId, employeeId: emp.id, category: "PARENT", fatherName: "F", motherName: "M" }
    ]);
    await setEmployeeSalaryInfo(actor, emp.id, { salaryType: "Monthly", amount: "100", paymentMethod: "CASH" });
    await transitionEmployeeLifecycle(actor, emp.id, { status: "ACTIVE", onboardingDeclared: true });
    return emp.id;
  };

  describe("Salary / Payment", () => {
    it("rejects invalid payment combinations (BANK_TRANSFER missing fields)", async () => {
      const actor = { id: ownerUserId };
      const empId = await buildActiveEmployee("Test Payment", locA);
      
      // Should fail DB constraint
      await expect(setEmployeeSalaryInfo(actor, empId, {
        salaryType: "Monthly", amount: "100", paymentMethod: "BANK_TRANSFER" // missing account details
      })).rejects.toThrow(); // throws postgres constraint error
    });

    it("rejects invalid payment combinations (GPAY missing fields)", async () => {
      const actor = { id: ownerUserId };
      const empId = await buildActiveEmployee("Test Payment 2", locA);
      
      // Should fail DB constraint
      await expect(setEmployeeSalaryInfo(actor, empId, {
        salaryType: "Monthly", amount: "100", paymentMethod: "GPAY" // missing gpay details
      })).rejects.toThrow();
    });

    it("accepts valid BANK_TRANSFER", async () => {
      const actor = { id: ownerUserId };
      const empId = await buildActiveEmployee("Test Payment 3", locA);
      
      await expect(setEmployeeSalaryInfo(actor, empId, {
        salaryType: "Daily", amount: "100.50", paymentMethod: "BANK_TRANSFER",
        accountHolderName: "John", accountNumber: "1234", bankName: "SBI", ifscCode: "SBIN"
      })).resolves.toBe(true);
    });
  });

  describe("Organization Hierarchy", () => {
    it("rejects self-reference", async () => {
      const actor = { id: ownerUserId };
      const empId = await buildActiveEmployee("Self Ref", locA);
      
      await expect(updateEmployee(actor, empId, {
        reportingEmployeeId: empId
      })).rejects.toMatchObject({ code: "CYCLE_DETECTED" });
    });

    it("rejects A->B->A cycle", async () => {
      const actor = { id: ownerUserId };
      const empA = await buildActiveEmployee("A", locA);
      const empB = await buildActiveEmployee("B", locA, empA);
      
      await expect(updateEmployee(actor, empA, {
        reportingEmployeeId: empB
      })).rejects.toMatchObject({ code: "CYCLE_DETECTED" });
    });

    it("rejects A->B->C->A cycle", async () => {
      const actor = { id: ownerUserId };
      const empA = await buildActiveEmployee("A", locA);
      const empB = await buildActiveEmployee("B", locA, empA);
      const empC = await buildActiveEmployee("C", locA, empB);
      
      await expect(updateEmployee(actor, empA, {
        reportingEmployeeId: empC
      })).rejects.toMatchObject({ code: "CYCLE_DETECTED" });
    });
  });
});
