const fs = require('fs');
let code = fs.readFileSync('src/domains/employees/service.ts', 'utf8');

// 1. Remove from imports
code = code.replace('  employeeSalaryInfo,\n  employeeHistorySalary,\n', '');

// 2. Remove salaryInputSchema
const salaryInputSchemaBlock = `export const salaryInputSchema = z.object({
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

export type SalaryInput = z.infer<typeof salaryInputSchema>;`;

code = code.replace(salaryInputSchemaBlock, '');

// 3. Remove optional salary from employeeUpdateSchema
code = code.replace('    salary: salaryInputSchema.optional(),\n', '');
code = code.replace('  salary: salaryInputSchema.optional(),\n', '');

// 4. Remove getEmployee salary history queries
const getEmployeeSalary1 = `  const salaryInfoRows = await db.select().from(employeeSalaryInfo).where(eq(employeeSalaryInfo.employeeId, employee.id));
`;
const getEmployeeSalary2 = `  const salaryHistory = await db.select().from(employeeHistorySalary).where(eq(employeeHistorySalary.employeeId, employee.id)).orderBy(employeeHistorySalary.effectiveFrom);
`;
code = code.replace(getEmployeeSalary1, '');
code = code.replace(getEmployeeSalary2, '');
code = code.replace('    salaryInfo: salaryInfoRows[0] ?? null,\n', '');
code = code.replace('      salary: salaryHistory,\n', '');

// 5. Remove createEmployee salary insert
const createEmployeeInsert = `
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
    }`;
code = code.replace(createEmployeeInsert, '');

// 6. Remove proposeEmployeeChange salary checks
const proposeSalaryCheck = `    if (parsed.data.salary !== undefined) {
      const existingSalaryData = await tx.select().from(employeeSalaryInfo).where(eq(employeeSalaryInfo.employeeId, employeeId)).limit(1);
      const existingSalary = existingSalaryData[0];
      
      const hasSalaryChanged = !existingSalary || 
        existingSalary.salaryType !== parsed.data.salary.salaryType ||
        parseFloat(existingSalary.amount) !== parseFloat(parsed.data.salary.amount) ||
        existingSalary.paymentMethod !== parsed.data.salary.paymentMethod ||
        existingSalary.accountHolderName !== (parsed.data.salary.accountHolderName ?? null) ||
        existingSalary.accountNumber !== (parsed.data.salary.accountNumber ?? null) ||
        existingSalary.bankName !== (parsed.data.salary.bankName ?? null) ||
        existingSalary.ifscCode !== (parsed.data.salary.ifscCode ?? null) ||
        existingSalary.gpayNumber !== (parsed.data.salary.gpayNumber ?? null) ||
        existingSalary.bankingName !== (parsed.data.salary.bankingName ?? null);

      if (hasSalaryChanged) {
        const now = new Date();
        await tx.delete(employeeSalaryInfo).where(eq(employeeSalaryInfo.employeeId, employeeId));
        await tx.insert(employeeSalaryInfo).values({
          organizationId: current.organizationId,
          employeeId: employeeId,
          salaryType: parsed.data.salary.salaryType,
          amount: parsed.data.salary.amount,
          effectiveFrom: now.toISOString().split('T')[0],
          paymentMethod: parsed.data.salary.paymentMethod,
          accountHolderName: parsed.data.salary.accountHolderName ?? null,
          accountNumber: parsed.data.salary.accountNumber ?? null,
          bankName: parsed.data.salary.bankName ?? null,
          ifscCode: parsed.data.salary.ifscCode ?? null,
          gpayNumber: parsed.data.salary.gpayNumber ?? null,
          bankingName: parsed.data.salary.bankingName ?? null,
        });

        if (current.status !== "DRAFT") {
          await tx.insert(employeeHistorySalary).values({
            organizationId: current.organizationId,
            employeeId: employeeId,
            salaryType: parsed.data.salary.salaryType,
            amount: parsed.data.salary.amount,
            effectiveFrom: now,
            recordedBy: recordedByEmployeeId
          });
        }
      }
    }

`;
code = code.replace(proposeSalaryCheck, '');

// 7. Remove updateEmployeeLifecycle validation
const updateLifecycleValidation = `      const salaryInfo = await tx.select().from(employeeSalaryInfo).where(eq(employeeSalaryInfo.employeeId, current.id));
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

      `;
code = code.replace(updateLifecycleValidation, '');

// 8. Remove processChangeRequest update block
const processChangeRequestBlock = `    // Salary update
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

`;
code = code.replace(processChangeRequestBlock, '');

// 9. Remove setEmployeeSalaryInfo
const setEmployeeSalaryInfoFunc = `export async function setEmployeeSalaryInfo(actor: Actor, employeeId: string, input: SalaryInput) {
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
`;
code = code.replace(setEmployeeSalaryInfoFunc, '');

fs.writeFileSync('src/domains/employees/service.ts', code);
