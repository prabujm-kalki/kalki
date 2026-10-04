import 'dotenv/config';
import { generateRoutinePurchaseTasks } from './src/domains/purchasing/purchaseScheduleTasks';

async function run() {
  try {
    const res = await generateRoutinePurchaseTasks();
    console.log(res);
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
run();
