import { getReceipts } from './src/domains/finance/receivables-service';

async function test() {
  try {
    const orgId = 'b5334ab2-b652-432b-8c16-774c90406261';
    console.log('Fetching receipts...');
    const result = await getReceipts(orgId, undefined, 1, 10);
    console.log('Result total:', result.total);
    console.log('Result data length:', result.data.length);
  } catch (e) {
    console.error('ERROR:', e.message);
  }
  process.exit(0);
}
test();
