const fs = require('fs');
let code = fs.readFileSync('src/domains/employees/service.ts', 'utf8');

// 1. Remove imports
code = code.replace('employeeSalaryInfo,\n  employeeHistorySalary,\n', '');

// 2. Remove salaryInputSchema block exactly
const schemaBlock = export const salaryInputSchema = z.object({
  salaryType: z.enum(["Daily", "Weekly", "Monthly"]),
  amount: z.string().regex(/^\\d+(\\.\\d{1,2})?$/),
  paymentMethod: z.enum(["BANK_TRANSFER", "GPAY", "CASH"]),
  accountHolderName: z.string().nullable().optional(),
  accountNumber: z.string().nullable().optional(),
  bankName: z.string().nullable().optional(),
  ifscCode: z.string().nullable().optional(),
  gpayNumber: optionalMobileSchema,
  bankingName: z.string().nullable().optional(),
}).superRefine((val, ctx) => {
  if (val.paymentMethod === "BANK_TRANSFER") {
    if (!val.accountHolderName) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required for bank transfer", path: ["accountHolderName"] });
    if (!val.accountNumber) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required for bank transfer", path: ["accountNumber"] });
    if (!val.bankName) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required for bank transfer", path: ["bankName"] });
    if (!val.ifscCode) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required for bank transfer", path: ["ifscCode"] });
  } else if (val.paymentMethod === "GPAY") {
    if (!val.gpayNumber) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required for GPay", path: ["gpayNumber"] });
    if (!val.bankingName) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required for GPay", path: ["bankingName"] });
  }
});

export type SalaryInput = z.infer<typeof salaryInputSchema>;;
code = code.replace(schemaBlock, '');

// 3. Remove salary from employeeInputSchema
code = code.replace('  salary: salaryInputSchema.optional(),\n', '');
code = code.replace('  salary: salaryInputSchema.optional(),\n', '');
code = code.replace('  salary: salaryInputSchema.optional(),\n', '');

// 4. Remove getEmployee queries
const getEmployeeBlock1 =   const salaryInfoRows = await db.select().from(employeeSalaryInfo).where(eq(employeeSalaryInfo.employeeId, employee.id));
  ;
const getEmployeeBlock2 =   const salaryHistory = await db.select().from(employeeHistorySalary).where(eq(employeeHistorySalary.employeeId, employee.id)).orderBy(employeeHistorySalary.effectiveFrom);
;
code = code.replace(getEmployeeBlock1, '');
code = code.replace(getEmployeeBlock2, '');
code = code.replace('    salaryInfo: salaryInfoRows[0] ?? null,\n', '');
code = code.replace('      salary: salaryHistory,\n', '');

// 5. Remove createEmployee salary insert
const createEmployeeInsert = 
    if (parsed.data.salary) {
      await tx.insert(employeeSalaryInfo).values({
        organizationId: currentOrgId,
        employeeId: employeeId,
        salaryType: parsed.data.salary.salaryType,
        amount: parsed.data.salary.amount,
        effectiveFrom: now.toISOString().split('T')[0], // Use current date string for initial setup
        paymentMethod: parsed.data.salary.paymentMethod,
        accountHolderName: parsed.data.salary.accountHolderName ?? null,
        accountNumber: parsed.data.salary.accountNumber ?? null,
        bankName: parsed.data.salary.bankName ?? null,
        ifscCode: parsed.data.salary.ifscCode ?? null,
        gpayNumber: parsed.data.salary.gpayNumber ?? null,
        bankingName: parsed.data.salary.bankingName ?? null,
      });
      await tx.insert(employeeHistorySalary).values({
        organizationId: currentOrgId, employeeId: employeeId, salaryType: parsed.data.salary.salaryType, amount: parsed.data.salary.amount, effectiveFrom: now, recordedBy: recordedByEmployeeId,
      });
    };
code = code.replace(createEmployeeInsert, '');

// 6. Remove updateEmployeeLifecycle checks
const updateLifecycleCheck =       const salaryInfo = await tx.select().from(employeeSalaryInfo).where(eq(employeeSalaryInfo.employeeId, current.id));
      if (salaryInfo.length === 0) {
        throw new EmployeeServiceError("Salary configuration is required for activation", "INVALID_LIFECYCLE_TRANSITION");
      }
      if (salaryInfo[0]) {
        if (salaryInfo[0].paymentMethod === "BANK_TRANSFER" && (!salaryInfo[0].accountNumber || !salaryInfo[0].bankName || !salaryInfo[0].ifscCode || !salaryInfo[0].accountHolderName)) {
           throw new EmployeeServiceError("Complete bank details are required for bank transfer method", "INVALID_LIFECYCLE_TRANSITION");
        }
        if (salaryInfo[0].paymentMethod === "GPAY" && (!salaryInfo[0].gpayNumber || !salaryInfo[0].bankingName)) {
           throw new EmployeeServiceError("GPay number and Name are required for GPay method", "INVALID_LIFECYCLE_TRANSITION");
        }
      }

      ;
code = code.replace(updateLifecycleCheck, '');

// 7. Remove proposeEmployeeChange block
const proposeBlock =     if (parsed.data.salary !== undefined) {
      if (parsed.data.salary === null) {
        throw new EmployeeServiceError("Salary cannot be null", "INVALID_INPUT");
      }
      const existingSalaryData = await tx.select().from(employeeSalaryInfo).where(eq(employeeSalaryInfo.employeeId, employeeId));
      if (existingSalaryData.length > 0) {
        const existing = existingSalaryData[0];
        if (
          existing.salaryType !== parsed.data.salary.salaryType || 
          existing.amount !== parsed.data.salary.amount ||
          existing.paymentMethod !== parsed.data.salary.paymentMethod ||
          existing.accountNumber !== parsed.data.salary.accountNumber ||
          existing.bankName !== parsed.data.salary.bankName ||
          existing.ifscCode !== parsed.data.salary.ifscCode ||
          existing.gpayNumber !== parsed.data.salary.gpayNumber ||
          existing.bankingName !== parsed.data.salary.bankingName ||
          existing.accountHolderName !== parsed.data.salary.accountHolderName
        ) {
          changes.push({ field: "salary", oldValue: existing, newValue: parsed.data.salary });
        }
      } else {
        changes.push({ field: "salary", oldValue: null, newValue: parsed.data.salary });
      }
    }

    ;
code = code.replace(proposeBlock, '');
code = code.replace('          salary: parsed.data.salary,\n', '');

// 8. Remove updateEmployee block inside processChangeRequest
const processBlock =     // Salary update
    if (payload.salary) {
      await tx.update(employeeSalaryInfo).set({ isActive: false, updatedAt: now }).where(eq(employeeSalaryInfo.employeeId, emp.id));
      await tx.insert(employeeSalaryInfo).values({
        organizationId: emp.organizationId,
        employeeId: emp.id,
        salaryType: payload.salary.salaryType,
        amount: payload.salary.amount,
        effectiveFrom: now.toISOString().split('T')[0], // date string
        paymentMethod: payload.salary.paymentMethod,
        accountHolderName: payload.salary.accountHolderName ?? null,
        accountNumber: payload.salary.accountNumber ?? null,
        bankName: payload.salary.bankName ?? null,
        ifscCode: payload.salary.ifscCode ?? null,
        gpayNumber: payload.salary.gpayNumber ?? null,
        bankingName: payload.salary.bankingName ?? null,
      });
      await tx.insert(employeeHistorySalary).values({
        organizationId: emp.organizationId, employeeId: emp.id, salaryType: payload.salary.salaryType, amount: payload.salary.amount, effectiveFrom: now, recordedBy: recordedByEmployeeId
      });
    }

;
code = code.replace(processBlock, '');

// 9. Remove setEmployeeSalaryInfo
const setSalaryFunc = export async function setEmployeeSalaryInfo(actor: Actor, employeeId: string, input: SalaryInput) {
  requireActor(actor);
  const parsed = salaryInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new EmployeeServiceError("Invalid salary input", "INVALID_INPUT");
  }
  
  return db.transaction(async (tx) => {
    const currentRows = await tx.select().from(employees).where(eq(employees.id, employeeId)).for("update");
    if (currentRows.length === 0) throw new EmployeeServiceError("Employee not found", "EMPLOYEE_NOT_FOUND");
    const current = currentRows[0];

    const actorEmployeeRows = await tx.select({ id: employees.id }).from(employees).where(eq(employees.userId, actor.id));
    const recordedByEmployeeId = actorEmployeeRows[0]?.id ?? null;

    if (current.status !== "DRAFT") {
      const grants = await loadAuthorizationGrants(actor.id);
      if (!grants.isOwner) {
        throw new EmployeeServiceError("Only owners can directly edit salary of active employees. Others must propose a change.", "ACCESS_DENIED");
      }
    } else {
      await requireEmployeeAccess(
        actor,
        current.organizationId,
        current.locationId,
        employeePermissions.update,
      );
    }

    const now = new Date();
    await tx.update(employeeSalaryInfo).set({ isActive: false, updatedAt: now }).where(eq(employeeSalaryInfo.employeeId, employeeId));
    
    await tx.insert(employeeSalaryInfo).values({
      organizationId: current.organizationId,
      employeeId: employeeId,
      salaryType: parsed.data.salaryType,
      amount: parsed.data.amount,
      effectiveFrom: now.toISOString().split('T')[0],
      paymentMethod: parsed.data.paymentMethod,
      accountHolderName: parsed.data.accountHolderName ?? null,
      accountNumber: parsed.data.accountNumber ?? null,
      bankName: parsed.data.bankName ?? null,
      ifscCode: parsed.data.ifscCode ?? null,
      gpayNumber: parsed.data.gpayNumber ?? null,
      bankingName: parsed.data.bankingName ?? null,
    });

    if (current.status !== "DRAFT") {
      await tx.insert(employeeHistorySalary).values({
        organizationId: current.organizationId,
        employeeId: employeeId,
        salaryType: parsed.data.salaryType,
        amount: parsed.data.amount,
        effectiveFrom: now,
        recordedBy: recordedByEmployeeId
      });
    }

    await recordAuditEvent({
      organizationId: current.organizationId,
      locationId: current.locationId,
      actorUserId: actor.id,
      eventType: "EMPLOYEE_SALARY_UPDATED",
      action: "UPDATE",
      entityType: "employee",
      entityId: employeeId,
      metadata: { status: current.status }
    }, tx);

    return true;
  });
}

;
code = code.replace(setSalaryFunc, '');

fs.writeFileSync('src/domains/employees/service.ts', code);
console.log('Fixed completely!');
