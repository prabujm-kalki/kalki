import { fetchSalesReportData } from '../src/app/sales/reports/actions';
async function test() {
  const res = await fetchSalesReportData('b5334ab2-b652-432b-8c16-774c90406261', 'all', undefined, undefined, 1, 15, 'Dine-in');
  console.log('Returned invoices:', res.invoices.length);
  process.exit(0);
}
test().catch(console.error);
