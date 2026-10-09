const fs = require('fs');

let code = fs.readFileSync('src/app/sales/actions.ts', 'utf8');

code = code.replace(
  'paymentStatus: "PENDING",',
  'paymentStatus: paymentTerms === "Cash" ? "PAID" : "PENDING",'
);

fs.writeFileSync('src/app/sales/actions.ts', code);
console.log('Fixed paymentStatus logic in createB2BInvoice action');
