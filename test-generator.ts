import { generateRoutinePurchaseTasks } from './src/domains/purchasing/purchaseScheduleTasks';

async function test() {
  console.log('Running generator...');
  const res = await generateRoutinePurchaseTasks();
  console.log('Result:', res);
  process.exit(0);
}

test().catch(console.error);
