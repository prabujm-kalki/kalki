const { db } = require('./src/db');
const { salesTransactions } = require('./src/db/schema');
const { and, eq, gte, lte } = require('drizzle-orm');

async function testStats() {
  const locationId = "d7f7131b-58e4-4e28-a4de-9b216c5b9649"; // from the URL in screenshot
  
  const now = new Date();
  
  // Business day starts at 6 AM
  let startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 6, 0, 0, 0);
  if (now.getHours() < 6) {
    startOfToday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
  }
  const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000 - 1);
  
  console.log("startOfToday:", startOfToday.toISOString());
  console.log("endOfToday:", endOfToday.toISOString());
  
  const txs = await db
    .select({ netAmount: salesTransactions.netAmount, billTimestamp: salesTransactions.billTimestamp })
    .from(salesTransactions)
    .where(
      and(
        eq(salesTransactions.locationId, locationId),
        gte(salesTransactions.billTimestamp, startOfToday),
        lte(salesTransactions.billTimestamp, endOfToday)
      )
    );
    
  console.log("Count:", txs.length);
  const total = txs.reduce((sum, tx) => sum + Number(tx.netAmount), 0);
  console.log("Total Amount:", total);
  
  process.exit(0);
}

testStats().catch(console.error);
