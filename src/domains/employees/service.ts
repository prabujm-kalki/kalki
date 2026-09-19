import { and, eq, inArray, isNull, ne, desc } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { 
  employees, locations, people, organizations,
  employeeFamilyContacts, employeeSalaryInfo,
  employeeHistoryStatus, employeeHistoryRole, employeeHistoryBranch,
  employeeHistorySalary, employeeHistoryReporting, employeeHistoryCategory
} from "@/db/schema";

import { employeeChangeRequests, organizationMemberships, locationMemberships, employeeRoleAssignments } from "@/db/schema";
import { loadAuthorizationGrants } from "@/lib/authorization";
import { auth } from "@/lib/auth";
import { authorizeEmployeeOperation } from "@/lib/authorization";
import { employeePermissions } from "@/lib/authorization-policy";
import { recordAuditEvent } from "@/domains/audit/service";

export const salaryInputSchema = z.object({
  salaryType: z.enum(["Daily", "Weekly", "Monthly"]),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  paymentMethod: z.enum(["BANK_TRANSFER", "GPAY", "CASH"]),
  accountHolderName: z.string().nullable().optional(),
  accountNumber: z.string().nullable().optional(),
  bankName: z.string().nullable().optional(),
  ifscCode: z.string().nullable().optional(),
  gpayNumber: z.string().nullable().optional(),
  bankingName: z.string().nullable().optional(),
});
export type SalaryInput = z.infer<typeof salaryInputSchema>;

export const familyContactSchema = z.object({
  category: z.enum(["EMERGENCY_CONTACT", "SPOUSE", "PARENT", "CHILD"]),
  name: z.string().optional(),
  mobile: z.string().optional(),
  relationship: z.string().optional(),
  fatherName: z.string().optional(),
  motherName: z.string().optional(),
});

const employeeInputSchema = z.object({
  organizationId: z.string().uuid(),
  locationId: z.string().uuid(),
  jobTitle: z.string().trim().max(200).nullable().optional(),
  employmentStartDate: z.string().date(),
  employmentEndDate: z.string().date().nullable().optional(),
  aadhaarDocumentUrl: z.string().trim().nullable().optional(),
  photoUrl: z.string().trim().nullable().optional(),
  otherDocument1Url: z.string().trim().nullable().optional(),
  otherDocument2Url: z.string().trim().nullable().optional(),
  otherDocument3Url: z.string().trim().nullable().optional(),
  biometricId: z.string().trim().min(1),
  posId: z.string().trim().nullable().optional(),
  reportingEmployeeId: z.string().uuid().nullable().optional(),
  category: z.enum(["Permanent", "Temporary", "Part-time"]).optional(),
  provisionAccess: z.object({
    phone: z.string().min(1),
    password: z.string().min(8),
    roleIds: z.array(z.string().uuid()).optional(),
  }).optional(),
  person: z.object({
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().max(100).nullable().optional(),
    displayName: z.string().trim().min(1).max(200),
    phone: z.string().trim().max(50).nullable().optional(),
    email: z.string().email().max(320).or(z.literal('')).nullable().optional(),
    dateOfBirth: z.string().date().nullable().optional(),
  }),
  familyContacts: z.array(familyContactSchema).optional(),
});

const employeeUpdateSchema = z
  .object({
    jobTitle: z.string().trim().max(200).nullable().optional(),
    employmentEndDate: z.string().date().nullable().optional(),
    aadhaarDocumentUrl: z.string().trim().nullable().optional(),
    photoUrl: z.string().trim().max(1024).nullable().optional(),
    otherDocument1Url: z.string().trim().max(1024).nullable().optional(),
    otherDocument2Url: z.string().trim().max(1024).nullable().optional(),
    otherDocument3Url: z.string().trim().max(1024).nullable().optional(),
    biometricId: z.string().trim().max(100).nullable().optional(),
    posId: z.string().trim().nullable().optional(),
    reportingEmployeeId: z.string().uuid().nullable().optional(),
    category: z.enum(["Permanent", "Temporary", "Part-time"]).optional(),
    gender: z.enum(["Male", "Female", "Other"]).optional(),
    maritalStatus: z.enum(["Single", "Married", "Divorced", "Widowed"]).optional(),
    residentialAddress: z.string().nullable().optional(),
    bloodGroup: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]).optional(),
    secondaryMobile: z.string().trim().max(50).nullable().optional(),
    person: z
      .object({
        firstName: z.string().trim().min(1).max(100).optional(),
        lastName: z.string().trim().max(100).nullable().optional(),
        displayName: z.string().trim().min(1).max(200).optional(),
        phone: z.string().trim().max(50).nullable().optional(),
        email: z.string().email().max(320).or(z.literal('')).nullable().optional(),
        dateOfBirth: z.string().date().nullable().optional(),
      })
      .optional(),
    familyContacts: z.array(familyContactSchema).optional(),
    salary: salaryInputSchema.optional(),
  })
  .strict();

export const proposeEmployeeChangeSchema = employeeUpdateSchema.extend({
  locationId: z.string().uuid().optional(),
  salary: salaryInputSchema.optional(),
});
export type ProposeEmployeeChangeInput = z.infer<typeof proposeEmployeeChangeSchema>;

export type CreateEmployeeInput = z.infer<typeof employeeInputSchema>;

export class EmployeeServiceError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "AUTHENTICATION_REQUIRED"
      | "ACCESS_DENIED"
      | "INVALID_INPUT"
      | "LOCATION_NOT_FOUND"
      | "EMPLOYEE_NOT_FOUND"
      | "DUPLICATE_EMPLOYEE_CODE"
      | "INVALID_LIFECYCLE_TRANSITION"
      | "CYCLE_DETECTED"
      | "CROSS_ORG_REFERENCE"
      | "CONCURRENT_REQUEST_PENDING"
      | "REQUEST_NOT_FOUND"
      | "REQUEST_NOT_PENDING"
      | "STALE_REQUEST",
  ) {
    super(message);
    this.name = "EmployeeServiceError";
  }
}

type Actor = { id: string } | null;

function requireActor(actor: Actor): asserts actor is { id: string } {
  if (!actor) {
    throw new EmployeeServiceError(
      "Authentication required",
      "AUTHENTICATION_REQUIRED",
    );
  }
}

async function requireEmployeeAccess(
  actor: { id: string },
  organizationId: string,
  locationId: string,
  permission: "employee:read" | "employee:create" | "employee:update",
) {
  const authorized = await authorizeEmployeeOperation({
    userId: actor.id,
    organizationId,
    locationId,
    permission,
  });
  if (!authorized) {
    throw new EmployeeServiceError("Employee access denied", "ACCESS_DENIED");
  }
}

export async function validateReportingAssignment(
  tx: Pick<typeof db, "select">,
  employeeId: string | null,
  reportingEmployeeId: string | null,
  organizationId: string
) {
  if (!reportingEmployeeId) return;

  if (employeeId && employeeId === reportingEmployeeId) {
    throw new EmployeeServiceError("Employee cannot report to themselves", "CYCLE_DETECTED");
  }

  const managerRows = await tx.select({ id: employees.id, organizationId: employees.organizationId, reportingEmployeeId: employees.reportingEmployeeId })
    .from(employees)
    .where(eq(employees.id, reportingEmployeeId));

  if (managerRows.length !== 1) {
    throw new EmployeeServiceError("Reporting employee not found", "INVALID_INPUT");
  }

  if (managerRows[0].organizationId !== organizationId) {
    throw new EmployeeServiceError("Cannot report to an employee in another organization", "CROSS_ORG_REFERENCE");
  }

  if (!employeeId) return; // New employee, no cycles possible yet

  // Cycle detection up to 20 levels
  let currentManagerId: string | null = managerRows[0].reportingEmployeeId;
  let depth = 0;
  
  while (currentManagerId && depth < 20) {
    if (currentManagerId === employeeId) {
      throw new EmployeeServiceError("Reporting cycle detected", "CYCLE_DETECTED");
    }
    const nextManagerRows = await tx.select({ id: employees.id, reportingEmployeeId: employees.reportingEmployeeId })
      .from(employees)
      .where(eq(employees.id, currentManagerId));
      
    if (nextManagerRows.length === 0) break;
    currentManagerId = nextManagerRows[0].reportingEmployeeId;
    depth++;
  }
}

async function selectEmployee(
  queryDb: Pick<typeof db, "select">,
  employeeId: string,
) {
  const rows = await queryDb
    .select({
      id: employees.id,
      organizationId: employees.organizationId,
      locationId: employees.locationId,
      employeeCode: employees.employeeCode,
      jobTitle: employees.jobTitle,
      employmentStartDate: employees.employmentStartDate,
      employmentEndDate: employees.employmentEndDate,
      status: employees.status,
      aadhaarDocumentUrl: employees.aadhaarDocumentUrl,
      photoUrl: employees.photoUrl,
      otherDocument1Url: employees.otherDocument1Url,
      otherDocument2Url: employees.otherDocument2Url,
      otherDocument3Url: employees.otherDocument3Url,
      biometricId: employees.biometricId,
      posId: employees.posId,
      reportingEmployeeId: employees.reportingEmployeeId,
      category: employees.category,
      gender: employees.gender,
      maritalStatus: employees.maritalStatus,
      residentialAddress: employees.residentialAddress,
      bloodGroup: employees.bloodGroup,
      person: {
        id: people.id,
        firstName: people.firstName,
        lastName: people.lastName,
        displayName: people.displayName,
        dateOfBirth: people.dateOfBirth,
        phone: people.phone,
      },
    })
    .from(employees)
    .innerJoin(people, eq(people.id, employees.personId))
    .where(eq(employees.id, employeeId));

  return rows[0] ?? null;
}

export async function createEmployee(actor: Actor, input: CreateEmployeeInput) {
  requireActor(actor);
  const parsed = employeeInputSchema.safeParse(input);
  if (!parsed.success) {
    console.dir(parsed.error, { depth: null });
    throw new EmployeeServiceError("Invalid employee input", "INVALID_INPUT");
  }
  if (
    parsed.data.employmentEndDate &&
    parsed.data.employmentEndDate < parsed.data.employmentStartDate
  ) {
    throw new EmployeeServiceError("Invalid employment dates", "INVALID_INPUT");
  }

  await requireEmployeeAccess(
    actor,
    parsed.data.organizationId,
    parsed.data.locationId,
    employeePermissions.create,
  );

  if (parsed.data.person.phone) {
    const existingPhone = await db.select({ id: people.id }).from(people).where(eq(people.phone, parsed.data.person.phone));
    if (existingPhone.length > 0) {
      throw new EmployeeServiceError("Mobile number is already registered to another employee", "INVALID_INPUT");
    }
  }

  let createdUserId: string | null = null;
  if (parsed.data.provisionAccess) {
    const authEmail = `${parsed.data.provisionAccess.phone}@kalki.internal`;
    const authRes = await auth.api.signUpEmail({
      headers: new Headers(),
      body: {
        email: authEmail,
        password: parsed.data.provisionAccess.password,
        name: parsed.data.person.displayName,
        image: parsed.data.photoUrl ?? undefined,
      }
    });
    createdUserId = authRes.user.id;
  }

  try {
    return await db.transaction(async (tx) => {
      const locationRows = await tx
        .select({ id: locations.id })
        .from(locations)
        .where(
          and(
            eq(locations.id, parsed.data.locationId),
            eq(locations.organizationId, parsed.data.organizationId),
          ),
        );
      if (locationRows.length !== 1) {
        throw new EmployeeServiceError(
          "Location not found in organization",
          "LOCATION_NOT_FOUND",
        );
      }

      await validateReportingAssignment(tx, null, parsed.data.reportingEmployeeId ?? null, parsed.data.organizationId);

      const personRows = await tx
        .insert(people)
        .values({
          firstName: parsed.data.person.firstName,
          lastName: parsed.data.person.lastName ?? null,
          displayName: parsed.data.person.displayName,
          phone: parsed.data.person.phone ?? null,
          email: parsed.data.person.email ?? null,
          dateOfBirth: parsed.data.person.dateOfBirth ?? null,
        })
        .returning({ id: people.id });

      const orgRows = await tx.select({ code: organizations.code })
        .from(organizations)
        .where(eq(organizations.id, parsed.data.organizationId))
        .for("update");
      const fullPrefix = "KAL-EMP-";
      
      const codeRows = await tx.select({ employeeCode: employees.employeeCode }).from(employees).where(eq(employees.organizationId, parsed.data.organizationId));
      let maxNum = 0;
      for (const row of codeRows) {
        const match = row.employeeCode.match(/\d+$/);
        if (match) {
          const num = parseInt(match[0], 10);
          if (num > maxNum) maxNum = num;
        }
      }
      const generatedCode = `${fullPrefix}${(maxNum + 1).toString().padStart(4, "0")}`;

      const [newEmployee] = await tx.insert(employees).values({
        personId: personRows[0].id,
        organizationId: parsed.data.organizationId,
        locationId: parsed.data.locationId,
        employeeCode: generatedCode,
        jobTitle: parsed.data.jobTitle ?? null,
        employmentStartDate: parsed.data.employmentStartDate,
        employmentEndDate: parsed.data.employmentEndDate ?? null,
        status: "DRAFT", // strictly default to DRAFT per Phase 2
        category: parsed.data.category ?? null,
        reportingEmployeeId: parsed.data.reportingEmployeeId ?? null,
        userId: createdUserId,
        aadhaarDocumentUrl: parsed.data.aadhaarDocumentUrl ?? null,
        photoUrl: parsed.data.photoUrl ?? null,
        biometricId: parsed.data.biometricId,
        posId: parsed.data.posId ?? null,
      }).returning({ id: employees.id });

      await recordAuditEvent({
        organizationId: parsed.data.organizationId,
        locationId: parsed.data.locationId,
        actorUserId: actor.id,
        eventType: "EMPLOYEE_CREATED",
        action: "CREATE",
        entityType: "employee",
        entityId: newEmployee.id,
        metadata: { status: "DRAFT" }
      }, tx);

      if (parsed.data.familyContacts && parsed.data.familyContacts.length > 0) {
        const familyContactValues = parsed.data.familyContacts.map(contact => ({
          organizationId: parsed.data.organizationId,
          employeeId: newEmployee.id,
          category: contact.category,
          name: contact.name ?? null,
          mobile: contact.mobile ?? null,
          relationship: contact.relationship ?? null,
          fatherName: contact.fatherName ?? null,
          motherName: contact.motherName ?? null,
        }));
        await tx.insert(employeeFamilyContacts).values(familyContactValues);
      }

      if (parsed.data.provisionAccess && createdUserId) {
        await tx.insert(organizationMemberships).values({
          userId: createdUserId,
          organizationId: parsed.data.organizationId,
        });

        await tx.insert(locationMemberships).values({
          userId: createdUserId,
          organizationId: parsed.data.organizationId,
          locationId: parsed.data.locationId,
        });

        const roleIds = parsed.data.provisionAccess.roleIds || [];
        for (const roleId of roleIds) {
          await tx.insert(employeeRoleAssignments).values({
            organizationId: parsed.data.organizationId,
            employeeId: newEmployee.id,
            roleId: roleId,
          });
        }
      }

      return selectEmployee(tx, newEmployee.id);
    });
  } catch (error) {
    if (error instanceof EmployeeServiceError) throw error;
    const databaseError = error as {
      code?: string;
      cause?: { code?: string };
    };
    if (databaseError.code === "23505" || databaseError.cause?.code === "23505") {
      throw new EmployeeServiceError(
        "Employee code already exists in organization",
        "DUPLICATE_EMPLOYEE_CODE",
      );
    }
    throw error;
  }
}

export async function getEmployee(actor: Actor, employeeId: string) {
  requireActor(actor);
  if (!z.string().uuid().safeParse(employeeId).success) {
    throw new EmployeeServiceError("Invalid employee id", "INVALID_INPUT");
  }
  const employee = await selectEmployee(db, employeeId);
  if (!employee) {
    throw new EmployeeServiceError("Employee not found", "EMPLOYEE_NOT_FOUND");
  }

  try {
    await requireEmployeeAccess(
      actor,
      employee.organizationId,
      employee.locationId,
      employeePermissions.read,
    );
  } catch (error) {
    if (error instanceof EmployeeServiceError && error.code === "ACCESS_DENIED") {
      throw new EmployeeServiceError("Employee not found", "EMPLOYEE_NOT_FOUND");
    }
    throw error;
  }

  const familyContacts = await db.select().from(employeeFamilyContacts).where(eq(employeeFamilyContacts.employeeId, employee.id));
  const salaryInfoRows = await db.select().from(employeeSalaryInfo).where(eq(employeeSalaryInfo.employeeId, employee.id));
  
  const statusHistory = await db.select().from(employeeHistoryStatus).where(eq(employeeHistoryStatus.employeeId, employee.id)).orderBy(employeeHistoryStatus.effectiveFrom);
  const branchHistory = await db.select().from(employeeHistoryBranch).where(eq(employeeHistoryBranch.employeeId, employee.id)).orderBy(employeeHistoryBranch.effectiveFrom);
  const roleHistory = await db.select().from(employeeHistoryRole).where(eq(employeeHistoryRole.employeeId, employee.id)).orderBy(employeeHistoryRole.effectiveFrom);
  const salaryHistory = await db.select().from(employeeHistorySalary).where(eq(employeeHistorySalary.employeeId, employee.id)).orderBy(employeeHistorySalary.effectiveFrom);
  const reportingHistory = await db.select().from(employeeHistoryReporting).where(eq(employeeHistoryReporting.employeeId, employee.id)).orderBy(employeeHistoryReporting.effectiveFrom);
  const categoryHistory = await db.select().from(employeeHistoryCategory).where(eq(employeeHistoryCategory.employeeId, employee.id)).orderBy(employeeHistoryCategory.effectiveFrom);

  return {
    ...employee,
    familyContacts,
    salaryInfo: salaryInfoRows[0] ?? null,
    history: {
      status: statusHistory,
      branch: branchHistory,
      role: roleHistory,
      salary: salaryHistory,
      reporting: reportingHistory,
      category: categoryHistory,
    }
  };
}

export type UpdateEmployeeInput = z.infer<typeof employeeUpdateSchema>;

export async function updateEmployee(
  actor: Actor,
  employeeId: string,
  input: UpdateEmployeeInput,
) {
  requireActor(actor);
  if (!z.string().uuid().safeParse(employeeId).success) {
    throw new EmployeeServiceError("Invalid employee id", "INVALID_INPUT");
  }
  const parsed = employeeUpdateSchema.safeParse(input);
  if (!parsed.success) {
    throw new EmployeeServiceError("Invalid employee input", "INVALID_INPUT");
  }
  if (Object.keys(parsed.data).length === 0) {
    throw new EmployeeServiceError("No employee changes supplied", "INVALID_INPUT");
  }

  const current = await selectEmployee(db, employeeId);
  if (!current) {
    throw new EmployeeServiceError("Employee not found", "EMPLOYEE_NOT_FOUND");
  }
  try {
    await requireEmployeeAccess(
      actor,
      current.organizationId,
      current.locationId,
      employeePermissions.update,
    );
  } catch (error) {
    if (error instanceof EmployeeServiceError && error.code === "ACCESS_DENIED") {
      throw new EmployeeServiceError("Employee not found", "EMPLOYEE_NOT_FOUND");
    }
    throw error;
  }

  if (
    parsed.data.employmentEndDate !== undefined &&
    parsed.data.employmentEndDate !== current.employmentEndDate
  ) {
    if (current.employmentEndDate !== null) {
      throw new EmployeeServiceError(
        "Employment end date cannot be changed after separation",
        "INVALID_LIFECYCLE_TRANSITION",
      );
    }
    if (parsed.data.employmentEndDate && parsed.data.employmentEndDate < current.employmentStartDate) {
      throw new EmployeeServiceError("Invalid employment dates", "INVALID_INPUT");
    }
  }

  return db.transaction(async (tx) => {
    const actorEmployeeRows = await tx.select({ id: employees.id }).from(employees).where(eq(employees.userId, actor.id));
    const recordedByEmployeeId = actorEmployeeRows[0]?.id ?? null;

    if (parsed.data.reportingEmployeeId !== undefined && parsed.data.reportingEmployeeId !== current.reportingEmployeeId) {
      await validateReportingAssignment(tx, current.id, parsed.data.reportingEmployeeId, current.organizationId);
    }

    const personChanges = parsed.data.person;
    if (personChanges?.phone && personChanges.phone !== current.person.phone) {
      const existingPhone = await tx.select({ id: people.id }).from(people).where(eq(people.phone, personChanges.phone));
      if (existingPhone.length > 0) {
        throw new EmployeeServiceError("Mobile number is already registered to another employee", "INVALID_INPUT");
      }
    }
    if (personChanges) {
      await tx
        .update(people)
        .set({ ...personChanges, updatedAt: new Date() })
        .where(eq(people.id, current.person.id));
    }
    const employeeChanges = {
      ...(parsed.data.jobTitle !== undefined && { jobTitle: parsed.data.jobTitle }),
      ...(parsed.data.employmentEndDate !== undefined && { employmentEndDate: parsed.data.employmentEndDate }),
      ...(parsed.data.aadhaarDocumentUrl !== undefined && { aadhaarDocumentUrl: parsed.data.aadhaarDocumentUrl }),
      ...(parsed.data.photoUrl !== undefined && { photoUrl: parsed.data.photoUrl }),
      ...(parsed.data.biometricId !== undefined && { biometricId: parsed.data.biometricId }),
      ...(parsed.data.posId !== undefined && { posId: parsed.data.posId }),
      ...(parsed.data.reportingEmployeeId !== undefined && { reportingEmployeeId: parsed.data.reportingEmployeeId }),
      ...(parsed.data.category !== undefined && { category: parsed.data.category }),
      ...(parsed.data.gender !== undefined && { gender: parsed.data.gender }),
      ...(parsed.data.maritalStatus !== undefined && { maritalStatus: parsed.data.maritalStatus }),
      ...(parsed.data.residentialAddress !== undefined && { residentialAddress: parsed.data.residentialAddress }),
      ...(parsed.data.bloodGroup !== undefined && { bloodGroup: parsed.data.bloodGroup }),
      updatedAt: new Date(),
    };
    
    // We only call update if there are keys in employeeChanges besides updatedAt
    if (Object.keys(employeeChanges).length > 1) {
      await tx
        .update(employees)
        .set(employeeChanges)
        .where(eq(employees.id, employeeId));
    }

    if (parsed.data.familyContacts !== undefined) {
      await tx.delete(employeeFamilyContacts).where(eq(employeeFamilyContacts.employeeId, employeeId));
      if (parsed.data.familyContacts.length > 0) {
        const familyContactValues = parsed.data.familyContacts.map(contact => ({
          organizationId: current.organizationId,
          employeeId: employeeId,
          category: contact.category,
          name: contact.name ?? null,
          mobile: contact.mobile ?? null,
          relationship: contact.relationship ?? null,
          fatherName: contact.fatherName ?? null,
          motherName: contact.motherName ?? null,
        }));
        await tx.insert(employeeFamilyContacts).values(familyContactValues);
      }
    }

    if (parsed.data.salary !== undefined) {
      const now = new Date();
      await tx.delete(employeeSalaryInfo).where(eq(employeeSalaryInfo.employeeId, employeeId));
      await tx.insert(employeeSalaryInfo).values({
        organizationId: current.organizationId,
        employeeId: employeeId,
        salaryType: parsed.data.salary.salaryType,
        amount: parsed.data.salary.amount,
        effectiveFrom: now.toISOString().split('T')[0],
        paymentMethod: parsed.data.salary.paymentMethod,
        accountHolderName: parsed.data.salary.accountHolderName ?? null,
        accountNumber: parsed.data.salary.accountNumber ?? null,
        bankName: parsed.data.salary.bankName ?? null,
        ifscCode: parsed.data.salary.ifscCode ?? null,
        gpayNumber: parsed.data.salary.gpayNumber ?? null,
        bankingName: parsed.data.salary.bankingName ?? null,
      });

      if (current.status !== "DRAFT") {
        await tx.insert(employeeHistorySalary).values({
          organizationId: current.organizationId,
          employeeId: employeeId,
          salaryType: parsed.data.salary.salaryType,
          amount: parsed.data.salary.amount,
          effectiveFrom: now,
          recordedBy: recordedByEmployeeId
        });
      }
    }

    if (parsed.data.reportingEmployeeId !== undefined && parsed.data.reportingEmployeeId !== current.reportingEmployeeId) {
      await tx.insert(employeeHistoryReporting).values({
        organizationId: current.organizationId,
        employeeId: current.id,
        reportingEmployeeId: parsed.data.reportingEmployeeId,
        effectiveFrom: new Date(),
        recordedBy: recordedByEmployeeId,
      });
      await recordAuditEvent({
        organizationId: current.organizationId,
        locationId: current.locationId,
        actorUserId: actor.id,
        eventType: "EMPLOYEE_REPORTING_CHANGED",
        action: "UPDATE",
        entityType: "employee",
        entityId: current.id,
        metadata: { newReportingId: parsed.data.reportingEmployeeId }
      }, tx);
    }
    
    if (parsed.data.category !== undefined && parsed.data.category !== current.category) {
      await tx.insert(employeeHistoryCategory).values({
        organizationId: current.organizationId,
        employeeId: current.id,
        category: parsed.data.category,
        effectiveFrom: new Date(),
        recordedBy: recordedByEmployeeId,
      });
    }

    return selectEmployee(tx, employeeId);
  });
}

const lifecycleInputSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE", "EXITED"]),
  onboardingDeclared: z.boolean().optional(),
  separationReason: z.string().trim().min(1).optional(),
}).strict();

export type TransitionEmployeeLifecycleInput = z.infer<typeof lifecycleInputSchema>;

export async function transitionEmployeeLifecycle(
  actor: Actor,
  employeeId: string,
  input: TransitionEmployeeLifecycleInput,
) {
  requireActor(actor);
  const parsed = lifecycleInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new EmployeeServiceError("Invalid lifecycle input", "INVALID_INPUT");
  }

  const current = await selectEmployee(db, employeeId);
  if (!current) {
    throw new EmployeeServiceError("Employee not found", "EMPLOYEE_NOT_FOUND");
  }
  
  await requireEmployeeAccess(actor, current.organizationId, current.locationId, employeePermissions.update);

  const nextStatus = parsed.data.status;
  if (current.status === nextStatus) return current;

  if (current.status === "EXITED") {
    throw new EmployeeServiceError("Cannot transition from EXITED status", "INVALID_LIFECYCLE_TRANSITION");
  }

  if (current.status === "DRAFT" && nextStatus !== "ACTIVE") {
    throw new EmployeeServiceError("DRAFT employees can only transition to ACTIVE", "INVALID_LIFECYCLE_TRANSITION");
  }

  if (current.status === "INACTIVE" && nextStatus === "ACTIVE") {
    throw new EmployeeServiceError("Inactive employees cannot be reactivated without lifecycle history", "INVALID_LIFECYCLE_TRANSITION");
  }

  return db.transaction(async (tx) => {
    const now = new Date();
    const actorEmployeeRows = await tx.select({ id: employees.id }).from(employees).where(eq(employees.userId, actor.id));
    const recordedByEmployeeId = actorEmployeeRows[0]?.id ?? null;

    if (nextStatus === "ACTIVE" && current.status === "DRAFT") {
      if (!parsed.data.onboardingDeclared) {
        throw new EmployeeServiceError("Onboarding declaration required for activation", "INVALID_LIFECYCLE_TRANSITION");
      }
      
      if (!current.person.firstName || !current.person.phone || !current.person.dateOfBirth) {
        throw new EmployeeServiceError("Missing demographic data for activation", "INVALID_LIFECYCLE_TRANSITION");
      }
      
      if (!current.gender || !current.maritalStatus || !current.residentialAddress || !current.category || !current.employmentStartDate) {
        throw new EmployeeServiceError("Missing employment demographic data for activation", "INVALID_LIFECYCLE_TRANSITION");
      }

      if (!current.aadhaarDocumentUrl || !current.photoUrl) {
        throw new EmployeeServiceError("Aadhaar and Photo are required for activation", "INVALID_LIFECYCLE_TRANSITION");
      }

      const familyContacts = await tx.select().from(employeeFamilyContacts).where(eq(employeeFamilyContacts.employeeId, current.id));
      const hasEmergency = familyContacts.some(c => c.category === "EMERGENCY_CONTACT" && c.name && c.relationship && c.mobile);
      const hasParent = familyContacts.some(c => c.category === "PARENT" && c.fatherName && c.motherName);
      const hasSpouse = familyContacts.some(c => c.category === "SPOUSE" && c.name && c.mobile);

      if (!hasEmergency) throw new EmployeeServiceError("Emergency contact is required for activation", "INVALID_LIFECYCLE_TRANSITION");
      if (!hasParent) throw new EmployeeServiceError("Parents details are required for activation", "INVALID_LIFECYCLE_TRANSITION");
      if (current.maritalStatus === "Married" && !hasSpouse) {
        throw new EmployeeServiceError("Spouse details are required for married employees", "INVALID_LIFECYCLE_TRANSITION");
      }

      const salaryInfo = await tx.select().from(employeeSalaryInfo).where(eq(employeeSalaryInfo.employeeId, current.id));
      if (salaryInfo.length === 0) {
        throw new EmployeeServiceError("Salary info is required for activation", "INVALID_LIFECYCLE_TRANSITION");
      }

      await recordAuditEvent({
        organizationId: current.organizationId,
        locationId: current.locationId,
        actorUserId: actor.id,
        eventType: "EMPLOYEE_ONBOARDING_DECLARED",
        action: "DECLARE",
        entityType: "employee",
        entityId: current.id,
      }, tx);
      
      // Initialize joining history
      await tx.insert(employeeHistoryBranch).values({
        organizationId: current.organizationId, employeeId: current.id, locationId: current.locationId, effectiveFrom: now, recordedBy: recordedByEmployeeId,
      });
      if (current.category) {
        await tx.insert(employeeHistoryCategory).values({
          organizationId: current.organizationId, employeeId: current.id, category: current.category, effectiveFrom: now, recordedBy: recordedByEmployeeId,
        });
      }
      if (current.reportingEmployeeId) {
        await tx.insert(employeeHistoryReporting).values({
          organizationId: current.organizationId, employeeId: current.id, reportingEmployeeId: current.reportingEmployeeId, effectiveFrom: now, recordedBy: recordedByEmployeeId,
        });
      }
      if (salaryInfo[0]) {
        await tx.insert(employeeHistorySalary).values({
          organizationId: current.organizationId, employeeId: current.id, salaryType: salaryInfo[0].salaryType, amount: salaryInfo[0].amount.toString(), effectiveFrom: now, recordedBy: recordedByEmployeeId,
        });
      }
    }
    
    if (nextStatus === "INACTIVE" && current.status === "ACTIVE") {
      if (!parsed.data.separationReason) {
        throw new EmployeeServiceError("Separation reason is required to deactivate employee", "INVALID_LIFECYCLE_TRANSITION");
      }
    }

    await tx.update(employees)
      .set({ status: nextStatus, updatedAt: now })
      .where(eq(employees.id, current.id));

    await tx.insert(employeeHistoryStatus).values({
      organizationId: current.organizationId,
      employeeId: current.id,
      status: nextStatus,
      effectiveFrom: now,
      recordedBy: recordedByEmployeeId,
    });
    
    await recordAuditEvent({
      organizationId: current.organizationId,
      locationId: current.locationId,
      actorUserId: actor.id,
      eventType: "EMPLOYEE_STATUS_CHANGED",
      action: "UPDATE",
      entityType: "employee",
      entityId: current.id,
      metadata: { 
        oldStatus: current.status, 
        newStatus: nextStatus,
        reason: parsed.data.separationReason
      }
    }, tx);

    return selectEmployee(tx, current.id);
  });
}

export async function listEmployees(
  actor: Actor,
  organizationId: string,
  locationId: string,
) {
  requireActor(actor);
  await requireEmployeeAccess(
    actor,
    organizationId,
    locationId,
    employeePermissions.read,
  );

  return db
    .select({
      id: employees.id,
      organizationId: employees.organizationId,
      locationId: employees.locationId,
      employeeCode: employees.employeeCode,
      jobTitle: employees.jobTitle,
      employmentStartDate: employees.employmentStartDate,
      employmentEndDate: employees.employmentEndDate,
      status: employees.status,
      aadhaarDocumentUrl: employees.aadhaarDocumentUrl,
      photoUrl: employees.photoUrl,
      otherDocument1Url: employees.otherDocument1Url,
      otherDocument2Url: employees.otherDocument2Url,
      otherDocument3Url: employees.otherDocument3Url,
      biometricId: employees.biometricId,
      posId: employees.posId,
      reportingEmployeeId: employees.reportingEmployeeId,
      category: employees.category,
      gender: employees.gender,
      maritalStatus: employees.maritalStatus,
      residentialAddress: employees.residentialAddress,
      bloodGroup: employees.bloodGroup,
      person: {
        id: people.id,
        firstName: people.firstName,
        lastName: people.lastName,
        displayName: people.displayName,
        dateOfBirth: people.dateOfBirth,
        phone: people.phone,
      },
    })
    .from(employees)
    .innerJoin(people, eq(people.id, employees.personId))
    .where(
      and(
        eq(employees.organizationId, organizationId),
        eq(employees.locationId, locationId),
      ),
    );
}


export async function proposeEmployeeChange(
  actor: Actor,
  employeeId: string,
  input: ProposeEmployeeChangeInput,
  reason: string,
) {
  requireActor(actor);
  if (!z.string().uuid().safeParse(employeeId).success) {
    throw new EmployeeServiceError("Invalid employee id", "INVALID_INPUT");
  }
  const parsed = proposeEmployeeChangeSchema.safeParse(input);
  if (!parsed.success) {
    throw new EmployeeServiceError("Invalid change request input", "INVALID_INPUT");
  }
  if (Object.keys(parsed.data).length === 0) {
    throw new EmployeeServiceError("No employee changes supplied", "INVALID_INPUT");
  }
  if (!reason.trim()) {
    throw new EmployeeServiceError("Reason is required", "INVALID_INPUT");
  }

  const current = await selectEmployee(db, employeeId);
  if (!current) throw new EmployeeServiceError("Employee not found", "EMPLOYEE_NOT_FOUND");
  if (current.status !== "ACTIVE") {
    throw new EmployeeServiceError("Only active employees can have change requests", "INVALID_LIFECYCLE_TRANSITION");
  }

  await requireEmployeeAccess(
    actor,
    current.organizationId,
    current.locationId,
    employeePermissions.update,
  );

  return db.transaction(async (tx) => {
    // Prevent concurrent pending requests for the same employee
    const existing = await tx.select().from(employeeChangeRequests)
      .where(and(
        eq(employeeChangeRequests.employeeId, employeeId),
        eq(employeeChangeRequests.status, "PENDING")
      )).for("update");
    if (existing.length > 0) {
      throw new EmployeeServiceError("A change request is already pending for this employee", "CONCURRENT_REQUEST_PENDING");
    }

    const currentEmployeeRecord = await tx.select({ updatedAt: employees.updatedAt }).from(employees).where(eq(employees.id, employeeId));
    
    // Store updatedAt to prevent stale approvals
    const payload = {
      ...parsed.data,
      targetEmployeeUpdatedAt: currentEmployeeRecord[0].updatedAt.toISOString(),
    };

    const [request] = await tx.insert(employeeChangeRequests).values({
      organizationId: current.organizationId,
      employeeId: employeeId,
      proposerUserId: actor.id,
      status: "PENDING",
      proposedPayload: payload,
      reason: reason,
    }).returning();

    await recordAuditEvent({
      organizationId: current.organizationId,
      locationId: current.locationId,
      actorUserId: actor.id,
      eventType: "EMPLOYEE_CHANGE_PROPOSED",
      action: "CREATE",
      entityType: "employee_change_request",
      entityId: request.id,
      metadata: { employeeId: current.id }
    }, tx);

    return request;
  });
}


export async function rejectEmployeeChange(
  actor: Actor,
  requestId: string,
  reviewComment: string,
) {
  requireActor(actor);
  const grants = await loadAuthorizationGrants(actor.id);
  if (!grants.isOwner) {
    throw new EmployeeServiceError("Only owners can reject change requests", "ACCESS_DENIED");
  }

  if (!reviewComment.trim()) {
    throw new EmployeeServiceError("Review comment is required for rejection", "INVALID_INPUT");
  }

  return db.transaction(async (tx) => {
    const requestRows = await tx.select().from(employeeChangeRequests).where(eq(employeeChangeRequests.id, requestId)).for("update");
    if (requestRows.length === 0) throw new EmployeeServiceError("Request not found", "REQUEST_NOT_FOUND");
    
    const request = requestRows[0];
    if (request.status !== "PENDING") throw new EmployeeServiceError("Request is not pending", "REQUEST_NOT_PENDING");
    
    if (request.proposerUserId === actor.id) {
       // Cannot approve/reject your own request unless owner? wait, owner can reject their own?
       // Usually owner doesn't propose, they direct edit. So if they propose, they could reject it.
    }

    const [updated] = await tx.update(employeeChangeRequests)
      .set({ status: "REJECTED", reviewComment: reviewComment, reviewerUserId: actor.id, updatedAt: new Date() })
      .where(eq(employeeChangeRequests.id, requestId))
      .returning();

    await recordAuditEvent({
      organizationId: request.organizationId,
      locationId: null, // Global or get from employee
      actorUserId: actor.id,
      eventType: "EMPLOYEE_CHANGE_REJECTED",
      action: "UPDATE",
      entityType: "employee_change_request",
      entityId: request.id,
      metadata: { employeeId: request.employeeId }
    }, tx);

    return updated;
  });
}

export async function approveEmployeeChange(
  actor: Actor,
  requestId: string,
  reviewComment?: string,
) {
  requireActor(actor);
  const grants = await loadAuthorizationGrants(actor.id);
  if (!grants.isOwner) {
    throw new EmployeeServiceError("Only owners can approve change requests", "ACCESS_DENIED");
  }

  return db.transaction(async (tx) => {
    const requestRows = await tx.select().from(employeeChangeRequests).where(eq(employeeChangeRequests.id, requestId)).for("update");
    if (requestRows.length === 0) throw new EmployeeServiceError("Request not found", "REQUEST_NOT_FOUND");
    const request = requestRows[0];
    if (request.status !== "PENDING") throw new EmployeeServiceError("Request is not pending", "REQUEST_NOT_PENDING");

    const employeeRows = await tx.select().from(employees).where(eq(employees.id, request.employeeId)).for("update");
    if (employeeRows.length === 0) throw new EmployeeServiceError("Employee not found", "EMPLOYEE_NOT_FOUND");
    const emp = employeeRows[0];

    const payload = request.proposedPayload as any;
    if (payload.targetEmployeeUpdatedAt && new Date(payload.targetEmployeeUpdatedAt).getTime() !== emp.updatedAt.getTime()) {
      throw new EmployeeServiceError("The employee record has been modified since this request was created", "STALE_REQUEST");
    }

    const actorEmployeeRows = await tx.select({ id: employees.id }).from(employees).where(eq(employees.userId, actor.id));
    const recordedByEmployeeId = actorEmployeeRows[0]?.id ?? null;
    const now = new Date();

    const employeeChanges: any = { updatedAt: now };
    const personChanges: any = { updatedAt: now };
    let hasPersonChanges = false;
    let hasEmployeeChanges = false;

    if (payload.person) {
      if (payload.person.firstName !== undefined) personChanges.firstName = payload.person.firstName;
      if (payload.person.lastName !== undefined) personChanges.lastName = payload.person.lastName;
      if (payload.person.displayName !== undefined) personChanges.displayName = payload.person.displayName;
      if (payload.person.phone !== undefined) personChanges.phone = payload.person.phone;
      if (payload.person.email !== undefined) personChanges.email = payload.person.email;
      if (payload.person.dateOfBirth !== undefined) personChanges.dateOfBirth = payload.person.dateOfBirth;
      hasPersonChanges = Object.keys(personChanges).length > 1;
    }

    if (payload.jobTitle !== undefined) { employeeChanges.jobTitle = payload.jobTitle; hasEmployeeChanges = true; }
    if (payload.category !== undefined) { employeeChanges.category = payload.category; hasEmployeeChanges = true; }
    if (payload.locationId !== undefined) { employeeChanges.locationId = payload.locationId; hasEmployeeChanges = true; }
    if (payload.reportingEmployeeId !== undefined) {
      await validateReportingAssignment(tx, emp.id, payload.reportingEmployeeId, emp.organizationId);
      employeeChanges.reportingEmployeeId = payload.reportingEmployeeId; 
      hasEmployeeChanges = true;
    }
    // ...other fields if needed...

    if (hasPersonChanges) {
      await tx.update(people).set(personChanges).where(eq(people.id, emp.personId));
    }
    if (hasEmployeeChanges) {
      await tx.update(employees).set(employeeChanges).where(eq(employees.id, emp.id));
    }

    // Insert histories
    if (payload.locationId !== undefined && payload.locationId !== emp.locationId) {
      await tx.insert(employeeHistoryBranch).values({
        organizationId: emp.organizationId, employeeId: emp.id, locationId: payload.locationId, effectiveFrom: now, recordedBy: recordedByEmployeeId
      });
    }
    if (payload.category !== undefined && payload.category !== emp.category) {
      await tx.insert(employeeHistoryCategory).values({
        organizationId: emp.organizationId, employeeId: emp.id, category: payload.category, effectiveFrom: now, recordedBy: recordedByEmployeeId
      });
    }
    if (payload.reportingEmployeeId !== undefined && payload.reportingEmployeeId !== emp.reportingEmployeeId) {
      await tx.insert(employeeHistoryReporting).values({
        organizationId: emp.organizationId, employeeId: emp.id, reportingEmployeeId: payload.reportingEmployeeId, effectiveFrom: now, recordedBy: recordedByEmployeeId
      });
    }

    // Salary update
    if (payload.salary) {
      await tx.update(employeeSalaryInfo).set({ isActive: false, updatedAt: now }).where(eq(employeeSalaryInfo.employeeId, emp.id));
      await tx.insert(employeeSalaryInfo).values({
        organizationId: emp.organizationId,
        employeeId: emp.id,
        salaryType: payload.salary.salaryType,
        amount: payload.salary.amount,
        effectiveFrom: now.toISOString().split('T')[0], // date string
        paymentMethod: payload.salary.paymentMethod,
        accountHolderName: payload.salary.accountHolderName ?? null,
        accountNumber: payload.salary.accountNumber ?? null,
        bankName: payload.salary.bankName ?? null,
        ifscCode: payload.salary.ifscCode ?? null,
        gpayNumber: payload.salary.gpayNumber ?? null,
        bankingName: payload.salary.bankingName ?? null,
      });
      await tx.insert(employeeHistorySalary).values({
        organizationId: emp.organizationId, employeeId: emp.id, salaryType: payload.salary.salaryType, amount: payload.salary.amount, effectiveFrom: now, recordedBy: recordedByEmployeeId
      });
    }

    const [updated] = await tx.update(employeeChangeRequests)
      .set({ status: "APPROVED", reviewComment: reviewComment ?? null, reviewerUserId: actor.id, updatedAt: now })
      .where(eq(employeeChangeRequests.id, requestId))
      .returning();

    await recordAuditEvent({
      organizationId: request.organizationId,
      locationId: emp.locationId, // Current or new
      actorUserId: actor.id,
      eventType: "EMPLOYEE_CHANGE_APPROVED",
      action: "UPDATE",
      entityType: "employee_change_request",
      entityId: request.id,
      metadata: { employeeId: request.employeeId }
    }, tx);

    return updated;
  });
}

export async function setEmployeeSalaryInfo(actor: Actor, employeeId: string, input: SalaryInput) {
  requireActor(actor);
  const parsed = salaryInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new EmployeeServiceError("Invalid salary input", "INVALID_INPUT");
  }
  
  return db.transaction(async (tx) => {
    const currentRows = await tx.select().from(employees).where(eq(employees.id, employeeId)).for("update");
    if (currentRows.length === 0) throw new EmployeeServiceError("Employee not found", "EMPLOYEE_NOT_FOUND");
    const current = currentRows[0];

    const actorEmployeeRows = await tx.select({ id: employees.id }).from(employees).where(eq(employees.userId, actor.id));
    const recordedByEmployeeId = actorEmployeeRows[0]?.id ?? null;

    if (current.status !== "DRAFT") {
      const grants = await loadAuthorizationGrants(actor.id);
      if (!grants.isOwner) {
        throw new EmployeeServiceError("Only owners can directly edit salary of active employees. Others must propose a change.", "ACCESS_DENIED");
      }
    } else {
      await requireEmployeeAccess(
        actor,
        current.organizationId,
        current.locationId,
        employeePermissions.update,
      );
    }

    const now = new Date();
    await tx.update(employeeSalaryInfo).set({ isActive: false, updatedAt: now }).where(eq(employeeSalaryInfo.employeeId, employeeId));
    
    await tx.insert(employeeSalaryInfo).values({
      organizationId: current.organizationId,
      employeeId: employeeId,
      salaryType: parsed.data.salaryType,
      amount: parsed.data.amount,
      effectiveFrom: now.toISOString().split('T')[0],
      paymentMethod: parsed.data.paymentMethod,
      accountHolderName: parsed.data.accountHolderName ?? null,
      accountNumber: parsed.data.accountNumber ?? null,
      bankName: parsed.data.bankName ?? null,
      ifscCode: parsed.data.ifscCode ?? null,
      gpayNumber: parsed.data.gpayNumber ?? null,
      bankingName: parsed.data.bankingName ?? null,
    });

    if (current.status !== "DRAFT") {
      await tx.insert(employeeHistorySalary).values({
        organizationId: current.organizationId,
        employeeId: employeeId,
        salaryType: parsed.data.salaryType,
        amount: parsed.data.amount,
        effectiveFrom: now,
        recordedBy: recordedByEmployeeId
      });
    }

    await recordAuditEvent({
      organizationId: current.organizationId,
      locationId: current.locationId,
      actorUserId: actor.id,
      eventType: "EMPLOYEE_SALARY_UPDATED",
      action: "UPDATE",
      entityType: "employee",
      entityId: employeeId,
      metadata: { status: current.status }
    }, tx);

    return true;
  });
}

export type HierarchyNode = {
  id: string;
  name: string;
  jobTitle: string | null;
  locationId: string;
  children: HierarchyNode[];
};

export async function getOrganizationHierarchy(actor: Actor, organizationId: string, targetLocationId?: string): Promise<HierarchyNode[]> {
  requireActor(actor);
  
  if (targetLocationId) {
    await requireEmployeeAccess(actor, organizationId, targetLocationId, employeePermissions.read);
  } else {
    const grants = await loadAuthorizationGrants(actor.id);
    if (!grants.isOwner) {
       if (grants.locationPermissions.length === 0 && grants.organizationPermissions.length === 0) {
          throw new EmployeeServiceError("Unauthorized", "ACCESS_DENIED");
       }
    }
  }

  const conditions = [
    eq(employees.organizationId, organizationId),
    eq(employees.status, "ACTIVE")
  ];
  
  const allEmps = await db.select({
    id: employees.id,
    locationId: employees.locationId,
    jobTitle: employees.jobTitle,
    reportingEmployeeId: employees.reportingEmployeeId,
    name: people.displayName,
  })
  .from(employees)
  .innerJoin(people, eq(people.id, employees.personId))
  .where(and(...conditions));

  const map = new Map<string, HierarchyNode>();
  const roots: HierarchyNode[] = [];

  for (const emp of allEmps) {
    map.set(emp.id, {
      id: emp.id,
      name: emp.name,
      jobTitle: emp.jobTitle,
      locationId: emp.locationId,
      children: [],
    });
  }

  for (const emp of allEmps) {
    const node = map.get(emp.id)!;
    if (emp.reportingEmployeeId && map.has(emp.reportingEmployeeId)) {
      map.get(emp.reportingEmployeeId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const grants = await loadAuthorizationGrants(actor.id);
  const allowedLocationIds = new Set(
    grants.locationPermissions
      .filter(p => p.permission === employeePermissions.read)
      .map(p => p.locationId)
  );
  
  if (!grants.isOwner && !targetLocationId) {
     const hasOrgRead = grants.organizationPermissions.some(p => p.permission === employeePermissions.read);
     if (!hasOrgRead) {
       const pruneTree = (nodes: HierarchyNode[]): HierarchyNode[] => {
         const result: HierarchyNode[] = [];
         for (const node of nodes) {
           node.children = pruneTree(node.children);
           if (allowedLocationIds.has(node.locationId) || node.children.length > 0) {
             result.push(node);
           }
         }
         return result;
       };
       return pruneTree(roots);
     }
  }

  if (targetLocationId) {
     const pruneTree = (nodes: HierarchyNode[]): HierarchyNode[] => {
       const result: HierarchyNode[] = [];
       for (const node of nodes) {
         node.children = pruneTree(node.children);
         if (node.locationId === targetLocationId || node.children.length > 0) {
           result.push(node);
         }
       }
       return result;
     };
     return pruneTree(roots);
  }

  return roots;
}

export type ContactDirectoryEntry = {
  id: string;
  name: string;
  jobTitle: string | null;
  locationId: string;
  email: string | null;
  phone: string | null;
};

export async function getContactDirectory(actor: Actor, organizationId: string): Promise<ContactDirectoryEntry[]> {
  requireActor(actor);
  const grants = await loadAuthorizationGrants(actor.id);
  
  const conditions = [
    eq(employees.organizationId, organizationId),
    eq(employees.status, "ACTIVE")
  ];

  const hasOrgRead = grants.organizationPermissions.some(p => p.permission === employeePermissions.read);
  
  if (!grants.isOwner && !hasOrgRead) {
    const allowedLocationIds = grants.locationPermissions
      .filter(p => p.permission === employeePermissions.read)
      .map(p => p.locationId);
      
    if (allowedLocationIds.length === 0) {
      return []; 
    }
    conditions.push(inArray(employees.locationId, allowedLocationIds));
  }

  const contacts = await db.select({
    id: employees.id,
    jobTitle: employees.jobTitle,
    locationId: employees.locationId,
    name: people.displayName,
    email: people.email,
    phone: people.phone,
  })
  .from(employees)
  .innerJoin(people, eq(people.id, employees.personId))
  .where(and(...conditions));

  return contacts;
}

export async function listEmployeeChangeRequests(actor: Actor, organizationId: string, employeeId?: string) {
  requireActor(actor);
  const grants = await loadAuthorizationGrants(actor.id);

  if (!employeeId && !grants.isOwner) {
    throw new EmployeeServiceError("Only owners can list all pending proposals", "ACCESS_DENIED");
  }

  const q = db.select({
    id: employeeChangeRequests.id,
    organizationId: employeeChangeRequests.organizationId,
    employeeId: employeeChangeRequests.employeeId,
    proposerUserId: employeeChangeRequests.proposerUserId,
    proposedPayload: employeeChangeRequests.proposedPayload,
    reason: employeeChangeRequests.reason,
    reviewComment: employeeChangeRequests.reviewComment,
    reviewerUserId: employeeChangeRequests.reviewerUserId,
    status: employeeChangeRequests.status,
    createdAt: employeeChangeRequests.createdAt,
    updatedAt: employeeChangeRequests.updatedAt,
    employeeDisplayName: people.displayName,
    employeeCode: employees.employeeCode,
    jobTitle: employees.jobTitle,
  })
  .from(employeeChangeRequests)
  .innerJoin(employees, eq(employees.id, employeeChangeRequests.employeeId))
  .innerJoin(people, eq(people.id, employees.personId))
  .where(
    and(
      eq(employeeChangeRequests.organizationId, organizationId),
      eq(employeeChangeRequests.status, "PENDING"),
      employeeId ? eq(employeeChangeRequests.employeeId, employeeId) : undefined
    )
  )
  .orderBy(desc(employeeChangeRequests.createdAt));
  
  return q;
}
