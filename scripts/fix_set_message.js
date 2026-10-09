const fs = require('fs');
let code = fs.readFileSync('src/components/sales/B2BBilling.tsx', 'utf8');

// Replace setMessage with setInvoiceSuccess
code = code.replace(/setMessage\(/g, 'setInvoiceSuccess(');

// Replace alert("Error generating invoice...") with setInvoiceError
code = code.replace(/alert\("Error generating invoice: " \+ err.message\);/g, 'setInvoiceError("Error generating invoice: " + err.message);');

fs.writeFileSync('src/components/sales/B2BBilling.tsx', code);
console.log('Fixed undefined setMessage in B2BBilling.tsx');
