"use server";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getPrimarySalesSource(organizationId: string) {
  try {
    const org = await db.select({ source: organizations.primarySalesSource }).from(organizations).where(eq(organizations.id, organizationId)).limit(1);
    return { success: true, source: org[0]?.source || 'Hybrid' };
  } catch (error: any) {
    console.error("Fetch source error:", error);
    return { success: false, source: 'Hybrid' };
  }
}

export async function updatePrimarySalesSource(organizationId: string, source: string) {
  try {
    await db.update(organizations).set({ primarySalesSource: source }).where(eq(organizations.id, organizationId));
    return { success: true };
  } catch (error: any) {
    console.error("Update source error:", error);
    return { success: false };
  }
}

export async function testTMBillConnection(config: { apiUrl: string; username: string; password?: string }) {
  try {
    const res = await fetch(`${config.apiUrl}/store/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        username: config.username, 
        password: config.password 
      })
    });
    
    if (!res.ok) {
      return { success: false, message: `HTTP Error: ${res.status} ${res.statusText}` };
    }

    const data = await res.json();
    if (data.access_token) {
      return { success: true, message: "Connection successful." };
    } else {
      return { success: false, message: data.message || "Failed to authenticate with TMBill." };
    }
  } catch (error: any) {
    return { success: false, message: error.message || "Network error. Please check the API URL." };
  }
}
