const { Client } = require('pg');

async function run() {
  const c = new Client({ connectionString: 'postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos' });
  await c.connect();

  const ids = ["b589bdae-ed9a-40c4-94f7-f1170bb77a4f","ef07df96-2a8b-4351-a537-f27a44a10386","2dd4ddaf-afa7-410b-a7d8-f1f5adfe880f","e6a98007-2127-4959-b370-05c95bde058a","83a9ce0e-1373-4bf6-bc6d-d672b019384e","f07955f5-a409-4696-adf9-de90feb54f1d","90345388-9068-41a1-9402-4dd8f332f419","7a2aeb5b-6394-4a56-ab15-be7b0e6d9f08","65f4c819-0c05-4b78-8139-154993eeaa47","49b89638-4e3e-452a-8aff-5e869345b281","1c68bef0-8e94-475b-a7d1-c7318e5d0021"];
  
  // Need to build the IN clause with $1, $2, etc.
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');

  try {
    console.log(`Deleting ${ids.length} invoice lines...`);
    const linesRes = await c.query(`DELETE FROM b2b_sales_invoice_lines WHERE invoice_id IN (${placeholders})`, ids);
    console.log(`Deleted ${linesRes.rowCount} lines.`);

    console.log(`Deleting ${ids.length} invoices...`);
    const invRes = await c.query(`DELETE FROM b2b_sales_invoices WHERE id IN (${placeholders})`, ids);
    console.log(`Deleted ${invRes.rowCount} invoices.`);

  } catch (err) {
    console.error("Deletion failed:", err);
  } finally {
    await c.end();
  }
}
run();
