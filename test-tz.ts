import { db } from './src/db';
import { purchaseSchedules } from './src/db/schema';

async function test() {
  const allSchedules = await db.select().from(purchaseSchedules);
  
  const now = new Date();
  const currentHours = now.getHours().toString().padStart(2, '0');
  const currentMinutes = now.getMinutes().toString().padStart(2, '0');
  const currentTimeStr = `${currentHours}:${currentMinutes}`;
  
  console.log('Current Time:', currentTimeStr);
  console.log('Now ISO:', now.toISOString());
  console.log('Now toString:', now.toString());

  for (const schedule of allSchedules) {
    console.log(`Schedule ${schedule.id} | Rule: ${schedule.frequencyRule} | Reminder: ${schedule.reminderTime}`);
    const rule = schedule.frequencyRule.toUpperCase();
    console.log(`Is currentTimeStr < reminderTime?`, currentTimeStr < schedule.reminderTime);
    console.log(`Rule uppercase:`, rule);
  }
  process.exit(0);
}

test().catch(console.error);
