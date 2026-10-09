const fs = require('fs');

let code = fs.readFileSync('src/domains/integrations/tmbill.service.ts', 'utf8');

// Add "TM-" prefix to the invoiceNumber mapping
const targetStr = `invoiceNumber: String(order.tmbillOrderDisplayId || order.tmbillOrderId),`;
const replacementStr = `invoiceNumber: "TM-" + String(order.tmbillOrderDisplayId || order.tmbillOrderId),`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replacementStr);
  fs.writeFileSync('src/domains/integrations/tmbill.service.ts', code);
  console.log('Fixed invoiceNumber collision');
} else {
  console.log('Target string not found');
}
