const fs = require('fs');
let code = fs.readFileSync('src/db/schema.ts', 'utf8');
code = code.replace(
  'aadhaarDocumentUrl: text("aadhaar_document_url"),',
  'aadhaarNumber: varchar("aadhaar_number", { length: 20 }),\n    aadhaarDocumentUrl: text("aadhaar_document_url"),'
);
fs.writeFileSync('src/db/schema.ts', code);
console.log(code.includes('aadhaarNumber'));
