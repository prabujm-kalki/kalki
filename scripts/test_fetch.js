const { db } = require('../src/db/index');
const { fetchInvoices } = require('../src/app/sales/actions');

async function run() {
  const orgId = "b5334ab2-b652-432b-8c16-774c90406261";
  const locId = "d7f7131b-58e4-4e28-b83f-95a9b2e111a3";
  const custId = "6ff4ea17-9096-4aa4-8387-156c786573b7"; // Acme Corp

  console.log("Fetching invoices...");
  const res = await fetchInvoices(orgId, locId, custId);
  console.log(res);
}

run().catch(console.error).finally(() => process.exit(0));
