const fs = require('fs');

let code = fs.readFileSync('src/domains/integrations/tmbill.service.ts', 'utf8');

const targetStr = `invoiceNumber: "TM-" + String(order.tmbillOrderDisplayId || order.tmbillOrderId),`;
const newStr = `invoiceNumber: "TM-" + String(order.tmbillOrderId),`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, newStr);
  fs.writeFileSync('src/domains/integrations/tmbill.service.ts', code);
  console.log('Fixed invoiceNumber to use globally unique tmbillOrderId');
} else {
  console.log('Could not find target string');
}
