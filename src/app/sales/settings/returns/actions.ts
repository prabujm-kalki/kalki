"use server";

import { db } from "@/db";
import { organizations } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function updateReturnPolicies(orgId: string, returnPolicies: any) {
  if (!orgId) return { success: false, error: "Missing Organization ID" };
  
  try {
    await db.update(organizations)
      .set({ returnPolicies })
      .where(eq(organizations.id, orgId));
      
    return { success: true };
  } catch (error) {
    console.error("Failed to update return policies:", error);
    return { success: false, error: "Database error" };
  }
}

export async function getReturnPolicies(orgId: string) {
  if (!orgId) return null;
  const org = await db.select({ returnPolicies: organizations.returnPolicies }).from(organizations).where(eq(organizations.id, orgId));
  if (org.length > 0 && org[0].returnPolicies) {
    return org[0].returnPolicies;
  }
  return null;
}
