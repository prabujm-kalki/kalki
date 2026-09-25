const fs = require('fs');
let code = fs.readFileSync('src/domains/employees/service.ts', 'utf8');

const s1 = \    if (parsed.data.salary !== undefined) {
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
    }\;

const s2 = \      const salaryInfo = await tx.select().from(employeeSalaryInfo).where(eq(employeeSalaryInfo.employeeId, current.id));
      if (salaryInfo.length === 0) {
        throw new EmployeeServiceError("Salary info is required for activation", "INVALID_LIFECYCLE_TRANSITION");
      }
      if (salaryInfo[0]) {
        if (salaryInfo[0].paymentMethod === "BANK_TRANSFER" && (!salaryInfo[0].accountNumber || !salaryInfo[0].bankName || !salaryInfo[0].ifscCode || !salaryInfo[0].accountHolderName)) {
           throw new EmployeeServiceError("Complete bank details are required for bank transfer method", "INVALID_LIFECYCLE_TRANSITION");
        }
        if (salaryInfo[0].paymentMethod === "GPAY" && (!salaryInfo[0].gpayNumber || !salaryInfo[0].bankingName)) {
           throw new EmployeeServiceError("GPay number and Name are required for GPay method", "INVALID_LIFECYCLE_TRANSITION");
        }
      }\;
      
const s3 = \        await tx.insert(employeeHistorySalary).values({
          organizationId: current.organizationId, employeeId: current.id, salaryType: salaryInfo[0].salaryType, amount: salaryInfo[0].amount.toString(), effectiveFrom: now, recordedBy: recordedByEmployeeId,
        });\;
        
const s4 = \    // Salary update
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
    }\;
    
code = code.replace(s1.replace(/\\r\\n/g, '\\n'), '');
code = code.replace(s2.replace(/\\r\\n/g, '\\n'), '');
code = code.replace(s3.replace(/\\r\\n/g, '\\n'), '');
code = code.replace(s4.replace(/\\r\\n/g, '\\n'), '');

code = code.replace(s1, '');
code = code.replace(s2, '');
code = code.replace(s3, '');
code = code.replace(s4, '');

fs.writeFileSync('src/domains/employees/service.ts', code);
