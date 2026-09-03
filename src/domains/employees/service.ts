import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { employees, locations, people } from "@/db/schema";
import {
  authorizeEmployeeOperation,
} from "@/lib/authorization";
import { employeePermissions } from "@/lib/authorization-policy";

const employeeInputSchema = z.object({
  organizationId: z.string().uuid(),
  locationId: z.string().uuid(),
  employeeCode: z.string().trim().min(1).max(100),
  jobTitle: z.string().trim().max(200).nullable().optional(),
  employmentStartDate: z.string().date(),
  employmentEndDate: z.string().date().nullable().optional(),
  person: z.object({
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().max(100).nullable().optional(),
    displayName: z.string().trim().min(1).max(200),
    phone: z.string().trim().max(50).nullable().optional(),
    email: z.string().email().max(320).nullable().optional(),
    dateOfBirth: z.string().date().nullable().optional(),
  }),
});

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
      | "DUPLICATE_EMPLOYEE_CODE",
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

      await tx.insert(employees).values({
        personId: personRows[0].id,
        organizationId: parsed.data.organizationId,
        locationId: parsed.data.locationId,
        employeeCode: parsed.data.employeeCode,
        jobTitle: parsed.data.jobTitle ?? null,
        employmentStartDate: parsed.data.employmentStartDate,
        employmentEndDate: parsed.data.employmentEndDate ?? null,
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
