const fs = require('fs');
const code = fs.readFileSync('src/domains/employees/service.ts', 'utf8').split('\n');
const lines = [528, 529, 548, 549, 853, 854, 883, 884, 1188, 1189, 1203, 1204, 1228, 1229, 1276, 1277];
for (let l of lines) {
  if (code[l]) console.log(${l+1}: );
}
