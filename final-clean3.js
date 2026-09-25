const fs = require('fs');
let code = fs.readFileSync('src/domains/employees/service.ts', 'utf8').split('\n');
for(let i = 0; i < code.length; i++) {
  if (code[i].includes('salaryInfo')) {
     if (code[i].trim() === 'if (salaryInfo.length === 0) {') {
        code[i] = '';
        code[i+1] = '';
        code[i+2] = '';
     }
  }
}
fs.writeFileSync('src/domains/employees/service.ts', code.join('\n'));
