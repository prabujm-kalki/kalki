const fs = require('fs');
let code = fs.readFileSync('src/domains/employees/service.ts', 'utf8');

// Strip out any remaining parsed.data.salary references
code = code.replace(/if\s*\(parsed\.data\.salary\s*!==\s*undefined\)\s*\{[\s\S]*?(?:hasSalaryChanged = true;)?\s*\}[\s\S]*?if\s*\(hasSalaryChanged\)\s*\{[\s\S]*?\}\s*\}/g, '');

// Sometimes it's a huge block. Let's just remove everything related to salary from proposeEmployeeChange
code = code.replace(/const existingSalaryData = await tx\.select\(\)\.from\(employeeSalaryInfo\)[\s\S]*?await tx\.insert\(employeeSalaryInfo\)[\s\S]*?\};\s*\}\s*\}/g, '');

// Also remove employeeSalaryInfo entirely
code = code.replace(/await tx\.update\(employeeSalaryInfo\)[\s\S]*?await tx\.insert\(employeeSalaryInfo\)\.values\(\{[\s\S]*?\}\);/g, '');

// And salary: salaryInputSchema.optional()
code = code.replace(/salary: salaryInputSchema\.optional\(\),/g, '');
code = code.replace(/salary: parsed\.data\.salary,/g, '');

// Just completely remove the word employeeSalaryInfo from the file to force errors into null or remove blocks
// But we want to preserve valid syntax
fs.writeFileSync('src/domains/employees/service.ts', code);
console.log('Fixed service.ts');
