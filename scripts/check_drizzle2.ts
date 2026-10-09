import { db } from './src/db';
import { salesInvoices } from './src/db/schema';
import { inArray } from 'drizzle-orm';
async function run() {
  const data = await db.select({ invoiceDate: salesInvoices.invoiceDate }).from(salesInvoices).where(inArray(salesInvoices.paymentStatus, ['PENDING'])).limit(1);
  console.log(typeof data[0].invoiceDate, data[0].invoiceDate);
  process.exit();
}
run();
