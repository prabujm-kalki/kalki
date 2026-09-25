const fs = require('fs');
let code = fs.readFileSync('src/domains/employees/service.ts', 'utf8').split('\n');

for(let i=0; i<code.length; i++) {
  if (code[i].includes('const salaryInfoRows = await db.select().from(employeeSalaryInfo)')) code[i] = '';
  if (code[i].includes('const salaryHistory = await db.select().from(employeeHistorySalary)')) code[i] = '';
  if (code[i].includes('salaryInfo: salaryInfoRows[0] ?? null,')) code[i] = '';
  if (code[i].includes('salary: salaryHistory,')) code[i] = '';
}

fs.writeFileSync('src/domains/employees/service.ts', code.join('\n'));
