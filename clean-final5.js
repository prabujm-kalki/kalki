const fs = require('fs');
let code = fs.readFileSync('src/domains/employees/service.ts', 'utf8').split('\n');
for(let i=0; i<code.length; i++) {
  if (code[i].includes('if (salaryInfo[0]) {')) {
     code[i] = '';
  }
}
fs.writeFileSync('src/domains/employees/service.ts', code.join('\n'));
