import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/db";
import {
  organizations, locations, roles, businessRoles, permissions, rolePermissions,
  organizationMemberships, locationMemberships, locationRoleAssignments,
  authUsers, systemAuthorities, employees, employeeChangeRequests,
  employeeHistoryBranch, employeeHistorySalary, employeeSalaryInfo,
  people,
} from "@/db/schema";
import { 
  proposeEmployeeChange, approveEmployeeChange, rejectEmployeeChange,
  createEmployee, updateEmployee, transitionEmployeeLifecycle, getEmployee,
  EmployeeServiceError,
} from "@/domains/employees/service";
import { randomUUID } from "crypto";
import { eq, and, inArray } from "drizzle-orm";

describe("Phase 3 Approval Workflow Tests", () => {
  let orgId: string;
  let locId: string;
  let hrUserId: string;
  let ownerUserId: string;
  let unauthorizedUserId: string;
  let roleId: string;

  beforeAll(async () => {
    orgId = randomUUID();
    locId = randomUUID();
    hrUserId = `hr-user-${randomUUID()}`;
    ownerUserId = `owner-user-${randomUUID()}`;
    unauthorizedUserId = `unauth-user-${randomUUID()}`;
    roleId = randomUUID();

    const codeSuffix = orgId.split('-')[0];
    await db.insert(organizations).values([{ id: orgId, name: "Workflow Org", code: `W-${codeSuffix}`, gstNumber: `GST${codeSuffix}` }]);
    await db.insert(locations).values([{ id: locId, organizationId: orgId, name: "Workflow Loc", code: `L-${codeSuffix}` }]);
    await db.insert(roles).values([{ id: roleId, name: "HR Role", code: `HR_ROLE_${codeSuffix}` }]);

    const existingPerms = await db.select().from(permissions).where(inArray(permissions.code, ["employee:create", "employee:update", "employee:read", "employee:approve"]));
    const permMap = Object.fromEntries(existingPerms.map(p => [p.code, p.id]));

    const neededPerms = ["employee:create", "employee:update", "employee:read", "employee:approve"];
    for (const code of neededPerms) {
      if (!permMap[code]) {
        const newId = randomUUID();
        await db.insert(permissions).values({ id: newId, code, name: code });
        permMap[code] = newId;
      }
    }

    await db.insert(rolePermissions).values([
      { roleId, permissionId: permMap["employee:create"] },
      { roleId, permissionId: permMap["employee:update"] },
      { roleId, permissionId: permMap["employee:read"] },
      { roleId, permissionId: permMap["employee:approve"] },
    ]);

    await db.insert(authUsers).values([
      { id: hrUserId, name: "HR", email: `hr-${randomUUID()}@test.com`, createdAt: new Date(), updatedAt: new Date() },
      { id: ownerUserId, name: "Owner", email: `owner-${randomUUID()}@test.com`, createdAt: new Date(), updatedAt: new Date() },
      { id: unauthorizedUserId, name: "Unauth", email: `unauth-${randomUUID()}@test.com`, createdAt: new Date(), updatedAt: new Date() },
    ]);

    await db.insert(organizationMemberships).values([
      { userId: hrUserId, organizationId: orgId },
      { userId: ownerUserId, organizationId: orgId },
      { userId: unauthorizedUserId, organizationId: orgId },
    ]);
    await db.insert(locationMemberships).values([
      { userId: hrUserId, organizationId: orgId, locationId: locId },
      { userId: ownerUserId, organizationId: orgId, locationId: locId },
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
    // Tests create data in isolated organizations.
    // Cannot delete locations or organizations because audit_events (append-only) references them.
  });

  const createActiveEmployee = async () => {
    const actor = { id: hrUserId };
    const emp = await createEmployee(actor, {
      organizationId: orgId,
      locationId: locId,
      jobTitle: "Worker",
      employmentStartDate: "2026-09-01",
      biometricId: `BIO-${randomUUID()}`,
      category: "Permanent",
      familyContacts: [{ category: "EMERGENCY_CONTACT", name: "test", mobile: "123", relationship: "test" }],
        person: { firstName: "Test",
        displayName: "Test Emp",
        phone: `+9199${Math.floor(Math.random() * 100000000)}`,
        dateOfBirth: "1990-01-01"
      }
    });

    // Populate required fields
    await updateEmployee(actor, emp.id, {
      gender: "Male",
      maritalStatus: "Single",
      residentialAddress: "Address",
      aadhaarDocumentUrl: "url",
      photoUrl: "url",
    });

    // Emergency, Parent
    const { employeeFamilyContacts } = await import("@/db/schema");
    await db.insert(employeeFamilyContacts).values([
      { organizationId: orgId, employeeId: emp.id, category: "EMERGENCY_CONTACT", name: "E", relationship: "R", mobile: "123" },
      { organizationId: orgId, employeeId: emp.id, category: "PARENT", fatherName: "F", motherName: "M" }
    ]);

    // Salary
    await db.insert(employeeSalaryInfo).values({
      organizationId: orgId, employeeId: emp.id, salaryType: "Monthly", amount: "100", effectiveFrom: new Date(), paymentMethod: "CASH"
    });

    // Activate
    await transitionEmployeeLifecycle(actor, emp.id, { status: "ACTIVE", onboardingDeclared: true });
    return getEmployee(actor, emp.id);
  };

  it("End-to-End: Propose -> Master Unchanged -> Owner Approves -> Master & History Updated", async () => {
    const hrActor = { id: hrUserId };
    const ownerActor = { id: ownerUserId };

    const emp = await createActiveEmployee();

    // 1. Propose change
    const proposal = await proposeEmployeeChange(hrActor, emp.id, {
      jobTitle: "Senior Worker",
      salary: {
        salaryType: "Monthly",
        amount: "50000",
        paymentMethod: "CASH"
      }
    }, "Promotion");

    expect(proposal.status).toBe("PENDING");

    // 2. Master Unchanged
    let currentEmp = await getEmployee(hrActor, emp.id);
    expect(currentEmp.jobTitle).toBe("Worker"); // unchanged

    // 3. Owner Approves
    const approved = await approveEmployeeChange(ownerActor, proposal.id, "Looks good");
    expect(approved.status).toBe("APPROVED");
    expect(approved.reviewComment).toBe("Looks good");

    // 4. Master Updated
    currentEmp = await getEmployee(hrActor, emp.id);
    expect(currentEmp.jobTitle).toBe("Senior Worker");

    // 5. History Updated
    const salaryHistories = await db.select().from(employeeHistorySalary).where(eq(employeeHistorySalary.employeeId, emp.id));
    // Should have 1 from activation + 1 from approval
    expect(salaryHistories.length).toBeGreaterThanOrEqual(2);
    expect(salaryHistories.some(h => h.amount === "50000")).toBe(true);
  });

  it("Propose -> Reject -> Master remains unchanged", async () => {
    const hrActor = { id: hrUserId };
    const ownerActor = { id: ownerUserId };
    const emp = await createActiveEmployee();

    const proposal = await proposeEmployeeChange(hrActor, emp.id, {
      category: "Temporary"
    }, "Change category");

    const rejected = await rejectEmployeeChange(ownerActor, proposal.id, "No budget");
    expect(rejected.status).toBe("REJECTED");

    const currentEmp = await getEmployee(hrActor, emp.id);
    expect(currentEmp.category).toBe("Permanent"); // unchanged
  });

  it("Unauthorized User Cannot Approve", async () => {
    const hrActor = { id: hrUserId };
    const unauthActor = { id: unauthorizedUserId };
    const emp = await createActiveEmployee();

    const proposal = await proposeEmployeeChange(hrActor, emp.id, { jobTitle: "X" }, "Y");

    await expect(approveEmployeeChange(unauthActor, proposal.id)).rejects.toMatchObject({ code: "ACCESS_DENIED" });
    await expect(approveEmployeeChange(hrActor, proposal.id)).rejects.toMatchObject({ code: "ACCESS_DENIED" }); // HR is not Owner
  });

  it("Idempotency: Cannot approve already approved request", async () => {
    const hrActor = { id: hrUserId };
    const ownerActor = { id: ownerUserId };
    const emp = await createActiveEmployee();

    const proposal = await proposeEmployeeChange(hrActor, emp.id, { jobTitle: "X" }, "Y");
    await approveEmployeeChange(ownerActor, proposal.id);

    await expect(approveEmployeeChange(ownerActor, proposal.id)).rejects.toMatchObject({ code: "REQUEST_NOT_PENDING" });
  });

  it("Concurrency: Cannot propose while another proposal is PENDING", async () => {
    const hrActor = { id: hrUserId };
    const emp = await createActiveEmployee();

    await proposeEmployeeChange(hrActor, emp.id, { jobTitle: "X" }, "Y");
    
    await expect(
      proposeEmployeeChange(hrActor, emp.id, { jobTitle: "Z" }, "Z")
    ).rejects.toMatchObject({ code: "CONCURRENT_REQUEST_PENDING" });
  });

  it("Stale Requests: Master changed after proposal creation", async () => {
    const hrActor = { id: hrUserId };
    const ownerActor = { id: ownerUserId };
    const emp = await createActiveEmployee();

    const proposal = await proposeEmployeeChange(hrActor, emp.id, { jobTitle: "X" }, "Y");

    // Edit master directly
    await updateEmployee(hrActor, emp.id, { jobTitle: "Z" });

    // Try to approve stale proposal
    await expect(
      approveEmployeeChange(ownerActor, proposal.id)
    ).rejects.toMatchObject({ code: "STALE_REQUEST" });
  });
});
