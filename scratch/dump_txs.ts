import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

async function run() {
  const { db } = await import('../src/db/index');
  const { salesTransactions } = await import('../src/db/schema');
  
  const now = new Date();
  
  let startHour = 2;
  let startMinute = 0;
  
  let startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), startHour, startMinute, 0, 0);
  if (now.getHours() < startHour || (now.getHours() === startHour && now.getMinutes() < startMinute)) {
    startOfToday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
  }
  const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000 - 1);

  console.log("startOfToday:", startOfToday.toISOString(), startOfToday.toLocaleString());
  console.log("endOfToday:", endOfToday.toISOString(), endOfToday.toLocaleString());

  const txs = await db.select().from(salesTransactions);
  console.log(`Total transactions in DB: ${txs.length}`);
  
  let inRange = 0;
  let outRange = 0;
  let sumInRange = 0;

  for (const tx of txs) {
    if (tx.billTimestamp >= startOfToday && tx.billTimestamp <= endOfToday) {
      inRange++;
      sumInRange += Number(tx.netAmount);
      console.log(`[IN]  ${tx.billNumber} | ${tx.billTimestamp.toISOString()} | amt: ${tx.netAmount}`);
    } else {
      outRange++;
      // console.log(`[OUT] ${tx.billNumber} | ${tx.billTimestamp.toISOString()} | amt: ${tx.netAmount}`);
    }
  }

  console.log(`In range: ${inRange}, Out of range: ${outRange}`);
  console.log(`Sum in range: ${sumInRange}`);
  
  process.exit(0);
}

run().catch(console.error);
