const fs = require('fs');

let code = fs.readFileSync('src/domains/integrations/tmbill.service.ts', 'utf8');

const targetStr = `await tx.insert(salesInvoices).values({`;
const newStr = `try {
          await tx.insert(salesInvoices).values({`;
          
const targetEnd = `createdUserId: userId
        });`;
const newEnd = `createdUserId: userId
        });
        } catch (e: any) {
          console.error("POSTGRES INSERT ERROR DETAILS:", e, e.detail, e.code);
          throw new Error("PG_ERROR: " + (e.detail || e.message));
        }`;

code = code.replace(targetStr, newStr);
code = code.replace(targetEnd, newEnd);

fs.writeFileSync('src/domains/integrations/tmbill.service.ts', code);
console.log('Added try-catch logging');
