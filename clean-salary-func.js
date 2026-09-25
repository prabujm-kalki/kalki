const fs = require('fs');
let code = fs.readFileSync('src/domains/employees/service.ts', 'utf8').split('\n');
code.splice(1292, 1364 - 1293 + 1); // Delete lines 1293 to 1364
fs.writeFileSync('src/domains/employees/service.ts', code.join('\n'));
