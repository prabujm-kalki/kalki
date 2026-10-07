"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getVendorBalances } from "@/domains/finance/payables-service";

export async function fetchVendorBalances(organizationId: string) {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });
  if (!session?.user) return { success: false, error: "Unauthorized" };

  try {
    const data = await getVendorBalances(organizationId);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function processVendorPayment(input: {
  organizationId: string;
  locationId: string;
  vendorId: string;
  amount: number;
  paymentMethod: string;
  referenceNumber?: string;
  notes?: string;
  allocations: { billId: string; amountApplied: number }[];
}) {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });
  if (!session?.user) return { success: false, error: "Unauthorized" };

  try {
    const { createVendorPayment } = await import("@/domains/finance/payables-service");
    const payment = await createVendorPayment({ ...input, createdById: session.user.id });
    return { success: true, data: payment };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function fetchPayments(organizationId: string) {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });
  if (!session?.user) return { success: false, error: "Unauthorized" };

  try {
    const { getPayments } = await import("@/domains/finance/payables-service");
    const data = await getPayments(organizationId);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function submitPurchaseBill(input: any) {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });
  if (!session?.user) return { success: false, error: "Unauthorized" };

  try {
    const { createPurchaseBill } = await import("@/domains/finance/payables-service");
    const bill = await createPurchaseBill({ ...input, createdById: session.user.id });
    return { success: true, data: bill };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
