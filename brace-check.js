const fs = require('fs');
let code = fs.readFileSync('src/domains/employees/service.ts', 'utf8').split('\n');

let balance = 0;
for(let i=810; i<1000; i++) {
  if (code[i] === undefined) break;
  let open = (code[i].match(/\{/g) || []).length;
  let close = (code[i].match(/\}/g) || []).length;
  balance += open - close;
  if (balance < 0) {
     console.log(Balance negative at line : );
     break;
  }
}
