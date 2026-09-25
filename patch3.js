const fs = require('fs');
let code = fs.readFileSync('src/domains/employees/service.ts', 'utf8');

// Strip out salaryInfoRows
code = code.replace(/const salaryInfoRows = await db\.select\(\)\.from\(employeeSalaryInfo\)[\s\S]*?\n/g, '');
code = code.replace(/salaryInfo: salaryInfoRows\[0\] \|\| null,\n/g, 'salaryInfo: null,\n');

// Strip out existingSalaryData
code = code.replace(/if \(parsed\.data\.salary !== undefined\) \{[\s\S]*?hasSalaryChanged = true;\n\s*\}\n\s*\}/g, 'const hasSalaryChanged = false;');
code = code.replace(/if \(hasSalaryChanged\) \{[\s\S]*?await tx\.insert\(employeeSalaryInfo\)\.values\(\{[\s\S]*?\}\);\n\s*\}/g, '');

// Strip out salary check for activation
code = code.replace(/const salaryInfo = await tx\.select\(\)\.from\(employeeSalaryInfo\)\.where[\s\S]*?\}\n/g, '');

// Strip out setEmployeeSalaryInfo entirely
code = code.replace(/export async function setEmployeeSalaryInfo[\s\S]*?\}\n\}/g, '');

fs.writeFileSync('src/domains/employees/service.ts', code);
console.log('Fixed service.ts');
