const fs = require('fs');
let code = fs.readFileSync('src/domains/employees/service.ts', 'utf8').split('\n');

let newCode = [];
let skipMode = false;

for(let i = 0; i < code.length; i++) {
  const line = code[i];

  // Remove lines containing these keywords completely
  if (line.includes('const salaryInfoRows =')) continue;
  if (line.includes('const salaryHistory =')) continue;
  if (line.includes('salaryInfoRows[0]')) continue;
  if (line.includes('salaryHistory:')) continue;
  
  if (line.includes('await tx.update(employeeSalaryInfo)')) continue;
  if (line.includes('await tx.insert(employeeSalaryInfo)')) continue;
  if (line.includes('await tx.insert(employeeHistorySalary)')) continue;
  if (line.includes('organizationId: emp.organizationId,')) { // probably part of an insert
    // actually, it's safer to just look at lines
  }
  
  // if it's the start of setEmployeeSalaryInfo, skip until closing brace of it
  if (line.includes('export async function setEmployeeSalaryInfo')) {
    skipMode = true;
    continue;
  }
  if (skipMode && line === '}') {
    skipMode = false;
    continue;
  }
  if (skipMode) continue;
  
  newCode.push(line);
}

// Write back
fs.writeFileSync('src/domains/employees/service.ts', newCode.join('\n'));
