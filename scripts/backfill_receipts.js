const { db } = require('../src/db/index.js');
const { salesInvoices, salesReceipts } = require('../src/db/schema.js');
const { eq, and } = require('drizzle-orm');
const { randomUUID } = require('crypto');

async function run() {
  console.log("Starting backfill for missing receipts...");
  
  try {
    // Find all invoices that are PAID
    const invoices = await db.select()
      .from(salesInvoices)
      .where(eq(salesInvoices.paymentStatus, 'PAID'));
    
    console.log(`Found ${invoices.length} PAID invoices.`);
    
    let inserted = 0;
    
    for (const inv of invoices) {
      // Check if receipt already exists for this invoice
      const existing = await db.select()
        .from(salesReceipts)
        .where(eq(salesReceipts.receiptNumber, `REC-${inv.invoiceNumber}`));
        
      if (existing.length === 0) {
        await db.insert(salesReceipts).values({
          id: randomUUID(),
          organizationId: inv.organizationId,
          locationId: inv.locationId,
          customerId: inv.customerId,
          receiptNumber: `REC-${inv.invoiceNumber}`,
          receiptDate: inv.invoiceDate || new Date(),
          amount: inv.grandTotal || inv.totalAmount || "0",
          paymentMethod: inv.paymentMode || "SYSTEM_SYNC_BACKFILL",
        });
        inserted++;
      }
    }
    
    console.log(`Successfully backfilled ${inserted} missing receipts.`);
  } catch (error) {
    console.error("Backfill failed:", error);
  }
  
  process.exit(0);
}

run();
