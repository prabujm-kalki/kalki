const fs = require('fs');
let code = fs.readFileSync('src/domains/employees/service.ts', 'utf8').split('\n');

for(let i = 0; i < code.length; i++) {
  if (code[i].includes('salaryInfoRows')) code[i] = '';
  if (code[i].includes('salaryHistory')) code[i] = '';
  if (code[i].includes('employeeSalaryInfo')) code[i] = '';
  if (code[i].includes('setEmployeeSalaryInfo')) {
     if (code[i].includes('export async function')) {
         // wait this is a function definition.
     }
  }
}
fs.writeFileSync('src/domains/employees/service.ts', code.join('\n'));

// Now we need to remove setEmployeeSalaryInfo entirely.
let fullCode = fs.readFileSync('src/domains/employees/service.ts', 'utf8');
fullCode = fullCode.replace(/export async function setEmployeeSalaryInfo\([\s\S]*?\n\}\n/g, '');
fs.writeFileSync('src/domains/employees/service.ts', fullCode);
