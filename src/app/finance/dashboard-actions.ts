"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getFinanceDashboardMetrics } from "@/domains/finance/dashboard";

async function getAuthSession() {
  const reqHeaders = await headers();
  return await auth.api.getSession({ headers: reqHeaders });
}

export async function fetchAccountsDashboardMetrics(
  organizationId: string, 
  locationId: string,
  periodFilter?: { startDate?: string; endDate?: string }
) {
  const session = await getAuthSession();
  if (!session?.user) throw new Error("Unauthorized");
  
  try {
    const data = await getFinanceDashboardMetrics(
      session.user as any,
      organizationId,
      locationId,
      periodFilter
    );
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function fetchSubledgerReport(
  organizationId: string,
  locationId: string,
  controlAccountType: string,
  periodFilter?: { startDate?: string; endDate?: string }
) {
  const session = await getAuthSession();
  if (!session?.user) throw new Error("Unauthorized");
  
  try {
    const { getSubledgerEntries } = await import("@/domains/finance/ledger");
    const data = await getSubledgerEntries(
      { organizationId, locationId },
      periodFilter || {},
      controlAccountType
    );
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
