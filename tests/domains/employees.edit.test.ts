import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/db";
import {
  organizations, locations, authUsers, systemAuthorities, employees, employeeSalaryInfo,
  people, employeeFamilyContacts, organizationMemberships, locationMemberships, roles, rolePermissions, permissions, locationRoleAssignments
} from "@/db/schema";
import { 
  createEmployee, updateEmployee, transitionEmployeeLifecycle,
  setEmployeeSalaryInfo
} from "@/domains/employees/service";
import { randomUUID } from "crypto";
import { eq, inArray } from "drizzle-orm";

describe("Employee Edit Regression Tests", () => {
  let orgId: string;
  let locId: string;
  let ownerUserId: string;

  beforeAll(async () => {
    orgId = randomUUID();
    locId = randomUUID();
    ownerUserId = `owner-${randomUUID()}`;

    const codeSuffix = orgId.split('-')[0];
    await db.insert(organizations).values([{ id: orgId, name: "Edit Test Org", code: `EDIT-${codeSuffix}`, gstNumber: `GST${codeSuffix}` }]);
    await db.insert(locations).values([
      { id: locId, organizationId: orgId, name: "Branch Edit", code: `BE-${codeSuffix}` },
    ]);

    await db.insert(authUsers).values([
      { id: ownerUserId, name: "Owner", email: `owner-${randomUUID()}@test.com`, createdAt: new Date(), updatedAt: new Date() },
    ]);

    await db.insert(organizationMemberships).values([
      { userId: ownerUserId, organizationId: orgId },
    ]);
    await db.insert(locationMemberships).values([
      { userId: ownerUserId, organizationId: orgId, locationId: locId },
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

  const setupBasicEmployee = async (name: string, contacts: any[], salary: any = null) => {
    const actor = { id: ownerUserId };
    const emp = await createEmployee(actor, {
      organizationId: orgId,
      locationId: locId,
      jobTitle: "Worker",
      employmentStartDate: "2026-09-01",
      biometricId: `BIO-${randomUUID()}`,
      category: "Permanent",
      familyContacts: contacts,
      person: { firstName: name, displayName: name, phone: `99${Math.floor(Math.random() * 10000000).toString().padStart(8, "0")}`, dateOfBirth: "1990-01-01" }
    });

    if (salary) {
      await setEmployeeSalaryInfo(actor, emp.id, salary);
    }
    
    return emp.id;
  };

  it("1. Edit employee with zero emergency contacts", async () => {
    const empId = await setupBasicEmployee("Zero Contact", []);
    // Update basic info without adding contact (should succeed on service level)
    const result = await updateEmployee({ id: ownerUserId }, empId, {
      person: { firstName: "Zero Updated" }
    });
    expect(result.person.firstName).toBe("Zero Updated");
  });

  it("2. Edit employee with one emergency contact", async () => {
    const empId = await setupBasicEmployee("One Contact", [
      { category: "EMERGENCY_CONTACT", name: "E1", relationship: "R1", mobile: "9876543210" }
    ]);
    const result = await updateEmployee({ id: ownerUserId }, empId, {
      person: { firstName: "One Updated" },
      familyContacts: [
        { category: "EMERGENCY_CONTACT", name: "E1_MOD", relationship: "R1", mobile: "9876543210" }
      ]
    });
    expect(result.person.firstName).toBe("One Updated");
    const contacts = await db.select().from(employeeFamilyContacts).where(eq(employeeFamilyContacts.employeeId, empId));
    expect(contacts.find(c => c.category === "EMERGENCY_CONTACT")?.name).toBe("E1_MOD");
  });

  it("4. Edit basic profile without changing salary", async () => {
    const empId = await setupBasicEmployee("No Salary Change", [], { salaryType: "Monthly", amount: "500", paymentMethod: "CASH" });
    const result = await updateEmployee({ id: ownerUserId }, empId, {
      person: { firstName: "No Salary Change Updated" }
    });
    expect(result.person.firstName).toBe("No Salary Change Updated");
    
    // verify salary still exists
    const salary = await db.select().from(employeeSalaryInfo).where(eq(employeeSalaryInfo.employeeId, empId));
    expect(salary[0].amount).toBe("500");
  });

  it("5. Edit employee with BANK_TRANSFER salary", async () => {
    const empId = await setupBasicEmployee("Bank", [], { 
      salaryType: "Monthly", amount: "1000", paymentMethod: "BANK_TRANSFER",
      accountHolderName: "Me", accountNumber: "123", bankName: "SBI", ifscCode: "SBIN"
    });
    
    await updateEmployee({ id: ownerUserId }, empId, {
      salary: {
        salaryType: "Monthly", amount: "1500", paymentMethod: "BANK_TRANSFER",
        accountHolderName: "Me2", accountNumber: "1234", bankName: "SBI2", ifscCode: "SBIN2"
      }
    });

    const salary = await db.select().from(employeeSalaryInfo).where(eq(employeeSalaryInfo.employeeId, empId));
    expect(salary[0].amount).toBe("1500");
    expect(salary[0].accountHolderName).toBe("Me2");
    expect(salary[0].bankName).toBe("SBI2");
  });

  it("6. Edit employee with GPAY salary", async () => {
    const empId = await setupBasicEmployee("Gpay", [], { 
      salaryType: "Monthly", amount: "1000", paymentMethod: "GPAY",
      gpayNumber: "9876543210", bankingName: "Me"
    });
    
    await updateEmployee({ id: ownerUserId }, empId, {
      salary: {
        salaryType: "Monthly", amount: "1200", paymentMethod: "GPAY",
        gpayNumber: "9876543211", bankingName: "Me2"
      }
    });

    const salary = await db.select().from(employeeSalaryInfo).where(eq(employeeSalaryInfo.employeeId, empId));
    expect(salary[0].amount).toBe("1200");
    expect(salary[0].gpayNumber).toBe("9876543211");
  });

  it("7. BANK_TRANSFER with missing bank fields correctly rejected", async () => {
    const empId = await setupBasicEmployee("Bank Fail", [], null);
    await expect(
      updateEmployee({ id: ownerUserId }, empId, {
        salary: {
          salaryType: "Monthly", amount: "1000", paymentMethod: "BANK_TRANSFER",
          // missing accountHolderName, accountNumber, bankName, ifscCode
        } as any
      })
    ).rejects.toThrow("Invalid employee input");
  });

  it("8. GPAY with missing GPay fields correctly rejected", async () => {
    const empId = await setupBasicEmployee("Gpay Fail", [], null);
    await expect(
      updateEmployee({ id: ownerUserId }, empId, {
        salary: {
          salaryType: "Monthly", amount: "1000", paymentMethod: "GPAY",
          // missing gpayNumber, bankingName
        } as any
      })
    ).rejects.toThrow("Invalid employee input");
  });

  it("9. CASH correctly accepted without bank/GPay fields", async () => {
    const empId = await setupBasicEmployee("Cash", [], null);
    await updateEmployee({ id: ownerUserId }, empId, {
      salary: {
        salaryType: "Monthly", amount: "1000", paymentMethod: "CASH"
      }
    });
    const salary = await db.select().from(employeeSalaryInfo).where(eq(employeeSalaryInfo.employeeId, empId));
    expect(salary[0].paymentMethod).toBe("CASH");
    expect(salary[0].amount).toBe("1000");
  });

  it("10. Change BANK_TRANSFER -> GPAY", async () => {
    const empId = await setupBasicEmployee("Switch Bank to Gpay", [], {
      salaryType: "Monthly", amount: "1000", paymentMethod: "BANK_TRANSFER",
      accountHolderName: "Me", accountNumber: "123", bankName: "SBI", ifscCode: "SBIN"
    });

    await updateEmployee({ id: ownerUserId }, empId, {
      salary: {
        salaryType: "Monthly", amount: "1200", paymentMethod: "GPAY",
        gpayNumber: "9876543210", bankingName: "GpayMe"
      }
    });

    const salary = await db.select().from(employeeSalaryInfo).where(eq(employeeSalaryInfo.employeeId, empId));
    expect(salary[0].paymentMethod).toBe("GPAY");
    expect(salary[0].gpayNumber).toBe("9876543210");
    expect(salary[0].bankingName).toBe("GpayMe");
    // Verify bank fields are cleared/ignored
    expect(salary[0].accountNumber).toBeNull();
  });

  it("11. Change GPAY -> BANK_TRANSFER", async () => {
    const empId = await setupBasicEmployee("Switch Gpay to Bank", [], {
      salaryType: "Monthly", amount: "1000", paymentMethod: "GPAY",
      gpayNumber: "9876543210", bankingName: "GpayMe"
    });

    await updateEmployee({ id: ownerUserId }, empId, {
      salary: {
        salaryType: "Monthly", amount: "1200", paymentMethod: "BANK_TRANSFER",
        accountHolderName: "Me", accountNumber: "123", bankName: "SBI", ifscCode: "SBIN"
      }
    });

    const salary = await db.select().from(employeeSalaryInfo).where(eq(employeeSalaryInfo.employeeId, empId));
    expect(salary[0].paymentMethod).toBe("BANK_TRANSFER");
    expect(salary[0].accountNumber).toBe("123");
    // Verify gpay fields are cleared
    expect(salary[0].gpayNumber).toBeNull();
  });

});
