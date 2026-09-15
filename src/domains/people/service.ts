import { db } from "@/db";
import { people, employees, authUsers, organizationMemberships, locationMemberships } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function createPerson(data: {
  firstName: string;
  lastName?: string;
  displayName: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
}) {
  const [person] = await db.insert(people).values(data).returning();
  return person;
}

export async function createEmployee(data: {
  personId: string;
  organizationId: string;
  locationId: string;
  employeeCode: string;
  jobTitle?: string;
  employmentStartDate: string;
  departmentId?: string;
}) {
  const [employee] = await db.insert(employees).values(data).returning();
  return employee;
}

export async function provisionUserAccess(
  employeeId: string,
  email: string,
  password: string,
  name: string
) {
  // 1. Fetch employee to get org and location
  const [employee] = await db
    .select()
    .from(employees)
    .where(eq(employees.id, employeeId))
    .limit(1);

  if (!employee) {
    throw new Error("Employee not found");
  }

  // 2. Create user via Better Auth
  const signupResult = await auth.api.signUpEmail({
    body: {
      email,
      password,
      name,
    },
  });

  if (!signupResult?.user?.id) {
    throw new Error(`Failed to create user via Better Auth: ${JSON.stringify(signupResult)}`);
  }

  const userId = signupResult.user.id;

  // 3. Link user to employee
  await db
    .update(employees)
    .set({ userId })
    .where(eq(employees.id, employeeId));

  // 4. Create memberships
  await db.insert(organizationMemberships).values({
    userId,
    organizationId: employee.organizationId,
    isActive: true,
  });

  await db.insert(locationMemberships).values({
    userId,
    organizationId: employee.organizationId,
    locationId: employee.locationId,
    isActive: true,
  });

  return { userId, employeeId };
}
