import { and, eq, inArray, isNull, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { 
  employees, locations, people, organizations,
  employeeFamilyContacts, employeeSalaryInfo,
  employeeHistoryStatus, employeeHistoryRole, employeeHistoryBranch,
  employeeHistorySalary, employeeHistoryReporting, employeeHistoryCategory
} from "@/db/schema";
import { auth } from "@/lib/auth";
import { authorizeEmployeeOperation } from "@/lib/authorization";
import { employeePermissions } from "@/lib/authorization-policy";
import { recordAuditEvent } from "@/domains/audit/service";

const employeeInputSchema = z.object({
  organizationId: z.string().uuid(),
  locationId: z.string().uuid(),
  jobTitle: z.string().trim().max(200).nullable().optional(),
  employmentStartDate: z.string().date(),
  employmentEndDate: z.string().date().nullable().optional(),
  aadhaarDocumentUrl: z.string().trim().nullable().optional(),
  photoUrl: z.string().trim().nullable().optional(),
  applicationFormUrl: z.string().trim().nullable().optional(),
  otherDocumentsUrl: z.string().trim().nullable().optional(),
  biometricId: z.string().trim().min(1),
  posId: z.string().trim().nullable().optional(),
  reportingEmployeeId: z.string().uuid().nullable().optional(),
  category: z.enum(["Permanent", "Temporary", "Part-time"]).optional(),
  provisionAccess: z.object({
    email: z.string().email(),
    password: z.string().min(8),
  }).optional(),
  person: z.object({
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().max(100).nullable().optional(),
    displayName: z.string().trim().min(1).max(200),
    phone: z.string().trim().max(50).nullable().optional(),
    email: z.string().email().max(320).nullable().optional(),
    dateOfBirth: z.string().date().nullable().optional(),
  }),
});

const employeeUpdateSchema = z
  .object({
    jobTitle: z.string().trim().max(200).nullable().optional(),
    employmentEndDate: z.string().date().nullable().optional(),
    aadhaarDocumentUrl: z.string().trim().nullable().optional(),
    photoUrl: z.string().trim().nullable().optional(),
    applicationFormUrl: z.string().trim().nullable().optional(),
    otherDocumentsUrl: z.string().trim().nullable().optional(),
    biometricId: z.string().trim().min(1).optional(),
    posId: z.string().trim().nullable().optional(),
    reportingEmployeeId: z.string().uuid().nullable().optional(),
    category: z.enum(["Permanent", "Temporary", "Part-time"]).optional(),
    gender: z.enum(["Male", "Female", "Other"]).optional(),
    maritalStatus: z.enum(["Single", "Married", "Divorced", "Widowed"]).optional(),
    residentialAddress: z.string().nullable().optional(),
    bloodGroup: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]).optional(),
    person: z
      .object({
        firstName: z.string().trim().min(1).max(100).optional(),
        lastName: z.string().trim().max(100).nullable().optional(),
        displayName: z.string().trim().min(1).max(200).optional(),
        phone: z.string().trim().max(50).nullable().optional(),
        email: z.string().email().max(320).nullable().optional(),
        dateOfBirth: z.string().date().nullable().optional(),
      })
      .optional(),
  })
  .strict();

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
      | "CROSS_ORG_REFERENCE",
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
      applicationFormUrl: employees.applicationFormUrl,
      otherDocumentsUrl: employees.otherDocumentsUrl,
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

  let createdUserId: string | null = null;
  if (parsed.data.provisionAccess) {
    const authRes = await auth.api.signUpEmail({
      headers: new Headers(),
      body: {
        email: parsed.data.provisionAccess.email,
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
        applicationFormUrl: parsed.data.applicationFormUrl ?? null,
        otherDocumentsUrl: parsed.data.otherDocumentsUrl ?? null,
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
  return employee;
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
      ...(parsed.data.applicationFormUrl !== undefined && { applicationFormUrl: parsed.data.applicationFormUrl }),
      ...(parsed.data.otherDocumentsUrl !== undefined && { otherDocumentsUrl: parsed.data.otherDocumentsUrl }),
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
      applicationFormUrl: employees.applicationFormUrl,
      otherDocumentsUrl: employees.otherDocumentsUrl,
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
