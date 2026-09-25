const fs = require('fs');
let code = fs.readFileSync('src/domains/employees/service.ts', 'utf8');

// 1. Remove from imports
code = code.replace(/employeeSalaryInfo,\s*employeeHistorySalary,\s*/g, '');

// 2. Remove salaryInputSchema
code = code.replace(/export const salaryInputSchema =[\s\S]*?export type SalaryInput = z\.infer<typeof salaryInputSchema>;\n/g, '');

// 3. Remove optional salary from employeeUpdateSchema
code = code.replace(/\s*salary: salaryInputSchema\.optional\(\),/g, '');

// 4. Remove getEmployee salary history queries
code = code.replace(/const salaryInfoRows = await db\.select\(\)\.from\(employeeSalaryInfo\)[\s\S]*?;\n/g, '');
code = code.replace(/const salaryHistory = await db\.select\(\)\.from\(employeeHistorySalary\)[\s\S]*?;\n/g, '');
code = code.replace(/\s*salaryInfo: salaryInfoRows\[0\] \?\? null,/g, '');
code = code.replace(/\s*salary: salaryHistory,/g, '');

// 5. Remove createEmployee salary insert
const createEmployeeInsert = `    if (parsed.data.salary) {
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
    }

`;
code = code.replace(createEmployeeInsert, '');

// 6. Remove proposeEmployeeChange salary checks
const proposeSalaryCheck = `    if (parsed.data.salary !== undefined) {
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
const setEmployeeSalaryInfoFuncRegex = /export async function setEmployeeSalaryInfo[\s\S]*?\}\n\}\n/g;
code = code.replace(setEmployeeSalaryInfoFuncRegex, '');

fs.writeFileSync('src/domains/employees/service.ts', code);
