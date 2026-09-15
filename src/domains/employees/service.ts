import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { employees, locations, people, organizations } from "@/db/schema";
import { auth } from "@/lib/auth";
import {
  authorizeEmployeeOperation,
} from "@/lib/authorization";
import { employeePermissions } from "@/lib/authorization-policy";

const employeeInputSchema = z.object({
  organizationId: z.string().uuid(),
  locationId: z.string().uuid(),
  jobTitle: z.string().trim().max(200).nullable().optional(),
  employmentStartDate: z.string().date(),
  employmentEndDate: z.string().date().nullable().optional(),
  status: z.enum(["DRAFT", "ONBOARDING", "ACTIVE", "INACTIVE"]).optional(),
  aadhaarDocumentUrl: z.string().trim().nullable().optional(),
  photoUrl: z.string().trim().nullable().optional(),
  applicationFormUrl: z.string().trim().nullable().optional(),
  otherDocumentsUrl: z.string().trim().nullable().optional(),
  biometricId: z.string().trim().min(1),
  posId: z.string().trim().nullable().optional(),
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
    isActive: z.boolean().optional(),
    employmentEndDate: z.string().date().nullable().optional(),
    status: z.enum(["DRAFT", "ONBOARDING", "ACTIVE", "INACTIVE"]).optional(),
    aadhaarDocumentUrl: z.string().trim().nullable().optional(),
    photoUrl: z.string().trim().nullable().optional(),
    applicationFormUrl: z.string().trim().nullable().optional(),
    otherDocumentsUrl: z.string().trim().nullable().optional(),
    biometricId: z.string().trim().min(1).optional(),
    posId: z.string().trim().nullable().optional(),
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
      | "INVALID_LIFECYCLE_TRANSITION",
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
      isActive: employees.isActive,
      person: {
        id: people.id,
        firstName: people.firstName,
        lastName: people.lastName,
        displayName: people.displayName,
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

      const orgRows = await tx.select({ code: organizations.code }).from(organizations).where(eq(organizations.id, parsed.data.organizationId));
      let prefix = orgRows[0]?.code || "EMP";
      
      const codeRows = await tx.select({ employeeCode: employees.employeeCode }).from(employees).where(eq(employees.organizationId, parsed.data.organizationId));
      let maxNum = 0;
      for (const row of codeRows) {
        const match = row.employeeCode.match(/\d+$/);
        if (match) {
          const num = parseInt(match[0], 10);
          if (num > maxNum) maxNum = num;
        }
      }
      const generatedCode = `${prefix}${(maxNum + 1).toString().padStart(4, "0")}`;

      await tx.insert(employees).values({
        personId: personRows[0].id,
        organizationId: parsed.data.organizationId,
        locationId: parsed.data.locationId,
        employeeCode: generatedCode,
        jobTitle: parsed.data.jobTitle ?? null,
        employmentStartDate: parsed.data.employmentStartDate,
        employmentEndDate: parsed.data.employmentEndDate ?? null,
        status: parsed.data.status ?? "DRAFT",
        userId: createdUserId,
        aadhaarDocumentUrl: parsed.data.aadhaarDocumentUrl ?? null,
        photoUrl: parsed.data.photoUrl ?? null,
        applicationFormUrl: parsed.data.applicationFormUrl ?? null,
        otherDocumentsUrl: parsed.data.otherDocumentsUrl ?? null,
        biometricId: parsed.data.biometricId,
        posId: parsed.data.posId ?? null,
      });

      return selectEmployee(tx, (await tx
        .select({ id: employees.id })
        .from(employees)
        .where(
          and(
            eq(employees.personId, personRows[0].id),
            eq(employees.organizationId, parsed.data.organizationId),
          ),
        ))[0].id);
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

  if (parsed.data.isActive === true && !current.isActive) {
    throw new EmployeeServiceError(
      "Inactive employees cannot be reactivated without lifecycle history",
      "INVALID_LIFECYCLE_TRANSITION",
    );
  }
  
  const nextStatus = parsed.data.status ?? current.status;
  const nextAadhaar = parsed.data.aadhaarDocumentUrl !== undefined ? parsed.data.aadhaarDocumentUrl : current.aadhaarDocumentUrl;
  const nextPhoto = parsed.data.photoUrl !== undefined ? parsed.data.photoUrl : current.photoUrl;
  const nextAppForm = parsed.data.applicationFormUrl !== undefined ? parsed.data.applicationFormUrl : current.applicationFormUrl;

  if (nextStatus === "ACTIVE" && (!nextAadhaar || !nextPhoto || !nextAppForm)) {
    throw new EmployeeServiceError(
      "Aadhaar, Photo, and Application Form are required to activate an employee.",
      "INVALID_LIFECYCLE_TRANSITION",
    );
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
  if (parsed.data.isActive === false && !parsed.data.employmentEndDate && !current.employmentEndDate) {
    throw new EmployeeServiceError(
      "Employment end date is required when deactivating an employee",
      "INVALID_INPUT",
    );
  }

  return db.transaction(async (tx) => {
    const personChanges = parsed.data.person;
    if (personChanges) {
      await tx
        .update(people)
        .set({ ...personChanges, updatedAt: new Date() })
        .where(eq(people.id, current.person.id));
    }
    const employeeChanges = {
      ...(parsed.data.jobTitle !== undefined && { jobTitle: parsed.data.jobTitle }),
      ...(parsed.data.isActive !== undefined && { isActive: parsed.data.isActive }),
      ...(parsed.data.employmentEndDate !== undefined && {
        employmentEndDate: parsed.data.employmentEndDate,
      }),
      ...(parsed.data.status !== undefined && { status: parsed.data.status }),
      ...(parsed.data.aadhaarDocumentUrl !== undefined && { aadhaarDocumentUrl: parsed.data.aadhaarDocumentUrl }),
      ...(parsed.data.photoUrl !== undefined && { photoUrl: parsed.data.photoUrl }),
      ...(parsed.data.applicationFormUrl !== undefined && { applicationFormUrl: parsed.data.applicationFormUrl }),
      ...(parsed.data.otherDocumentsUrl !== undefined && { otherDocumentsUrl: parsed.data.otherDocumentsUrl }),
      ...(parsed.data.biometricId !== undefined && { biometricId: parsed.data.biometricId }),
      ...(parsed.data.posId !== undefined && { posId: parsed.data.posId }),
      updatedAt: new Date(),
    };
    await tx
      .update(employees)
      .set(employeeChanges)
      .where(eq(employees.id, employeeId));
    return selectEmployee(tx, employeeId);
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
      isActive: employees.isActive,
      person: {
        id: people.id,
        firstName: people.firstName,
        lastName: people.lastName,
        displayName: people.displayName,
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
