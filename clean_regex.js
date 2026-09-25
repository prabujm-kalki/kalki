const fs = require('fs');
let code = fs.readFileSync('src/domains/employees/service.ts', 'utf8');

// 1. Remove from imports
code = code.replace(/employeeSalaryInfo,\s*employeeHistorySalary,\s*/g, '');

// 2. Remove salaryInputSchema
code = code.replace(/export const salaryInputSchema =[\s\S]*?export type SalaryInput = z\.infer<typeof salaryInputSchema>;/g, '');

// 3. Remove optional salary from employeeUpdateSchema
code = code.replace(/salary: salaryInputSchema\.optional\(\),/g, '');

// 4. Remove getEmployee salary history queries
code = code.replace(/const salaryInfoRows = await db\.select\(\)\.from\(employeeSalaryInfo\)[\s\S]*?;\n/g, '');
code = code.replace(/const salaryHistory = await db\.select\(\)\.from\(employeeHistorySalary\)[\s\S]*?;\n/g, '');
code = code.replace(/salaryInfo: salaryInfoRows\[0\] \?\? null,/g, '');
code = code.replace(/salary: salaryHistory,/g, '');

// 5. Remove createEmployee salary insert
code = code.replace(/if \(parsed\.data\.salary\) \{[\s\S]*?\}\s*\}\s*if \(current\.reportingEmployeeId/g, '} if (current.reportingEmployeeId');
code = code.replace(/if \(parsed\.data\.salary\) \{[\s\S]*?recordedByEmployeeId,\s*\}\);\s*\}/g, '');

// 6. Remove proposeEmployeeChange salary checks
code = code.replace(/if \(parsed\.data\.salary !== undefined\) \{[\s\S]*?\}\s*\}\s*if \(parsed\.data\.reportingEmployeeId/g, 'if (parsed.data.reportingEmployeeId');

// 7. Remove updateEmployeeLifecycle validation
code = code.replace(/const salaryInfo = await tx\.select\(\)\.from\(employeeSalaryInfo\)[\s\S]*?\}\s*\}/g, '');

// 8. Remove processChangeRequest update block
code = code.replace(/\/\/ Salary update\s*if \(payload\.salary\) \{[\s\S]*?\}\s*\/\/ Location/g, '// Location');

// 9. Remove setEmployeeSalaryInfo
code = code.replace(/export async function setEmployeeSalaryInfo[\s\S]*?\}\s*\}/g, '');

fs.writeFileSync('src/domains/employees/service.ts', code);
