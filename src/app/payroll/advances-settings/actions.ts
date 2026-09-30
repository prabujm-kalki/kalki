"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { 
  createAdvanceType, 
  getAdvanceTypes, 
  updateAdvanceType, 
  deleteAdvanceType, 
  AdvanceTypePayload 
} from "@/domains/payroll/advances/service";
import { getSessionContext } from "@/domains/session/service";

export async function fetchAdvanceTypesAction(clientOrgId?: string) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");
    
    const context = await getSessionContext(session.user);
    const orgId = clientOrgId || context.scopes?.[0]?.organizationId;
    if (!orgId) throw new Error("No active organization found");

    const types = await getAdvanceTypes(orgId);
    return { success: true, data: types };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createAdvanceTypeAction(payload: Omit<AdvanceTypePayload, "organizationId">, clientOrgId?: string) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");
    
    const context = await getSessionContext(session.user);
    const orgId = clientOrgId || context.scopes?.[0]?.organizationId;
    const locId = context.scopes?.[0]?.locationId;
    if (!orgId) throw new Error("No active organization found");

    if (!context.isOwner) {
      const perms = context.scopes?.[0]?.permissions || [];
      if (!perms.includes("payroll:manage") && !perms.includes("payroll:write")) {
        throw new Error("Unauthorized: Management access required.");
      }
    }

    const created = await createAdvanceType({
      ...payload,
      organizationId: orgId,
      locationId: locId || undefined,
    });
    return { success: true, data: created };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateAdvanceTypeAction(id: string, payload: Partial<AdvanceTypePayload>) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");

    const context = await getSessionContext(session.user);
    if (!context.isOwner) {
      const perms = context.scopes?.[0]?.permissions || [];
      if (!perms.includes("payroll:manage") && !perms.includes("payroll:write")) {
        throw new Error("Unauthorized: Management access required.");
      }
    }

    const updated = await updateAdvanceType(id, payload);
    return { success: true, data: updated };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteAdvanceTypeAction(id: string) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");

    const context = await getSessionContext(session.user);
    if (!context.isOwner) {
      const perms = context.scopes?.[0]?.permissions || [];
      if (!perms.includes("payroll:manage") && !perms.includes("payroll:write")) {
        throw new Error("Unauthorized: Management access required.");
      }
    }

    await deleteAdvanceType(id);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
