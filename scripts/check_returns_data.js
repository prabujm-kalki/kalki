import { db } from './src/db/index.js';
import { salesInvoices, salesInvoiceLines, salesReturns, salesReturnLines } from './src/db/schema.js';
import { eq, sql } from 'drizzle-orm';

async function check() {
  const invoices = await db.select().from(salesInvoices).where(sql`invoice_number ILIKE '%29%'`);
  if (invoices.length === 0) {
    console.log("Invoice 29 not found");
    return;
  }
  const invoice = invoices[0];
  console.log("Invoice ID:", invoice.id);
  
  const lines = await db.select().from(salesInvoiceLines).where(eq(salesInvoiceLines.invoiceId, invoice.id));
  console.log("Invoice Lines:", lines.map(l => ({ itemId: l.itemId, desc: l.itemDescription, qty: l.quantity })));
  
  const returns = await db.select().from(salesReturns).where(eq(salesReturns.invoiceId, invoice.id));
  console.log("Returns for invoice:", returns.map(r => ({ id: r.id, status: r.status })));
  
  if (returns.length > 0) {
    for (const r of returns) {
      const rlines = await db.select().from(salesReturnLines).where(eq(salesReturnLines.returnId, r.id));
      console.log(`Return Lines for ${r.id}:`, rlines.map(rl => ({ itemId: rl.itemId, qty: rl.returnQty })));
    }
  }
  process.exit(0);
}
check();
