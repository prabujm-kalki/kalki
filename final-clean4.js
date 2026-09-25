const fs = require('fs');
let code = fs.readFileSync('src/domains/employees/service.ts', 'utf8');
code = code.replace(/export async function setEmployeeSalaryInfo\([\s\S]*?\n\}\n/g, ''); // Still might not work if there's multiple braces
const lines = code.split('\n');
let inside = false;
let braceCount = 0;
for(let i=0; i<lines.length; i++) {
  if(lines[i].includes('export async function setEmployeeSalaryInfo')) {
    inside = true;
  }
  if(inside) {
    braceCount += (lines[i].match(/\{/g) || []).length;
    braceCount -= (lines[i].match(/\}/g) || []).length;
    lines[i] = '';
    if(braceCount === 0) {
      inside = false;
    }
  }
}
fs.writeFileSync('src/domains/employees/service.ts', lines.join('\n'));
