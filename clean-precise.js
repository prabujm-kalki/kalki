const fs = require('fs');
let code = fs.readFileSync('src/domains/employees/service.ts', 'utf8');

// 1. Remove employeeSalaryInfo from import
code = code.replace(/employeeSalaryInfo,/g, '');
code = code.replace(/employeeHistorySalary,/g, '');

// 2. Remove salaryInputSchema entirely
code = code.replace(/export const salaryInputSchema = z\.object\(\{[\s\S]*?\}\);\s*export type SalaryInput = z\.infer<typeof salaryInputSchema>;/g, '');

// 3. Remove salary from input schemas
code = code.replace(/\s*salary: salaryInputSchema\.optional\(\),/g, '');

// 4. Remove getEmployee salary fetch
code = code.replace(/\s*const salaryInfoRows = await db\.select\(\)\.from\(employeeSalaryInfo\)\.where\(eq\(employeeSalaryInfo\.employeeId, employee\.id\)\);\s*const salaryHistory = await db\.select\(\)\.from\(employeeHistorySalary\)\.where\(eq\(employeeHistorySalary\.employeeId, employee\.id\)\)\.orderBy\(employeeHistorySalary\.effectiveFrom\);/g, '');
code = code.replace(/salaryInfo: salaryInfoRows\[0\] \|\| null,/g, 'salaryInfo: null,');
code = code.replace(/salaryHistory: salaryHistory,/g, 'salaryHistory: [],');

// 5. Remove createEmployee salary check (if (parsed.data.salary))
code = code.replace(/if\s*\(parsed\.data\.salary\)\s*\{\s*await tx\.insert\(employeeSalaryInfo\)\.values\(\{[\s\S]*?\}\);\s*\}/g, '');

// 6. Remove proposeEmployeeChange salary checks
code = code.replace(/if\s*\(parsed\.data\.salary\s*!==\s*undefined\)\s*\{[\s\S]*?\}\s*\}\s*\}\s*if\s*\(parsed\.data\.reportingEmployeeId/g, 'if (parsed.data.reportingEmployeeId');
code = code.replace(/salary:\s*parsed\.data\.salary,/g, '');

// 7. Remove updateEmployee logic
code = code.replace(/if\s*\(parsed\.data\.salary\)\s*\{[\s\S]*?\}\s*await\s*recordAuditEvent/g, 'await recordAuditEvent');

// 8. Remove activation logic salary check
code = code.replace(/const salaryInfo = await tx\.select\(\)\.from\(employeeSalaryInfo\)[\s\S]*?if\s*\(salaryInfo\.length === 0\) \{[\s\S]*?\}\s*if\s*\(salaryInfo\[0\]\) \{[\s\S]*?\}\s*\}/g, '');

// 9. Remove setEmployeeSalaryInfo
code = code.replace(/export async function setEmployeeSalaryInfo\([\s\S]*?\}\n\}/g, '');

fs.writeFileSync('src/domains/employees/service.ts', code);
console.log('Fixed service.ts');
