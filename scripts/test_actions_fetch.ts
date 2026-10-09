const { fetchInvoices } = require('./src/app/sales/actions');

async function test() {
  const list = await fetchInvoices('b5334ab2-b652-432b-8c16-774c90406261', 'd7f7131b-58e4-4e28-b83f-95a9b2e111a3', '6ff4ea17-9096-4aa4-8387-156c786573b7');
  console.log(list);
}

test();
