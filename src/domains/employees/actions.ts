"use server";

import { db } from "@/db";
import { authUsers, employees, locationMemberships, organizationMemberships, authAccounts, people } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { requireAuthenticatedUser } from "@/lib/authorization";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function provisionEmployeeAccess(employeeId: string) {
  const reqHeaders = await headers();
  const user = await requireAuthenticatedUser({ headers: reqHeaders } as any);
  if (!user) throw new Error("Unauthorized");

  // Get employee
  const [employeeResult] = await db
    .select()
    .from(employees)
    .leftJoin(people, eq(people.id, employees.personId))
    .where(eq(employees.id, employeeId));

  if (!employeeResult || !employeeResult.employees || !employeeResult.people) {
    throw new Error("Employee not found");
  }

  const employee = {
    ...employeeResult.employees,
    person: employeeResult.people
  };
  if (employee.userId) throw new Error("Employee already has access provisioned");
  if (!employee.person.phone) throw new Error("Employee must have a phone number to provision access");

  const email = employee.person.email || `${employee.person.phone}@kalki.internal`;
  
  // Check if email is already used
  const [existingUser] = await db
    .select()
    .from(authUsers)
    .where(eq(authUsers.email, email));
  if (existingUser) {
    throw new Error(`The email address (${email}) is already in use by another provisioned user. Please use a unique email or remove it to use the phone number automatically.`);
  }

  // Generate a random initial password or a simple one if not specified.
  // In a real system, you'd send an email/SMS. We'll use a strong default.
  const password = "Password@123!"; // Default fallback for existing employees

  // 1. Create auth user securely using server-side API (no headers passed to prevent session overwrite)
  const authRes = await auth.api.signUpEmail({
    body: {
      email,
      password,
      name: employee.person.displayName,
      image: employee.photoUrl ?? undefined,
    }
  });

  const createdUserId = authRes.user.id;

  try {
    await db.transaction(async (tx) => {
      // 2. Link to employee
      await tx.update(employees)
        .set({ userId: createdUserId })
        .where(eq(employees.id, employeeId));

      // 4. Grant basic memberships
      await tx.insert(organizationMemberships).values({
        userId: createdUserId,
        organizationId: employee.organizationId,
      });

      await tx.insert(locationMemberships).values({
        userId: createdUserId,
        organizationId: employee.organizationId,
        locationId: employee.locationId,
      });
    });

    return { success: true };
  } catch (error) {
    console.error("Transaction failed to provision access:", error);
    if (createdUserId) {
      try {
        await db.delete(authUsers).where(eq(authUsers.id, createdUserId));
        console.log(`Compensating transaction: Deleted zombie auth user ${createdUserId}`);
      } catch (cleanupError) {
        console.error("Failed to clean up zombie auth user:", cleanupError);
      }
    }
    throw new Error("Failed to provision access in database. Rolled back.");
  }
}
