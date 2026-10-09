"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getCustomerBalances, getAgeingReport } from "@/domains/finance/receivables-service";

export async function fetchCustomerBalances(organizationId: string, searchQuery?: string, page: number = 1) {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });
  if (!session?.user) return { success: false, error: "Unauthorized" };

  try {
    const result = await getCustomerBalances(organizationId, searchQuery, page, 10);
    return { success: true, data: result.data, total: result.total };
  } catch (error: any) {
    console.error("fetchCustomerBalances ERROR:", error);
    return { success: false, error: error.message };
  }
}

export async function fetchAgeingReport(organizationId: string, searchQuery?: string, page: number = 1) {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });
  if (!session?.user) return { success: false, error: "Unauthorized" };

  try {
    const result = await getAgeingReport(organizationId, searchQuery, page, 10);
    return { success: true, data: result.data, total: result.total };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function processReceipt(input: {
  organizationId: string;
  locationId: string;
  customerId: string;
  amount: number;
  paymentMethod: string;
  referenceNumber?: string;
  notes?: string;
  allocations: { invoiceId: string; amountApplied: number }[];
}) {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });
  if (!session?.user) return { success: false, error: "Unauthorized" };

  try {
    const { createReceipt } = await import("@/domains/finance/receivables-service");
    const receipt = await createReceipt({ ...input, createdById: session.user.id });
    return { success: true, data: receipt };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function fetchReceipts(organizationId: string, searchQuery?: string, page: number = 1, limit: number = 10, startDate?: string, endDate?: string) {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });
  if (!session?.user) return { success: false, error: "Unauthorized" };

  try {
    const { getReceipts } = await import("@/domains/finance/receivables-service");
    // Convert strings to Dates if needed inside the service, but since service takes Date, we construct Date objects:
    const startObj = startDate ? new Date(startDate) : undefined;
    const endObj = endDate ? new Date(endDate) : undefined;
    
    const result = await getReceipts(organizationId, searchQuery, page, limit, startObj, endObj);
    return { success: true, data: result.data, total: result.total };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function submitSalesInvoice(input: any) {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });
  if (!session?.user) return { success: false, error: "Unauthorized" };

  try {
    const { createSalesInvoice } = await import("@/domains/finance/receivables-service");
    const invoice = await createSalesInvoice({ ...input, createdById: session.user.id });
    return { success: true, data: invoice };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function submitCreditNote(input: any) {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });
  if (!session?.user) return { success: false, error: "Unauthorized" };

  try {
    const { createCreditNote } = await import("@/domains/finance/receivables-service");
    const cn = await createCreditNote({ ...input, createdById: session.user.id });
    return { success: true, data: cn };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function fetchOpenInvoices(customerId: string) {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });
  if (!session?.user) return { success: false, error: "Unauthorized" };

  try {
    const { getOpenInvoicesForCustomer } = await import("@/domains/finance/receivables-service");
    const data = await getOpenInvoicesForCustomer(customerId);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function fetchReceivablesSummary(organizationId: string) {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });
  if (!session?.user) return { success: false, error: "Unauthorized" };

  try {
    const { getReceivablesSummary } = await import("@/domains/finance/receivables-service");
    const data = await getReceivablesSummary(organizationId);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
