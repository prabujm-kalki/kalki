import { db } from "@/db";
import { organizationMemberships } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getOrganizationForUser(userId: string): Promise<string | null> {
  const memberships = await db.select().from(organizationMemberships).where(eq(organizationMemberships.userId, userId));
  if (memberships.length > 0) {
    return memberships[0].organizationId;
  }
  return null;
}
