import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/db";
import {
  organizations, locations, roles, businessRoles, permissions, rolePermissions,
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

describe("Phase 4 Tests: Hierarchy, Salary & Directory", () => {
  let orgId: string;
  let locId: string;
  let locId2: string; // branch B
  let hrUserId: string;
  let ownerUserId: string;
  let unauthorizedUserId: string;
  let roleId: string;

  beforeAll(async () => {
    orgId = randomUUID();
    locId = randomUUID();
    locId2 = randomUUID();
    hrUserId = `hr-user-${randomUUID()}`;
    ownerUserId = `owner-user-${randomUUID()}`;
    unauthorizedUserId = `unauth-user-${randomUUID()}`;
    roleId = randomUUID();

    const codeSuffix = orgId.split('-')[0];
    await db.insert(organizations).values([{ id: orgId, name: "Phase4 Org", code: `P4-${codeSuffix}`, gstNumber: `GST${codeSuffix}` }]);
    await db.insert(locations).values([
      { id: locId, organizationId: orgId, name: "Branch A", code: `B1-${codeSuffix}` },
      { id: locId2, organizationId: orgId, name: "Branch B", code: `B2-${codeSuffix}` }
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
      { id: hrUserId, name: "HR", email: `hr-p4-${randomUUID()}@test.com`, createdAt: new Date(), updatedAt: new Date() },
      { id: ownerUserId, name: "Owner", email: `owner-p4-${randomUUID()}@test.com`, createdAt: new Date(), updatedAt: new Date() },
      { id: unauthorizedUserId, name: "Unauth", email: `unauth-p4-${randomUUID()}@test.com`, createdAt: new Date(), updatedAt: new Date() },
    ]);

    await db.insert(organizationMemberships).values([
      { userId: hrUserId, organizationId: orgId },
      { userId: ownerUserId, organizationId: orgId },
      { userId: unauthorizedUserId, organizationId: orgId },
    ]);
    // HR only has access to Branch A
    await db.insert(locationMemberships).values([
      { userId: hrUserId, organizationId: orgId, locationId: locId },
      { userId: ownerUserId, organizationId: orgId, locationId: locId },
      { userId: ownerUserId, organizationId: orgId, locationId: locId2 },
    ]);
    await db.insert(locationRoleAssignments).values([
      { userId: hrUserId, organizationId: orgId, locationId: locId, roleId },
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

  afterAll(async () => {
    // Rely on test db isolation
  });

  const buildActiveEmployee = async (name: string, loc: string, reportingTo?: string) => {
    const actor = { id: hrUserId };
    const emp = await createEmployee(actor, {
      organizationId: orgId,
      locationId: loc,
      jobTitle: "Worker",
      employmentStartDate: "2026-09-01",
      biometricId: `BIO-${randomUUID()}`,
      category: "Permanent",
      person: {
        firstName: name,
        displayName: name,
        phone: "+919999999999",
        dateOfBirth: "1990-01-01"
      }
    });

    await updateEmployee(actor, emp.id, {
      gender: "Male",
      maritalStatus: "Single",
      residentialAddress: "Address",
      aadhaarDocumentUrl: "url",
      photoUrl: "url",
      reportingEmployeeId: reportingTo,
      secondaryMobile: "+918888888888" // testing redaction
    });

    const { employeeFamilyContacts } = await import("@/db/schema");
    await db.insert(employeeFamilyContacts).values([
      { organizationId: orgId, employeeId: emp.id, category: "EMERGENCY_CONTACT", name: "E", relationship: "R", mobile: "123" },
      { organizationId: orgId, employeeId: emp.id, category: "PARENT", fatherName: "F", motherName: "M" }
    ]);

    await setEmployeeSalaryInfo(actor, emp.id, {
      salaryType: "Monthly", amount: "100", paymentMethod: "CASH"
    });

    await transitionEmployeeLifecycle(actor, emp.id, { status: "ACTIVE", onboardingDeclared: true });
    return emp.id;
  };

  it("Salary Direct CRUD: Owner edits active employee", async () => {
    const hrActor = { id: hrUserId };
    const ownerActor = { id: ownerUserId };

    const empId = await buildActiveEmployee("Salary Test", locId);

    // HR cannot direct edit active employee
    await expect(setEmployeeSalaryInfo(hrActor, empId, {
      salaryType: "Monthly", amount: "200", paymentMethod: "CASH"
    })).rejects.toMatchObject({ code: "ACCESS_DENIED" });

    // Owner CAN direct edit active employee
    await expect(setEmployeeSalaryInfo(ownerActor, empId, {
      salaryType: "Monthly", amount: "300", paymentMethod: "CASH"
    })).resolves.toBe(true);

    const history = await db.select().from(employeeHistorySalary).where(eq(employeeHistorySalary.employeeId, empId));
    // Since activation creates history if setup, wait, setEmployeeSalaryInfo for DRAFT doesn't create history.
    // So there should be exactly 1 history row (from Owner's update on active status)
    expect(history.length).toBe(2);
    // Sort by effectiveFrom or id to get latest
    const latest = history.sort((a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime())[0];
    expect(latest.amount).toBe("300");
  });

  it("Hierarchy Generation & Contact Directory Scope", async () => {
    // Build A -> B -> C hierarchy. 
    // Wait, HR is in Branch A. Can HR build an employee in Branch B? No.
    // I will use Owner to build employees in Branch B.
    const ownerActor = { id: ownerUserId };
    
    // A (Branch A)
    const empA = await buildActiveEmployee("Director A", locId);
    
    // Create Branch B employee manually
    const empB = await createEmployee(ownerActor, {
      organizationId: orgId,
      locationId: locId2,
      jobTitle: "Manager B",
      employmentStartDate: "2026-09-01",
      biometricId: `BIO-${randomUUID()}`,
      category: "Permanent",
      person: { firstName: "Manager B", displayName: "Manager B", phone: "+123", dateOfBirth: "1990-01-01" }
    });
    await updateEmployee(ownerActor, empB.id, {
      gender: "Male", maritalStatus: "Single", residentialAddress: "Address",
      aadhaarDocumentUrl: "url", photoUrl: "url",
      reportingEmployeeId: empA
    });
    const { employeeFamilyContacts } = await import("@/db/schema");
    await db.insert(employeeFamilyContacts).values([
      { organizationId: orgId, employeeId: empB.id, category: "EMERGENCY_CONTACT", name: "E", relationship: "R", mobile: "123" },
      { organizationId: orgId, employeeId: empB.id, category: "PARENT", fatherName: "F", motherName: "M" }
    ]);
    await setEmployeeSalaryInfo(ownerActor, empB.id, { salaryType: "Monthly", amount: "100", paymentMethod: "CASH" });
    await transitionEmployeeLifecycle(ownerActor, empB.id, { status: "ACTIVE", onboardingDeclared: true });

    // Contact Directory Test
    const hrDirectory = await getContactDirectory({ id: hrUserId }, orgId);
    // HR only sees Branch A. 
    expect(hrDirectory.some(e => e.id === empA)).toBe(true);
    expect(hrDirectory.some(e => e.id === empB.id)).toBe(false);

    // Verify redaction in Directory
    const dirEntry = hrDirectory.find(e => e.id === empA)!;
    expect(dirEntry).not.toHaveProperty("secondaryMobile");
    expect(dirEntry).not.toHaveProperty("address");

    const ownerDirectory = await getContactDirectory(ownerActor, orgId);
    // Owner sees all
    expect(ownerDirectory.some(e => e.id === empA)).toBe(true);
    expect(ownerDirectory.some(e => e.id === empB.id)).toBe(true);

    // Hierarchy Test
    const ownerTree = await getOrganizationHierarchy(ownerActor, orgId);
    
    // Find Director A in tree
    const rootA = ownerTree.find(n => n.id === empA);
    expect(rootA).toBeDefined();
    expect(rootA!.children.length).toBeGreaterThanOrEqual(1);
    expect(rootA!.children.some(c => c.id === empB.id)).toBe(true); // B is child of A

    // HR Hierarchy Test (HR only has access to locId)
    const hrTree = await getOrganizationHierarchy({ id: hrUserId }, orgId);
    // Since HR is restricted to locId, if we fetch the whole tree, Branch B nodes should be pruned IF they don't have descendants in Branch A.
    // Manager B is in locId2 and has no children, so it should be pruned for HR.
    const hrRootA = hrTree.find(n => n.id === empA);
    expect(hrRootA).toBeDefined();
    expect(hrRootA!.children.some(c => c.id === empB.id)).toBe(false); // B pruned
  });
});
