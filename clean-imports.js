const fs = require('fs');
let code = fs.readFileSync('src/domains/employees/service.ts', 'utf8');

const stringsToRemove = [
  '  employeeSalaryInfo,\n',
  '  employeeHistorySalary, ',
  'employeeHistorySalary, ',
  'employeeSalaryInfo, ',
];

stringsToRemove.forEach(str => {
  code = code.replace(str, '');
});

fs.writeFileSync('src/domains/employees/service.ts', code);
