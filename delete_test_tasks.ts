import 'dotenv/config';
import { db } from './src/db';
import { taskInstances } from './src/db/schema';
import { inArray } from 'drizzle-orm';

async function run() {
  try {
    console.log("Clearing Kalki Fresh test tasks for today...");
    await db.delete(taskInstances).where(
      inArray(taskInstances.id, [
        "5d749eab-1906-402d-9b5e-179113168960",
        "c2160c74-8140-44f4-851a-e8461f7d4a9a"
      ])
    );
    console.log("Tasks deleted.");
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
run();
