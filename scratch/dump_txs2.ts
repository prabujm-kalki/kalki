import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

async function run() {
  const { db } = await import('../src/db/index');
  const { salesTransactions } = await import('../src/db/schema');
  
  const txs = await db.select().from(salesTransactions);
  
  // Group by day of billTimestamp (UTC date) just to see what TMBill sent for 10-06 vs 10-07
  let sumOct6 = 0;
  let countOct6 = 0;
  
  let sumOct7 = 0;
  let countOct7 = 0;

  for (const tx of txs) {
    const d = tx.billTimestamp.toISOString(); // e.g. 2026-10-06T...
    if (d.startsWith("2026-10-06")) {
      sumOct6 += Number(tx.netAmount);
      countOct6++;
    } else if (d.startsWith("2026-10-07")) {
      sumOct7 += Number(tx.netAmount);
      countOct7++;
    }
  }

  console.log(`Raw UTC Oct 6th: ${countOct6} bills, Sum: ${sumOct6}`);
  console.log(`Raw UTC Oct 7th: ${countOct7} bills, Sum: ${sumOct7}`);
  
  process.exit(0);
}

run().catch(console.error);
