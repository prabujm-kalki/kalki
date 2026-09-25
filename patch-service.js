const fs = require('fs');
let code = fs.readFileSync('src/domains/employees/service.ts', 'utf8');

// 1. Remove salary fields from salaryInputSchema
code = code.replace(/salaryType: z\.enum\(\["Daily", "Weekly", "Monthly"\]\),\s*/, '');
code = code.replace(/amount: z\.string\(\)\.regex\(\/\^\\\\d\+\(\\\\\\.\\\\d\{1,2\}\)\?\$\/\),\s*/, '');

// 2. Remove salary validation requirement
code = code.replace(/salary: salaryInputSchema\.optional\(\),/g, '');

// 3. Remove insertions of employeeSalaryInfo completely? No, let's just remove the exact columns.
code = code.replace(/salaryType: parsed\.data\.salary\.salaryType \?\? "Monthly",\s*/g, '');
code = code.replace(/amount: parsed\.data\.salary\.amount \?\? "0",\s*/g, '');
code = code.replace(/effectiveFrom: parsed\.data\.employmentStartDate \? new Date\(parsed\.data\.employmentStartDate\)\.toISOString\(\) : new Date\(\)\.toISOString\(\),\s*/g, '');

// 4. Remove employeeHistorySalary insertions
code = code.replace(/await tx\.insert\(employeeHistorySalary\)\.values\(\{[\s\S]*?\}\);/g, '');

// 5. Remove imports of employeeHistorySalary
code = code.replace(/employeeHistorySalary,/g, '');

fs.writeFileSync('src/domains/employees/service.ts', code);
console.log('Fixed service.ts');
