const fs = require('fs');
let code = fs.readFileSync('src/domains/employees/service.ts', 'utf8').split('\n');

for(let i=0; i<code.length; i++) {
  if (code[i].includes('employeeHistorySalary,')) code[i] = code[i].replace('employeeHistorySalary,', '');
  if (code[i].includes('employeeSalaryInfo,')) code[i] = code[i].replace('employeeSalaryInfo,', '');
  if (code[i].includes('export const salaryInputSchema = z.object({')) {
     for(let j=i; j<i+25; j++) {
        if (code[j] && code[j].includes('export type SalaryInput')) {
           for(let k=i; k<=j; k++) code[k] = '';
           break;
        }
     }
  }
  if (code[i].includes('salary: salaryInputSchema.optional(),')) code[i] = '';
  
  if (code[i].includes('await tx.insert(employeeSalaryInfo)')) {
     code[i] = ''; // remove insert
     for (let j=i+1; j<i+20; j++) {
       const l = code[j];
       code[j] = '';
       if (l.includes('});')) break;
     }
  }
  if (code[i].includes('await tx.insert(employeeHistorySalary)')) {
     code[i] = ''; // remove insert
     for (let j=i+1; j<i+20; j++) {
       const l = code[j];
       code[j] = '';
       if (l.includes('});')) break;
     }
  }
  if (code[i].includes('const salaryInfoRows = await db.select().from(employeeSalaryInfo)')) code[i] = '';
  if (code[i].includes('const salaryHistory = await db.select().from(employeeHistorySalary)')) code[i] = '';
  if (code[i].includes('salaryInfo: salaryInfoRows[0] ?? null,')) code[i] = '';
  if (code[i].includes('salary: salaryHistory,')) code[i] = '';
  if (code[i].includes('await tx.update(employeeSalaryInfo).set({ isActive: false')) code[i] = '';
  
  if (code[i].includes('export async function setEmployeeSalaryInfo')) {
     code[i] = '';
     let braces = 1;
     for (let j=i+1; j<code.length; j++) {
        braces += (code[j].match(/\{/g) || []).length;
        braces -= (code[j].match(/\}/g) || []).length;
        const l = code[j];
        code[j] = '';
        if (braces === 0) break;
     }
  }
}

// We also need to fix proposeEmployeeChange which has salary validations
for(let i=0; i<code.length; i++) {
  if (code[i] && code[i].includes('if (parsed.data.salary !== undefined) {')) {
     code[i] = '';
     let braces = 1;
     for (let j=i+1; j<code.length; j++) {
        braces += (code[j].match(/\{/g) || []).length;
        braces -= (code[j].match(/\}/g) || []).length;
        const l = code[j];
        code[j] = '';
        if (braces === 0) break;
     }
  }
  if (code[i] && code[i].includes('salary: parsed.data.salary,')) code[i] = '';
}

// Also the getEmployee check for salary:
for(let i=0; i<code.length; i++) {
   if (code[i] && code[i].includes('const salaryInfo = await tx.select().from(employeeSalaryInfo)')) {
       code[i] = '';
       for(let j=i+1; j<i+20; j++) {
           const l = code[j];
           code[j] = '';
           if (l.includes('}')) {
              // wait, the block is:
              // if (salaryInfo.length === 0) { throw ... }
              // if (salaryInfo[0]) {
              //    if (...) throw ...
              // }
           }
       }
   }
}

fs.writeFileSync('src/domains/employees/service.ts', code.join('\n'));
