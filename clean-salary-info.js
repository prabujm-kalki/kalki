const fs = require('fs');
let code = fs.readFileSync('src/domains/employees/service.ts', 'utf8').split('\n');

for(let i=0; i<code.length; i++) {
  if (code[i].includes('if (salaryInfo[0]) {')) {
     code[i] = '';
     code[i+1] = '';
     code[i+2] = '';
     code[i+3] = '';
     code[i+4] = '';
  }
}
fs.writeFileSync('src/domains/employees/service.ts', code.join('\n'));
