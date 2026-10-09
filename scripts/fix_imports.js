const fs = require('fs');

let code = fs.readFileSync('src/domains/integrations/tmbill.service.ts', 'utf8');

// Using regex to replace avoiding CRLF issues
code = code.replace(/salesOrderLines\r?\n\} from "@\/db\/schema";/, 
`salesOrderLines,
  salesInvoices,
  salesInvoiceLines,
  customers
} from "@/db/schema";`);

fs.writeFileSync('src/domains/integrations/tmbill.service.ts', code);
console.log('Fixed missing imports in tmbill.service.ts');
