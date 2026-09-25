"use server";

import { db } from "@/db";
import { employees, rawBiometricPunches, biometricImportBatches, people } from "@/db/schema";
import { and, eq, inArray, gte, lte } from "drizzle-orm";
import { BiometricPunchBatchSchema, BiometricPunchBatch } from "./validations";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function getKioskEmployees(organizationId: string, locationId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) throw new Error("Unauthorized");

  const { getSessionContext } = await import("@/domains/session/service");
  const context = await getSessionContext(session.user);
  const scope = context.scopes.find(s => s.organizationId === organizationId && s.locationId === locationId);
  
  if (!scope) throw new Error("Forbidden: Invalid location scope");
  if (!context.isOwner && !scope.permissions.includes("attendance.selfie_punch:execute") && !scope.permissions.includes("people.employees:read")) {
    throw new Error("Forbidden: Missing kiosk execution permissions");
  }

  const data = await db.select({
    id: employees.id,
    employeeCode: employees.employeeCode,
    firstName: people.firstName,
    lastName: people.lastName,
    displayName: people.displayName,
    photoUrl: employees.photoUrl,
  })
  .from(employees)
  .innerJoin(people, eq(people.id, employees.personId))
  .where(and(eq(employees.organizationId, organizationId), eq(employees.locationId, locationId)));

  return data.map((row) => ({
    id: row.id,
    employeeCode: row.employeeCode,
    person: {
      firstName: row.firstName,
      lastName: row.lastName,
      displayName: row.displayName,
      photoUrl: row.photoUrl,
    }
  }));
}

export async function processBiometricUpload(
  rawData: unknown,
  organizationId: string,
  locationId: string,
  fileName: string
) {
  try {
    // 1. Session Verification (Tenant Security & RBAC)
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      throw new Error("Unauthorized");
    }

    // Strict RBAC: Check Kalki BOS context for upload authorization
    const { getSessionContext } = await import("@/domains/session/service");
    const context = await getSessionContext(session.user);

    // Validate the requested tenant scope exists in the user's authorized scopes
    const scope = context.scopes.find(s => s.organizationId === organizationId && s.locationId === locationId);
    if (!scope) {
      throw new Error("Forbidden: Invalid or unauthorized location scope.");
    }

    if (!context.isOwner) {
      const hasAttendanceAccess = scope.permissions.some(p => p.startsWith("attendance.") || p.startsWith("attendance:"));
      if (!hasAttendanceAccess) {
        throw new Error("Forbidden: Only System Owners and authorized Managers can upload attendance logs.");
      }
    }

    // 2. Strict Zod Validation
    const parsedBatch = BiometricPunchBatchSchema.parse(rawData);
    if (parsedBatch.length === 0) {
      throw new Error("Empty batch provided.");
    }

    // 3. Employee Mapping (Tenant Isolated)
    const uniqueBiometricIds = Array.from(new Set(parsedBatch.map((p) => p.biometricId)));
    const matchedEmployees = await db
      .select({
        id: employees.id,
        biometricId: employees.biometricId,
      })
      .from(employees)
      .where(
        and(
          eq(employees.organizationId, organizationId),
          eq(employees.locationId, locationId),
          inArray(employees.biometricId, uniqueBiometricIds)
        )
      );

    const employeeMap = new Map(matchedEmployees.map((e) => [e.biometricId, e.id]));

    // 4. Deduplication
    const minDate = new Date(Math.min(...parsedBatch.map((p) => p.punchTimestamp.getTime())));
    const maxDate = new Date(Math.max(...parsedBatch.map((p) => p.punchTimestamp.getTime())));

    const existingPunches = await db
      .select({
        biometricId: rawBiometricPunches.biometricId,
        punchTimestamp: rawBiometricPunches.punchTimestamp,
        machineId: rawBiometricPunches.machineId,
      })
      .from(rawBiometricPunches)
      .where(
        and(
          eq(rawBiometricPunches.organizationId, organizationId),
          eq(rawBiometricPunches.locationId, locationId),
          gte(rawBiometricPunches.punchTimestamp, minDate),
          lte(rawBiometricPunches.punchTimestamp, maxDate)
        )
      );

    const existingHashSet = new Set(
      existingPunches.map(
        (p) => `${p.biometricId}_${p.punchTimestamp.getTime()}_${p.machineId}`
      )
    );

    const newPunchesToInsert: any[] = [];
    const errors: { record: any; reason: string }[] = [];
    let successfulRows = 0;
    let failedRows = 0;

    for (const record of parsedBatch) {
      const hash = `${record.biometricId}_${record.punchTimestamp.getTime()}_${record.machineId}`;
      
      // Deduplicate
      if (existingHashSet.has(hash)) {
        failedRows++;
        errors.push({ record, reason: "Duplicate punch record." });
        continue;
      }

      const empId = employeeMap.get(record.biometricId) || null;
      if (!empId) {
        // Quarantine (null employeeId)
        errors.push({ record, reason: "Unmapped biometricId. Pushed to quarantine." });
      }

      newPunchesToInsert.push({
        organizationId,
        locationId,
        biometricId: record.biometricId,
        employeeId: empId,
        punchTimestamp: record.punchTimestamp,
        machineId: record.machineId,
        punchType: record.punchType,
        sourceType: "EXCEL_IMPORT",
      });
      
      successfulRows++;
      existingHashSet.add(hash); // prevent duplicates within the same batch
    }

    // 5. Database Transaction for Batch
    await db.transaction(async (tx) => {
      // Create Batch Record
      const [batchRecord] = await tx
        .insert(biometricImportBatches)
        .values({
          organizationId,
          locationId,
          uploadedBy: session.user.id,
          fileName,
          totalRows: parsedBatch.length,
          successfulRows,
          failedRows,
          errors: errors.length > 0 ? JSON.stringify(errors) : null,
        })
        .returning({ id: biometricImportBatches.id });

      // Insert Punches
      if (newPunchesToInsert.length > 0) {
        const insertsWithBatch = newPunchesToInsert.map((p) => ({
          ...p,
          importBatchId: batchRecord.id,
        }));
        await tx.insert(rawBiometricPunches).values(insertsWithBatch);
      }
    });

    return {
      success: true,
      message: `Successfully imported ${successfulRows} records. ${failedRows} duplicates skipped.`,
      stats: { total: parsedBatch.length, successfulRows, failedRows, errors: errors.length },
    };
  } catch (error) {
    console.error("Biometric upload failed:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: "Validation failed for one or more rows.", details: error.flatten() };
    }
    return { success: false, error: error instanceof Error ? error.message : "Unknown error occurred" };
  }
}

export async function getLeaveConfigs(organizationId: string, locationId: string) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) throw new Error("Unauthorized");
    
    // In actual implementation, we might import leaveTypes from schema
    const { leaveTypes } = await import("@/db/schema");
    const { eq, and, or, isNull } = await import("drizzle-orm");

    const records = await db
      .select()
      .from(leaveTypes)
      .where(
        and(
          eq(leaveTypes.organizationId, organizationId),
          or(
            eq(leaveTypes.locationId, locationId),
            isNull(leaveTypes.locationId)
          )
        )
      );
    return records;
  } catch (error) {
    console.error("Failed to fetch leave configs:", error);
    return [];
  }
}

export async function upsertLeaveConfig(
  rawData: unknown,
  organizationId: string,
  locationId: string
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) throw new Error("Unauthorized");

    // Retrieve full Kalki BOS authorization context
    const { getSessionContext } = await import("@/domains/session/service");
    const context = await getSessionContext(session.user);

    // Validate the requested tenant scope exists in the user's authorized scopes
    const scope = context.scopes.find(s => s.organizationId === organizationId && s.locationId === locationId);
    if (!scope) {
      throw new Error("Forbidden: Invalid or unauthorized location scope.");
    }

    if (!context.isOwner) {
      const hasAttendanceAccess = scope.permissions.some(p => p.startsWith("attendance.") || p.startsWith("attendance:"));
      if (!hasAttendanceAccess) {
        throw new Error("Forbidden: Only System Owners and authorized Managers can configure leave rules.");
      }
    }

    const { LeaveConfigSchema } = await import("./validations");
    const data = LeaveConfigSchema.parse(rawData);

    const { leaveTypes, leaveRolePolicies } = await import("@/db/schema");
    let leaveTypeId = data.id;

    await db.transaction(async (tx) => {
      if (leaveTypeId) {
        // Update existing
        await tx
          .update(leaveTypes)
          .set({
            code: data.code,
            name: data.name,
            isPaid: data.isPaid,
            annualAllocation: data.annualAllocation,
            accrualFrequency: data.accrualFrequency,
            accrualRate: data.accrualRate || null,
            carryForwardExpiryMonths: data.carryForwardExpiryMonths || null,
            minTenureDays: data.minTenureDays,
            minNoticeDays: data.minNoticeDays,
            maxConsecutiveDays: data.maxConsecutiveDays || null,
            isEncashable: data.isEncashable,
            encashmentMinTenureDays: data.encashmentMinTenureDays,
            encashmentMinBalanceRetained: data.encashmentMinBalanceRetained,
            encashmentOnlyAtYearEnd: data.encashmentOnlyAtYearEnd,
            restrictedUsageDays: data.restrictedUsageDays,
            allowedApplicationWindow: data.allowedApplicationWindow,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(leaveTypes.id, leaveTypeId),
              eq(leaveTypes.organizationId, organizationId),
              eq(leaveTypes.locationId, locationId)
            )
          );
      } else {
        // Insert new
        const [inserted] = await tx.insert(leaveTypes).values({
          organizationId,
          locationId,
          code: data.code,
          name: data.name,
          isPaid: data.isPaid,
          annualAllocation: data.annualAllocation,
          accrualFrequency: data.accrualFrequency,
          accrualRate: data.accrualRate || null,
          carryForwardExpiryMonths: data.carryForwardExpiryMonths || null,
          minTenureDays: data.minTenureDays,
          minNoticeDays: data.minNoticeDays,
          maxConsecutiveDays: data.maxConsecutiveDays || null,
          isEncashable: data.isEncashable,
          encashmentMinTenureDays: data.encashmentMinTenureDays,
          encashmentMinBalanceRetained: data.encashmentMinBalanceRetained,
          encashmentOnlyAtYearEnd: data.encashmentOnlyAtYearEnd,
          restrictedUsageDays: data.restrictedUsageDays,
          allowedApplicationWindow: data.allowedApplicationWindow,
        }).returning({ id: leaveTypes.id });
        leaveTypeId = inserted.id;
      }

      if (leaveTypeId) {
        await tx.delete(leaveRolePolicies).where(eq(leaveRolePolicies.leaveTypeId, leaveTypeId));

        if (data.rolePolicies && data.rolePolicies.length > 0) {
          await tx.insert(leaveRolePolicies).values(
            data.rolePolicies.map((policy) => ({
              leaveTypeId: leaveTypeId!,
              businessRoleId: policy.businessRoleId,
              customAccrualRate: policy.customAccrualRate || null,
              maxConcurrentLeaves: policy.maxConcurrentLeaves || null,
            }))
          );
        }

        const { leaveDepartmentPolicies } = await import("@/db/schema");
        await tx.delete(leaveDepartmentPolicies).where(eq(leaveDepartmentPolicies.leaveTypeId, leaveTypeId));

        if (data.departmentPolicies && data.departmentPolicies.length > 0) {
          await tx.insert(leaveDepartmentPolicies).values(
            data.departmentPolicies.map((policy) => ({
              leaveTypeId: leaveTypeId!,
              departmentId: policy.departmentId,
              maxConcurrentLeaves: policy.maxConcurrentLeaves || null,
            }))
          );
        }
      }
    });

    const { syncLeaveBalancesForOrganization } = await import("./accrualEngine");
    await db.transaction(async (tx) => {
      await syncLeaveBalancesForOrganization(tx, organizationId, locationId);
    });

    return { success: true };
  } catch (error) {
    console.error("Leave config upsert failed:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function submitLeaveRequest(
  rawData: unknown,
  organizationId: string,
  locationId: string
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) throw new Error("Unauthorized");

    const { LeaveRequestSchema } = await import("./validations");
    const reqData = LeaveRequestSchema.parse(rawData);

    const { leaveTypes, leaveRequests, employees, employeeRoleAssignments, employeeLeaveBalances } = await import("@/db/schema");

    const leaveConfigList = await db.select().from(leaveTypes).where(eq(leaveTypes.id, reqData.leaveTypeId));
    const leaveConfig = leaveConfigList[0];
    if (!leaveConfig) throw new Error("Leave type not found");

    const empList = await db.select().from(employees).where(eq(employees.id, reqData.employeeId));
    const employee = empList[0];
    if (!employee) throw new Error("Employee not found");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const requestedStart = new Date(reqData.startDate);
    requestedStart.setHours(0, 0, 0, 0);
    const requestedEnd = new Date(reqData.endDate);
    requestedEnd.setHours(0, 0, 0, 0);

    if (requestedEnd < requestedStart) {
      throw new Error("End date cannot be earlier than start date.");
    }

    if (requestedStart < today) {
      throw new Error("Cannot apply for leave in the past.");
    }

    if (leaveConfig.minNoticeDays > 0) {
      const msPerDay = 1000 * 60 * 60 * 24;
      const noticeDays = Math.floor((requestedStart.getTime() - today.getTime()) / msPerDay);
      if (noticeDays < leaveConfig.minNoticeDays) {
        throw new Error(`This leave type requires at least ${leaveConfig.minNoticeDays} days of advance notice.`);
      }
    }

    if (leaveConfig.minTenureDays > 0) {
      const startDateEmp = new Date(employee.employmentStartDate);
      const tenureDays = Math.floor((today.getTime() - startDateEmp.getTime()) / (1000 * 60 * 60 * 24));
      if (tenureDays < leaveConfig.minTenureDays) {
        throw new Error(`Tenure lockout: You need ${leaveConfig.minTenureDays} days of tenure, but you only have ${tenureDays}.`);
      }
    }

    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const restrictedDays: string[] = leaveConfig.restrictedUsageDays as string[];
    
    let totalDays = 0;
    let allRestricted = true;

    if (restrictedDays.length > 0) {
      for (let d = new Date(requestedStart); d <= requestedEnd; d.setDate(d.getDate() + 1)) {
        const dayName = dayNames[d.getDay()];
        if (restrictedDays.includes(dayName)) {
          if (leaveConfig.sandwichRuleEnabled) {
            totalDays++;
          }
        } else {
          allRestricted = false;
          totalDays++;
        }
      }
      if (allRestricted) {
        throw new Error(`Cannot apply for leave exclusively on restricted days.`);
      }
    } else {
      const diffTime = Math.abs(requestedEnd.getTime() - requestedStart.getTime());
      totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }

    const empRoles = await db.select().from(employeeRoleAssignments).where(
      and(eq(employeeRoleAssignments.employeeId, reqData.employeeId), eq(employeeRoleAssignments.isActive, true))
    );
    const empRole = empRoles[0];

    if (empRole) {
      const { leaveRolePolicies } = await import("@/db/schema");
      const policies = await db.select().from(leaveRolePolicies).where(
        and(eq(leaveRolePolicies.leaveTypeId, reqData.leaveTypeId), eq(leaveRolePolicies.businessRoleId, empRole.roleId))
      );
      const rolePolicy = policies[0];

      if (rolePolicy && rolePolicy.maxConcurrentLeaves !== null) {
        const concurrentLeaves = await db.select().from(leaveRequests)
          .leftJoin(employeeRoleAssignments, eq(leaveRequests.employeeId, employeeRoleAssignments.employeeId))
          .where(
            and(
              eq(leaveRequests.leaveTypeId, reqData.leaveTypeId),
              eq(employeeRoleAssignments.roleId, empRole.roleId),
              inArray(leaveRequests.status, ["APPROVED", "PENDING"]),
              lte(leaveRequests.startDate, reqData.endDate),
              gte(leaveRequests.endDate, reqData.startDate)
            )
          );

        if (concurrentLeaves.length >= rolePolicy.maxConcurrentLeaves) {
          throw new Error(`Role quota full: Max ${rolePolicy.maxConcurrentLeaves} concurrent leaves allowed.`);
        }
      }
    }

    if (employee.departmentId) {
      const { leaveDepartmentPolicies } = await import("@/db/schema");
      const deptPolicies = await db.select().from(leaveDepartmentPolicies).where(
        and(eq(leaveDepartmentPolicies.leaveTypeId, reqData.leaveTypeId), eq(leaveDepartmentPolicies.departmentId, employee.departmentId))
      );
      const deptPolicy = deptPolicies[0];

      if (deptPolicy && deptPolicy.maxConcurrentLeaves !== null) {
        const concurrentLeaves = await db.select().from(leaveRequests)
          .leftJoin(employees, eq(leaveRequests.employeeId, employees.id))
          .where(
            and(
              eq(leaveRequests.leaveTypeId, reqData.leaveTypeId),
              eq(employees.departmentId, employee.departmentId),
              inArray(leaveRequests.status, ["APPROVED", "PENDING"]),
              lte(leaveRequests.startDate, reqData.endDate),
              gte(leaveRequests.endDate, reqData.startDate)
            )
          );

        if (concurrentLeaves.length >= deptPolicy.maxConcurrentLeaves) {
          throw new Error(`Department quota full: Max ${deptPolicy.maxConcurrentLeaves} concurrent leaves allowed.`);
        }
      }
    }

    if (reqData.isHalfDay) totalDays = 0.5;

    if (leaveConfig.maxConsecutiveDays !== null && totalDays > leaveConfig.maxConsecutiveDays) {
      throw new Error(`Exceeds maximum consecutive days limit of ${leaveConfig.maxConsecutiveDays}.`);
    }

    const balanceRecords = await db.select().from(employeeLeaveBalances).where(
      and(
        eq(employeeLeaveBalances.employeeId, reqData.employeeId),
        eq(employeeLeaveBalances.leaveTypeId, reqData.leaveTypeId)
      )
    );
    const currentBalance = balanceRecords[0];

    if (!currentBalance || Number(currentBalance.closingBalance) < totalDays) {
      throw new Error(`Insufficient balance: You requested ${totalDays} days, but only have ${currentBalance ? currentBalance.closingBalance : 0} days available.`);
    }

    await db.insert(leaveRequests).values({
      organizationId,
      locationId,
      employeeId: reqData.employeeId,
      leaveTypeId: reqData.leaveTypeId,
      startDate: reqData.startDate,
      endDate: reqData.endDate,
      totalDays: String(totalDays),
      isHalfDay: reqData.isHalfDay,
      reason: reqData.reason,
      status: "PENDING",
      evidenceUrl: reqData.evidenceUrl || null,
      approverId: employee.reportingEmployeeId || null,
    });

    return { success: true };
  } catch (error) {
    console.error("Leave request failed:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function actionLeaveRequest(
  requestId: string,
  status: "APPROVED" | "REJECTED",
  rejectionReason?: string
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) throw new Error("Unauthorized");

    const { getSessionContext } = await import("@/domains/session/service");
    const grants = await getSessionContext(session.user);

    const { leaveRequests, employeeLeaveBalances, employees } = await import("@/db/schema");
    
    const requestList = await db.select().from(leaveRequests).where(eq(leaveRequests.id, requestId));
    const request = requestList[0];
    if (!request) throw new Error("Request not found");

    if (request.status !== "PENDING") {
      throw new Error(`Request is already ${request.status}`);
    }

    const empRecords = await db.select({ id: employees.id }).from(employees).where(eq(employees.userId, session.user.id)).limit(1);
    const currentEmpId = empRecords.length > 0 ? empRecords[0].id : null;

    // Permission Check: Must be the approverId, OR have manage permission, OR be Owner
    const isApprover = currentEmpId && request.approverId === currentEmpId;
    const canManage = grants.isOwner || grants.scopes.some((s: any) => s.permissions.includes("attendance.approvals:manage"));

    if (!isApprover && !canManage) {
      throw new Error("Unauthorized to action this request");
    }

    await db.transaction(async (tx) => {
      // 1. Update the request status
      await tx.update(leaveRequests)
        .set({
          status: status,
          actionedBy: session.user.id,
          actionedAt: new Date(),
          rejectionReason: status === "REJECTED" ? rejectionReason : null,
          updatedAt: new Date()
        })
        .where(eq(leaveRequests.id, requestId));

      // 2. If APPROVED, deduct the balance
      if (status === "APPROVED") {
        const balanceList = await tx.select().from(employeeLeaveBalances).where(
          and(
            eq(employeeLeaveBalances.employeeId, request.employeeId),
            eq(employeeLeaveBalances.leaveTypeId, request.leaveTypeId)
          )
        );
        const balance = balanceList[0];

        if (!balance) {
          throw new Error("Employee leave balance record not found during approval.");
        }

        if (Number(balance.closingBalance) < Number(request.totalDays)) {
           throw new Error("Employee does not have enough balance to approve this request.");
        }

        const newTaken = Number(balance.taken) + Number(request.totalDays);
        const newClosing = Number(balance.closingBalance) - Number(request.totalDays);

        await tx.update(employeeLeaveBalances)
          .set({
            taken: newTaken.toFixed(2),
            closingBalance: newClosing.toFixed(2),
            updatedAt: new Date()
          })
          .where(eq(employeeLeaveBalances.id, balance.id));
      }
    });

    return { success: true };
  } catch (error) {
    console.error("Leave action failed:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function submitEncashmentRequest(
  rawData: unknown,
  organizationId: string,
  locationId: string
) {
  try {
    const { auth } = await import("@/lib/auth");
    const { headers } = await import("next/headers");
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) throw new Error("Unauthorized");

    const { EncashmentRequestSchema } = await import("./validations");
    const reqData = EncashmentRequestSchema.parse(rawData);

    const { db } = await import("@/db");
    const { leaveTypes, leaveEncashmentRequests, employees, employeeLeaveBalances } = await import("@/db/schema");
    const { eq, and } = await import("drizzle-orm");

    const leaveConfigList = await db.select().from(leaveTypes).where(eq(leaveTypes.id, reqData.leaveTypeId));
    const leaveConfig = leaveConfigList[0];
    if (!leaveConfig) throw new Error("Leave type not found");

    if (!leaveConfig.isEncashable) {
      throw new Error("This leave type is not encashable.");
    }

    const empList = await db.select().from(employees).where(eq(employees.id, reqData.employeeId));
    const employee = empList[0];
    if (!employee) throw new Error("Employee not found");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Rule: Min Tenure Check
    if (leaveConfig.encashmentMinTenureDays > 0) {
      const startDateEmp = new Date(employee.employmentStartDate);
      const tenureDays = Math.floor((today.getTime() - startDateEmp.getTime()) / (1000 * 60 * 60 * 24));
      if (tenureDays < leaveConfig.encashmentMinTenureDays) {
        throw new Error(`You must complete at least ${leaveConfig.encashmentMinTenureDays} days of tenure to request encashment. You currently have ${tenureDays} days.`);
      }
    }

    // Rule: Financial Year Check
    if (leaveConfig.encashmentOnlyAtYearEnd) {
      // Assuming April is the start of the financial year (month index 3)
      if (today.getMonth() !== 3) {
        throw new Error("Encashment for this leave type is only allowed during the financial year close window (April).");
      }
    }

    const balances = await db.select().from(employeeLeaveBalances).where(
      and(
        eq(employeeLeaveBalances.employeeId, reqData.employeeId),
        eq(employeeLeaveBalances.leaveTypeId, reqData.leaveTypeId)
      )
    );
    const balance = balances[0];
    if (!balance) throw new Error("Leave balance not found.");

    const currentBalance = Number(balance.closingBalance);
    const requestedEncashment = Number(reqData.encashmentDays);

    if (requestedEncashment <= 0) {
      throw new Error("Requested encashment days must be greater than 0.");
    }

    if (currentBalance < requestedEncashment) {
      throw new Error(`Insufficient balance. You only have ${currentBalance} days available.`);
    }

    // Rule: Minimum Balance Retention
    const balanceAfterEncashment = currentBalance - requestedEncashment;
    if (balanceAfterEncashment < Number(leaveConfig.encashmentMinBalanceRetained)) {
      throw new Error(`You must retain a minimum balance of ${leaveConfig.encashmentMinBalanceRetained} days. You can encash a maximum of ${currentBalance - Number(leaveConfig.encashmentMinBalanceRetained)} days.`);
    }

    await db.insert(leaveEncashmentRequests).values({
      organizationId,
      locationId,
      employeeId: reqData.employeeId,
      leaveTypeId: reqData.leaveTypeId,
      encashmentDays: requestedEncashment.toString(),
      status: "PENDING",
      reason: reqData.reason,
      approverId: employee.reportingEmployeeId,
      payrollProcessed: false,
    });

    return { success: true };
  } catch (error) {
    console.error("Encashment request failed:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function approveEncashment(id: string) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) throw new Error("Unauthorized");
    const { leaveEncashmentRequests } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");

    await db.update(leaveEncashmentRequests).set({
      status: "APPROVED",
      actionedBy: session.user.id,
      actionedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(leaveEncashmentRequests.id, id));

    return { success: true };
  } catch (error) {
    console.error("Approve encashment failed:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function rejectEncashment(id: string, reason: string) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) throw new Error("Unauthorized");
    const { leaveEncashmentRequests } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");

    await db.update(leaveEncashmentRequests).set({
      status: "REJECTED",
      rejectionReason: reason,
      actionedBy: session.user.id,
      actionedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(leaveEncashmentRequests.id, id));

    return { success: true };
  } catch (error) {
    console.error("Reject encashment failed:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function forwardEncashment(id: string, newApproverId: string) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) throw new Error("Unauthorized");
    const { leaveEncashmentRequests } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");

    await db.update(leaveEncashmentRequests).set({
      approverId: newApproverId,
      updatedAt: new Date(),
    }).where(eq(leaveEncashmentRequests.id, id));

    return { success: true };
  } catch (error) {
    console.error("Forward encashment failed:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function recordSelfiePunch(payload: {
  employeeId: string;
  punchType: "IN" | "OUT";
  snapshotBase64?: string;
  organizationId: string;
  locationId: string;
}) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) throw new Error("Unauthorized");

    const { getSessionContext } = await import("@/domains/session/service");
    const context = await getSessionContext(session.user);

    // Enforce tenant isolation and RBAC check for attendance:selfie-punch
    const scope = context.scopes.find(
      (s) => s.organizationId === payload.organizationId && s.locationId === payload.locationId
    );

    if (!scope) {
      throw new Error("Forbidden: Invalid location scope.");
    }

    if (!context.isOwner) {
      const hasSelfiePunchAccess = scope.permissions.includes("attendance.selfie_punch:execute");
      if (!hasSelfiePunchAccess) {
        throw new Error("Forbidden: Missing selfie-punch permission.");
      }
    }

    const { rawBiometricPunches, employees } = await import("@/db/schema");
    
    // Fetch employee biometricId
    const empRecords = await db.select({ biometricId: employees.biometricId })
      .from(employees)
      .where(and(eq(employees.id, payload.employeeId), eq(employees.organizationId, payload.organizationId)));
      
    const employee = empRecords[0];
    if (!employee) {
      throw new Error("Employee not found");
    }

    // Insert append-only record
    await db.insert(rawBiometricPunches).values({
      organizationId: payload.organizationId,
      locationId: payload.locationId,
      employeeId: payload.employeeId,
      biometricId: employee.biometricId || payload.employeeId, // Fallback if no biometricId
      punchTimestamp: new Date(),
      punchType: payload.punchType,
      sourceType: "SELFIE_KIOSK",
      machineId: "KIOSK_BROWSER",
    });

    // Optionally: trigger daily attendance reconciliation here

    return { success: true };
  } catch (error) {
    console.error("Record selfie punch failed:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
