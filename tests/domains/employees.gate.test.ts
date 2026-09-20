import "dotenv/config";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import {
  organizations, locations, authUsers, roles, rolePermissions, permissions,
  organizationRoleAssignments, locationRoleAssignments, locationMemberships, organizationMemberships, employees, employeeSalaryInfo
} from "@/db/schema";
import { createEmployee, updateEmployee, transitionEmployeeLifecycle } from "@/domains/employees/service";
import { employeePermissions } from "@/lib/authorization-policy";
import { ensureSystemOwner } from "../helpers/system-owner";

const orgId = randomUUID();
const org2Id = randomUUID();
const locId = randomUUID();
const userId = `gate-user-${randomUUID()}`;
const actor = { id: userId };

beforeAll(async () => {
  await db.insert(organizations).values([
    { id: orgId, name: "Gate Org 1", code: `G1-${orgId.slice(0, 8)}` },
    { id: org2Id, name: "Gate Org 2", code: `G2-${org2Id.slice(0, 8)}` }
  ]);
  await db.insert(locations).values([{ id: locId, organizationId: orgId, name: "Gate Loc 1", code: "G1-L1" }]);
  await db.insert(authUsers).values({ id: userId, name: "Gate User", email: `gate${randomUUID()}@example.com`, emailVerified: true, createdAt: new Date(), updatedAt: new Date() });
  
  const roleId = randomUUID();
  await db.insert(roles).values({ id: roleId, code: `GATE-ROLE-${roleId.slice(0, 8)}`, name: "Gate Role" });
  
  // Just give all employee permissions
  const perms = await db.select().from(permissions).where(sql`code LIKE 'employee:%'`);
  const rp = perms.map(p => ({ roleId, permissionId: p.id }));
  if (rp.length > 0) await db.insert(rolePermissions).values(rp);

  await db.insert(organizationMemberships).values([{ userId, organizationId: orgId }, { userId, organizationId: org2Id }]);
  await db.insert(locationMemberships).values([{ userId, organizationId: orgId, locationId: locId }]);
  await db.insert(organizationRoleAssignments).values([{ userId, organizationId: orgId, roleId }, { userId, organizationId: org2Id, roleId }]);
  await db.insert(locationRoleAssignments).values([{ userId, organizationId: orgId, locationId: locId, roleId }]);
});

describe("Phase 2 Gate Audit Tests", () => {
  it("Concurrent Employee ID generation", async () => {
    // Generate 5 concurrent employees
    const promises = Array.from({ length: 5 }).map((_, i) => createEmployee(actor, {
      organizationId: orgId,
      locationId: locId,
      jobTitle: "Gate Tester",
      employmentStartDate: "2026-09-01",
      biometricId: `BIO-GATE-${randomUUID().slice(0, 8)}`,
      familyContacts: [{ category: "EMERGENCY_CONTACT", name: "test", mobile: "9876543210", relationship: "test" }],
        person: { firstName: `Test${i}`, lastName: "Gate", displayName: `Test Gate ${i}`, phone: `99${Math.floor(Math.random() * 10000000).toString().padStart(8, "0")}`, email: `test${randomUUID()}@invalid.com` }
    }));
    
    const emps = await Promise.all(promises);
    const codes = emps.map(e => e.employeeCode);
    
    // Check format exactly KAL-EMP-XXXX
    codes.forEach(c => expect(c).toMatch(/^KAL-EMP-\d{4,}$/));
    
    // Check uniqueness
    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size).toBe(5);
  });

  it("Indirect and deep hierarchy cycles", async () => {
    const e1 = await createEmployee(actor, { organizationId: orgId, locationId: locId, jobTitle: "T", employmentStartDate: "2026-09-01", biometricId: `BIO-${randomUUID()}`, familyContacts: [{ category: "EMERGENCY_CONTACT", name: "test", mobile: "9876543210", relationship: "test" }],
        person: { firstName: "A", lastName: "X", displayName: "A X", phone: `99${Math.floor(Math.random() * 10000000).toString().padStart(8, "0")}`, email: `test${randomUUID()}@invalid.com` } });
    const e2 = await createEmployee(actor, { organizationId: orgId, locationId: locId, jobTitle: "T", employmentStartDate: "2026-09-01", biometricId: `BIO-${randomUUID()}`, familyContacts: [{ category: "EMERGENCY_CONTACT", name: "test", mobile: "9876543210", relationship: "test" }],
        person: { firstName: "B", lastName: "X", displayName: "B X", phone: `99${Math.floor(Math.random() * 10000000).toString().padStart(8, "0")}`, email: `test${randomUUID()}@invalid.com` } });
    const e3 = await createEmployee(actor, { organizationId: orgId, locationId: locId, jobTitle: "T", employmentStartDate: "2026-09-01", biometricId: `BIO-${randomUUID()}`, familyContacts: [{ category: "EMERGENCY_CONTACT", name: "test", mobile: "9876543210", relationship: "test" }],
        person: { firstName: "C", lastName: "X", displayName: "C X", phone: `99${Math.floor(Math.random() * 10000000).toString().padStart(8, "0")}`, email: `test${randomUUID()}@invalid.com` } });
    
    await updateEmployee(actor, e2.id, { reportingEmployeeId: e1.id });
    await updateEmployee(actor, e3.id, { reportingEmployeeId: e2.id });
    
    // Indirect cycle: e1 -> e3 (since e3 -> e2 -> e1)
    await expect(updateEmployee(actor, e1.id, { reportingEmployeeId: e3.id })).rejects.toMatchObject({ code: "CYCLE_DETECTED" });
    
    // Cross-org
    const loc2Id = randomUUID();
    await db.insert(locations).values([{ id: loc2Id, organizationId: org2Id, name: "Gate Loc 2", code: "G2-L2" }]);
    // Add user permissions for loc2Id
    const roleId = (await db.select().from(roles).limit(1))[0].id;
    await db.insert(locationMemberships).values([{ userId, organizationId: org2Id, locationId: loc2Id }]);
    await db.insert(locationRoleAssignments).values([{ userId, organizationId: org2Id, locationId: loc2Id, roleId }]);

    const eCross = await createEmployee(actor, { organizationId: org2Id, locationId: loc2Id, jobTitle: "T", employmentStartDate: "2026-09-01", biometricId: `BIO-${randomUUID()}`, familyContacts: [{ category: "EMERGENCY_CONTACT", name: "test", mobile: "9876543210", relationship: "test" }],
        person: { firstName: "X", lastName: "Y", displayName: "X Y", phone: `99${Math.floor(Math.random() * 10000000).toString().padStart(8, "0")}`, email: `test${randomUUID()}@invalid.com` } });
    await expect(updateEmployee(actor, eCross.id, { reportingEmployeeId: e1.id })).rejects.toMatchObject({ code: "CROSS_ORG_REFERENCE" });
  });

  it("Payment method validation via DB constraint", async () => {
    const e = await createEmployee(actor, { organizationId: orgId, locationId: locId, jobTitle: "T", employmentStartDate: "2026-09-01", biometricId: `BIO-${randomUUID()}`, familyContacts: [{ category: "EMERGENCY_CONTACT", name: "test", mobile: "9876543210", relationship: "test" }],
        person: { firstName: "P", lastName: "Y", displayName: "P Y", phone: `99${Math.floor(Math.random() * 10000000).toString().padStart(8, "0")}`, email: `test${randomUUID()}@invalid.com` } });
    
    // Should fail check constraint for BANK_TRANSFER without fields
    await expect(
      db.insert(employeeSalaryInfo).values({ organizationId: orgId, employeeId: e.id, salaryType: 'Monthly', paymentMethod: 'BANK_TRANSFER', amount: '1000', effectiveFrom: new Date(), recordedBy: actor.id })
    ).rejects.toThrow();

    // GPAY without fields
    await expect(
      db.insert(employeeSalaryInfo).values({ organizationId: orgId, employeeId: e.id, salaryType: 'Monthly', paymentMethod: 'GPAY', amount: '1000', effectiveFrom: new Date(), recordedBy: actor.id })
    ).rejects.toThrow();

    // Valid CASH
    await db.insert(employeeSalaryInfo).values({ organizationId: orgId, employeeId: e.id, salaryType: 'Monthly', paymentMethod: 'CASH', amount: '1000', effectiveFrom: new Date(), recordedBy: actor.id });
  });
});
