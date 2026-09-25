const fs = require('fs');
let code = fs.readFileSync('src/domains/employees/service.ts', 'utf8');

// The cleanest way is to completely rip out the if (parsed.data.salary) { ... } blocks and employeeSalaryInfo entirely from service.ts since we decoupled it.

code = code.replace(/if\s*\([\w\.]+\.salary\)\s*\{\s*await tx\.insert\(employeeSalaryInfo\)\.values\(\{[\s\S]*?\}\);\s*\}/g, '');
code = code.replace(/if\s*\([\w\.]+\.salary\)\s*\{\s*await tx\.update\(employeeSalaryInfo\)\.set\(\{[\s\S]*?\}\)\.where\([\s\S]*?\);\s*await tx\.insert\(employeeSalaryInfo\)\.values\(\{[\s\S]*?\}\);\s*\}/g, '');

// Also rip out employeeSalaryInfo import
code = code.replace(/employeeSalaryInfo,/g, '');

fs.writeFileSync('src/domains/employees/service.ts', code);
console.log('Fixed service.ts');
