const fs = require('fs');
let code = fs.readFileSync('src/domains/employees/service.ts', 'utf8').split('\n');

for (let i = 0; i < code.length; i++) {
    // 1. createEmployee salary insert
    if (code[i].includes('if (parsed.data.salary) {') && code[i+1].includes('await tx.insert(employeeSalaryInfo)')) {
        code[i] = ''; // if
        for (let j = i+1; j < i + 30; j++) {
            let line = code[j];
            code[j] = '';
            if (line.includes('}')) break;
        }
    }
    
    // 2. proposeEmployeeChange salary checks
    if (code[i].includes('if (parsed.data.salary !== undefined) {') && code[i+4].includes('const existingSalaryData = await tx.select().from(employeeSalaryInfo)')) {
        code[i] = '';
        let braces = 1;
        for (let j = i+1; j < code.length; j++) {
            braces += (code[j].match(/\{/g) || []).length;
            braces -= (code[j].match(/\}/g) || []).length;
            let line = code[j];
            code[j] = '';
            if (braces === 0) break;
        }
    }
    if (code[i].includes('salary: parsed.data.salary,')) code[i] = '';

    // 3. updateEmployeeLifecycle salary validation
    if (code[i].includes('const salaryInfo = await tx.select().from(employeeSalaryInfo)')) {
        code[i] = '';
        for (let j = i+1; j < code.length; j++) {
            let line = code[j];
            code[j] = '';
            // We know the block ends with two closing braces
            if (line.includes('throw new EmployeeServiceError("GPay number and Name are required for GPay method", "INVALID_LIFECYCLE_TRANSITION");')) {
                code[j+1] = '';
                code[j+2] = '';
                break;
            }
        }
    }

    // 4. updateEmployeeLifecycle salary history insert
    if (code[i].includes('if (current.status !== "DRAFT") {') && code[i+1].includes('await tx.insert(employeeHistorySalary)')) {
        code[i] = '';
        for (let j = i+1; j < i + 30; j++) {
            let line = code[j];
            code[j] = '';
            if (line.includes('}')) break;
        }
    }

    // 5. updateEmployee inside processChangeRequest
    if (code[i].includes('// Salary update') && code[i+1].includes('if (payload.salary) {')) {
        code[i] = '';
        code[i+1] = '';
        let braces = 1;
        for (let j = i+2; j < code.length; j++) {
            braces += (code[j].match(/\{/g) || []).length;
            braces -= (code[j].match(/\}/g) || []).length;
            let line = code[j];
            code[j] = '';
            if (braces === 0) break;
        }
    }

    // 6. setEmployeeSalaryInfo
    if (code[i].includes('export async function setEmployeeSalaryInfo(actor: Actor, employeeId: string, input: SalaryInput) {')) {
        code[i] = '';
        let braces = 1;
        for (let j = i+1; j < code.length; j++) {
            braces += (code[j].match(/\{/g) || []).length;
            braces -= (code[j].match(/\}/g) || []).length;
            let line = code[j];
            code[j] = '';
            if (braces === 0) break;
        }
    }
}

fs.writeFileSync('src/domains/employees/service.ts', code.join('\n'));
