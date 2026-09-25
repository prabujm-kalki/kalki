const fs = require('fs');
let code = fs.readFileSync('src/domains/employees/service.ts', 'utf8');

// Imports
code = code.replace(/employeeSalaryInfo,/g, '');
code = code.replace(/employeeHistorySalary,/g, '');

// salaryInputSchema
code = code.replace(/export const salaryInputSchema = z\.object\(\{[\s\S]*?\}\);/g, '');
code = code.replace(/export type SalaryInput = z\.infer<typeof salaryInputSchema>;/g, '');

// Schemas
code = code.replace(/\bsalary: salaryInputSchema\.optional\(\),/g, '');

// getEmployee salary fetch
code = code.replace(/const salaryInfoRows = await db\.select\(\)\.from\(employeeSalaryInfo\)\.where\(eq\(employeeSalaryInfo\.employeeId, employee\.id\)\);/g, '');
code = code.replace(/salaryInfo: salaryInfoRows\[0\] \|\| null,/g, 'salaryInfo: null,');

// createEmployee insert
code = code.replace(/if \(parsed\.data\.salary\) \{[\s\S]*?\}\s*await initializeEmployeeLeaves/g, 'await initializeEmployeeLeaves');

// proposeEmployeeChange salary checks
code = code.replace(/if \(parsed\.data\.salary !== undefined\) \{[\s\S]*?\}\s*if \(parsed\.data\.reportingEmployeeId/g, 'if (parsed.data.reportingEmployeeId');
code = code.replace(/salary: parsed\.data\.salary,/g, '');

// updateEmployee logic
code = code.replace(/if \(parsed\.data\.salary\) \{[\s\S]*?\}\s*await recordAuditEvent/g, 'await recordAuditEvent');

// setEmployeeSalaryInfo
code = code.replace(/export async function setEmployeeSalaryInfo\([\s\S]*?\n\}\n/g, '');

// Activation salary check
code = code.replace(/const salaryInfo = await tx\.select\(\)\.from\(employeeSalaryInfo\)[\s\S]*?\}\n/g, '');

fs.writeFileSync('src/domains/employees/service.ts', code);
console.log('Fixed service.ts');
