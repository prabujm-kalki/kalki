const fs = require('fs');
let code = fs.readFileSync('src/domains/employees/service.ts', 'utf8').split('\n');

for(let i=0; i<code.length; i++) {
   if (code[i].trim() === 'if (salaryInfo[0]) {') {
      code[i] = ''; // remove if
      // now find the matching closing brace and remove it
      let braceCount = 1;
      for(let j=i+1; j<code.length; j++) {
         braceCount += (code[j].match(/\{/g) || []).length;
         braceCount -= (code[j].match(/\}/g) || []).length;
         if (braceCount === 0) {
            code[j] = ''; // remove closing brace
            break;
         }
      }
   }
}
fs.writeFileSync('src/domains/employees/service.ts', code.join('\n'));
