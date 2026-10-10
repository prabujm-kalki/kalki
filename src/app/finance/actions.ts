"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getChartOfAccounts, createAccount, getAccountingMappings, createAccountingMapping } from "@/domains/accounts/service";
import { processManualJournalEntry } from "@/domains/finance/event-engine";
import { ManualJournalPayload } from "@/domains/finance/types";
import { db } from "@/db";
import { locations } from "@/db/schema";
import { eq } from "drizzle-orm";

async function getAuthSession() {
  const reqHeaders = await headers();
  return await auth.api.getSession({ headers: reqHeaders });
}

export async function fetchLocations(organizationId: string) {
  const session = await getAuthSession();
  if (!session?.user) throw new Error("Unauthorized");
  try {
    const data = await db.select().from(locations).where(eq(locations.organizationId, organizationId));
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function fetchChartOfAccounts(organizationId: string) {
  const session = await getAuthSession();
  if (!session?.user) throw new Error("Unauthorized");
  
  try {
    const data = await getChartOfAccounts(organizationId);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createNewAccount(input: {
  organizationId: string;
  accountGroupId: string;
  name: string;
  code: string;
  description?: string;
}) {
  const session = await getAuthSession();
  if (!session?.user) throw new Error("Unauthorized");
  
  try {
    const account = await createAccount({ ...input, isSystemAccount: false });
    return { success: true, data: account };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function fetchAccountingMappings(organizationId: string) {
  const session = await getAuthSession();
  if (!session?.user) throw new Error("Unauthorized");
  
  try {
    const data = await getAccountingMappings(organizationId);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function saveAccountingMapping(input: {
  organizationId: string;
  sourceModule: string;
  mappingType: string;
  sourceReferenceId: string;
  accountId: string;
}) {
  const session = await getAuthSession();
  if (!session?.user) throw new Error("Unauthorized");
  
  try {
    const mapping = await createAccountingMapping(input);
    return { success: true, data: mapping };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function postManualJournal(input: Omit<ManualJournalPayload, "triggeredByUserId">) {
  const session = await getAuthSession();
  if (!session?.user) throw new Error("Unauthorized");
  
  try {
    const payload: ManualJournalPayload = {
      ...input,
      triggeredByUserId: session.user.id,
    };
    const entryId = await processManualJournalEntry(payload);
    return { success: true, data: entryId };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}



export async function createNewAccountGroup(input: {
  organizationId: string;
  accountTypeId: string;
  name: string;
  code: string;
}) {
  const session = await getAuthSession();
  if (!session?.user) throw new Error("Unauthorized");
  
  try {
    const { createAccountGroup } = await import("@/domains/accounts/service");
    const group = await createAccountGroup(input);
    return { success: true, data: group };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function editAccount(input: {
  id: string;
  organizationId: string;
  accountGroupId: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
}) {
  const session = await getAuthSession();
  if (!session?.user) throw new Error("Unauthorized");
  
  try {
    const { updateAccount } = await import("@/domains/accounts/service");
    const account = await updateAccount(input);
    return { success: true, data: account };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function editAccountGroup(input: {
  id: string;
  organizationId: string;
  name: string;
  code: string;
}) {
  const session = await getAuthSession();
  if (!session?.user) throw new Error("Unauthorized");
  
  try {
    const { updateAccountGroup } = await import("@/domains/accounts/service");
    const group = await updateAccountGroup(input);
    return { success: true, data: group };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
