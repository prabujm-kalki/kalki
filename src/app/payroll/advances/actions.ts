"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getSessionContext } from "@/domains/session/service";
import { getAdvanceRequests, requestAdvance, processAdvanceRequest, CreateAdvanceRequestPayload } from "@/domains/payroll/advances/requests";
import { getAdvanceTypes } from "@/domains/payroll/advances/service";
import { db } from "@/db";
import { employees, people, employeeAdvanceRequests, advanceTypeDefinitions } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function fetchAdvancesDashboardData(clientOrgId?: string) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");
    
    const context = await getSessionContext(session.user);
    const orgId = clientOrgId || context.scopes?.[0]?.organizationId;
    if (!orgId) throw new Error("No active organization found");

    const requests = await getAdvanceRequests(orgId);
    const types = await getAdvanceTypes(orgId);
    
    const activeEmployees = await db
      .select({
        id: employees.id,
        employeeCode: employees.employeeCode,
        displayName: people.displayName,
      })
      .from(employees)
      .innerJoin(people, eq(employees.personId, people.id))
      .where(eq(employees.status, "ACTIVE"));

    return { 
      success: true, 
      data: { requests, types: types.filter(t => t.isActive), employees: activeEmployees } 
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function fetchAdvancesDataForEmployee(employeeId: string) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");
    
    // Auth check: Is the user an owner or is it their own employee profile?
    const context = await getSessionContext(session.user);
    
    // Get the employee's actual organization ID to ensure we fetch the correct advance types
    const empRows = await db
      .select({ organizationId: employees.organizationId })
      .from(employees)
      .where(eq(employees.id, employeeId))
      .limit(1);
      
    if (!empRows.length) throw new Error("Employee not found");
    const orgId = empRows[0].organizationId;

    const types = await getAdvanceTypes(orgId);
    console.log("[DEBUG fetchMyAdvancesData] orgId:", orgId, "employeeId:", employeeId, "types found:", types.length);
    
    // Fetch only this employee's requests
    const requests = await db
      .select({
        id: employeeAdvanceRequests.id,
        requestedAmount: employeeAdvanceRequests.requestedAmount,
        approvedAmount: employeeAdvanceRequests.approvedAmount,
        repaymentMonths: employeeAdvanceRequests.repaymentMonths,
        status: employeeAdvanceRequests.status,
        createdAt: employeeAdvanceRequests.createdAt,
        advanceTypeName: advanceTypeDefinitions.name,
      })
      .from(employeeAdvanceRequests)
      .innerJoin(advanceTypeDefinitions, eq(employeeAdvanceRequests.advanceTypeId, advanceTypeDefinitions.id))
      .where(and(
        eq(employeeAdvanceRequests.organizationId, orgId),
        eq(employeeAdvanceRequests.employeeId, employeeId)
      ))
      .orderBy(desc(employeeAdvanceRequests.createdAt));

    const serializedTypes = types.map(t => ({
      id: t.id,
      name: t.name,
      code: t.code,
      maxCapPercentage: t.maxCapPercentage,
    }));

    const serializedRequests = requests.map(r => ({
      id: r.id,
      requestedAmount: r.requestedAmount,
      approvedAmount: r.approvedAmount,
      repaymentMonths: r.repaymentMonths,
      status: r.status,
      createdAt: r.createdAt ? r.createdAt.toISOString() : null,
      advanceTypeName: r.advanceTypeName,
    }));

    return { 
      success: true, 
      data: { requests: serializedRequests, types: serializedTypes } 
    };
  } catch (err: any) {
    console.error("[DEBUG fetchMyAdvancesData ERROR]", err);
    return { success: false, error: err.message };
  }
}

export async function submitAdvanceRequestAction(payload: Omit<CreateAdvanceRequestPayload, "organizationId">) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");
    
    const context = await getSessionContext(session.user);
    
    // Get the employee's actual organization ID to ensure we create the request in the right context
    const empRows = await db
      .select({ organizationId: employees.organizationId, locationId: employees.locationId })
      .from(employees)
      .where(eq(employees.id, payload.employeeId))
      .limit(1);
      
    if (!empRows.length) throw new Error("Employee not found");
    const orgId = empRows[0].organizationId;
    const locId = empRows[0].locationId;

    const created = await requestAdvance({
      ...payload,
      organizationId: orgId,
      locationId: locId || undefined,
    });
    return { success: true, data: created };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function approveOrRejectAdvanceAction(requestId: string, status: "APPROVED" | "REJECTED", approvedAmount?: number, repaymentMonths?: number) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");

    const context = await getSessionContext(session.user);
    
    // Fetch request info to verify reporting manager status
    const reqInfo = await db
      .select({ reportingEmployeeId: employees.reportingEmployeeId })
      .from(employeeAdvanceRequests)
      .innerJoin(employees, eq(employeeAdvanceRequests.employeeId, employees.id))
      .where(eq(employeeAdvanceRequests.id, requestId))
      .limit(1);

    if (!reqInfo.length) throw new Error("Request not found");

    const empRecords = await db.select({ id: employees.id }).from(employees).where(eq(employees.userId, session.user.id)).limit(1);
    const currentEmpId = empRecords.length > 0 ? empRecords[0].id : null;

    if (!context.isOwner) {
      const perms = context.scopes?.[0]?.permissions || [];
      const hasPayrollPerms = perms.includes("payroll:manage") || perms.includes("payroll:write");
      const isReportingManager = currentEmpId && reqInfo[0].reportingEmployeeId === currentEmpId;
      
      if (!hasPayrollPerms && !isReportingManager) {
        throw new Error("Unauthorized: Management or reporting manager access required.");
      }
    }

    const updated = await processAdvanceRequest(requestId, status, approvedAmount, repaymentMonths);
    return { success: true, data: updated };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
