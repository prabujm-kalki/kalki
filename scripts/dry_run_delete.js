const { Client } = require('pg');

async function run() {
  const c = new Client({ connectionString: 'postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos' });
  await c.connect();

  const locationId = '467e6ec4-e7c0-4b24-8aeb-4e641f849da2'; // Avalpoondurai Department Store
  
  // Select all pending invoices for this location (test data)
  const query = `
    SELECT id, invoice_number, customer_name, grand_total, issue_date 
    FROM b2b_sales_invoices 
    WHERE location_id = $1 
      AND payment_status = 'PENDING' 
      AND tmbill_raw_data IS NULL
  `;
  const res = await c.query(query, [locationId]);
  
  console.log("=== DRY RUN PREVIEW ===");
  console.log(`Found ${res.rowCount} test invoices to delete in Avalpoondurai Department Store.`);
  console.log("-------------------------------------------------------------------------");
  
  const ids = [];
  res.rows.forEach(r => {
    ids.push(r.id);
    console.log(`Invoice: ${r.invoice_number} | Customer: ${r.customer_name} | Total: ₹${r.grand_total} | Date: ${r.issue_date}`);
  });
  
  console.log("-------------------------------------------------------------------------");
  console.log("To delete these, we will run:");
  console.log(`DELETE FROM b2b_sales_invoice_lines WHERE invoice_id IN (...${ids.length} ids...)`);
  console.log(`DELETE FROM b2b_sales_invoices WHERE id IN (...${ids.length} ids...)`);
  
  console.log("\nINVOICE_IDS_FOR_DELETION = " + JSON.stringify(ids));

  await c.end();
}
run();
