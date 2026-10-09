import { getReceivablesSummary } from '../src/domains/finance/receivables-service';

async function run() {
  try {
    const data = await getReceivablesSummary('df38b7ff-3abf-40e8-a83d-3f04499b9cf9'); // using default organization ID
    console.log(data);
  } catch (e) {
    console.error(e);
  }
}
run();
