const fs = require('fs');

let code = fs.readFileSync('src/domains/employees/service.ts', 'utf8');

const s1 = `
      if (parsed.data.salary) {
        await tx.insert(employeeSalaryInfo).values({
          organizationId: parsed.data.organizationId,
          employeeId: newEmployee.id,
          salaryType: parsed.data.salary.salaryType ?? "Monthly",
          amount: parsed.data.salary.amount ?? "0",
          effectiveFrom: parsed.data.employmentStartDate ? new Date(parsed.data.employmentStartDate).toISOString() : new Date().toISOString(),
          paymentMethod: parsed.data.salary.paymentMethod ?? "BANK_TRANSFER",
          accountHolderName: parsed.data.salary.accountHolderName ?? null,
          accountNumber: parsed.data.salary.accountNumber ?? null,
          bankName: parsed.data.salary.bankName ?? null,
          ifscCode: parsed.data.salary.ifscCode ?? null,
          gpayNumber: parsed.data.salary.gpayNumber ?? null,
          bankingName: parsed.data.salary.bankingName ?? null,
        });
      }`;
code = code.replace(s1.replace(/\r\n/g, '\n'), '');
code = code.replace(s1, '');


const s2 = `  const salaryInfoRows = await db.select().from(employeeSalaryInfo).where(eq(employeeSalaryInfo.employeeId, employee.id));`;
code = code.replace(s2.replace(/\r\n/g, '\n'), '');
code = code.replace(s2, '');

const s3 = `  const salaryHistory = await db.select().from(employeeHistorySalary).where(eq(employeeHistorySalary.employeeId, employee.id)).orderBy(employeeHistorySalary.effectiveFrom);`;
code = code.replace(s3.replace(/\r\n/g, '\n'), '');
code = code.replace(s3, '');

const s4 = `
    salaryInfo: salaryInfoRows[0] ?? null,`;
code = code.replace(s4.replace(/\r\n/g, '\n'), '');
code = code.replace(s4, '');

const s5 = `
      salary: salaryHistory,`;
code = code.replace(s5.replace(/\r\n/g, '\n'), '');
code = code.replace(s5, '');


const s6 = `
    if (parsed.data.salary !== undefined) {
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
    }`;
code = code.replace(s6.replace(/\r\n/g, '\n'), '');
code = code.replace(s6, '');

const s7 = `
    if (parsed.data.salary !== undefined) {
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
    }`;
code = code.replace(s7.replace(/\r\n/g, '\n'), '');
code = code.replace(s7, '');

const s8 = `
      const salaryInfo = await tx.select().from(employeeSalaryInfo).where(eq(employeeSalaryInfo.employeeId, current.id));
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
      }`;
code = code.replace(s8.replace(/\r\n/g, '\n'), '');
code = code.replace(s8, '');

const s9 = `
    // Salary update
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
    }`;
code = code.replace(s9.replace(/\r\n/g, '\n'), '');
code = code.replace(s9, '');

const s10 = code.substring(code.indexOf('export async function setEmployeeSalaryInfo'), code.length);
code = code.replace(s10, '');

fs.writeFileSync('src/domains/employees/service.ts', code);
console.log('Precise replacements done!');
