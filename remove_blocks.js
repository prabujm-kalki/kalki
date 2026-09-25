const fs = require('fs');
let code = fs.readFileSync('src/domains/employees/service.ts', 'utf8');

// The blocks to remove
code = code.replace(/    if \\(parsed\\.data\\.salary !== undefined\\) \\{[\\s\\S]*?\\}\\s*\\}\\s*\\}/g, '');
code = code.replace(/    if \\(parsed\\.data\\.salary\\) \\{[\\s\\S]*?\\}\\s*\\}/g, '');
code = code.replace(/      const salaryInfo = await tx\\.select\\(\\)\\.from\\(employeeSalaryInfo\\)[\\s\\S]*?\\}\\s*\\}\\s*\\}/g, '');
code = code.replace(/    \\/\\/ Salary update\\s*if \\(payload\\.salary\\) \\{[\\s\\S]*?\\}\\s*\\}/g, '');

fs.writeFileSync('src/domains/employees/service.ts', code);
console.log('Done');
