const fs = require('fs');
let code = fs.readFileSync('src/domains/employees/service.ts', 'utf8');

code = code.replace(/const salaryHistory = await db\.select\(\)\.from\(employeeHistorySalary\)[\s\S]*?\n/g, '');
code = code.replace(/await tx\.insert\(employeeHistorySalary\)\.values\(\{[\s\S]*?\}\);/g, '');

// There might be some left over employeeSalaryInfo as well.
code = code.replace(/const salaryInfoRows = await db\.select\(\)\.from\(employeeSalaryInfo\)[\s\S]*?\n/g, '');
code = code.replace(/await tx\.delete\(employeeSalaryInfo\)[\s\S]*?\n/g, '');
code = code.replace(/await tx\.insert\(employeeSalaryInfo\)\.values\(\{[\s\S]*?\}\);/g, '');
code = code.replace(/const existingSalaryData = await tx\.select\(\)\.from\(employeeSalaryInfo\)[\s\S]*?\n/g, '');

// Also check EmployeeProfile.tsx for EmployeeSalaryForm
let profileCode = fs.readFileSync('src/components/people/EmployeeProfile.tsx', 'utf8');
profileCode = profileCode.replace(/<EmployeeSalaryForm[\s\S]*?\/>/g, '');
fs.writeFileSync('src/components/people/EmployeeProfile.tsx', profileCode);

fs.writeFileSync('src/domains/employees/service.ts', code);
console.log('Fixed service.ts');
