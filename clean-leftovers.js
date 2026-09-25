const fs = require('fs');
let code = fs.readFileSync('src/domains/employees/service.ts', 'utf8').split('\n');

for (let i = 0; i < code.length; i++) {
  const line = code[i];
  if (line.includes('salaryInputSchema')) {
    code[i] = '// ' + line;
  }
  if (line.includes('employeeSalaryInfo') || line.includes('employeeHistorySalary')) {
    code[i] = '// ' + line;
  }
}

fs.writeFileSync('src/domains/employees/service.ts', code.join('\n'));
