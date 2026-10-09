const { Client } = require('pg');

async function testDashboardQuery() {
  const client = new Client({
    connectionString: 'postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos'
  });
  await client.connect();
  
  const organizationId = "b5334ab2-b652-432b-8c16-774c90406261";
  const locationId = "467e6ec4-e7c0-4b24-8aeb-4e641f849da2";
  const startDate = new Date("2026-10-01").toISOString();
  const endDate = new Date("2026-10-08T23:59:59Z").toISOString();

  const query = `
    SELECT count(*), sum(grand_total) 
    FROM b2b_sales_invoices
    WHERE organization_id = $1 
      AND location_id = $2
      AND issue_date >= $3 
      AND issue_date <= $4
  `;

  try {
    const res = await client.query(query, [organizationId, locationId, startDate, endDate]);
    console.log("Raw SQL Result for Oct 1 to Oct 8:", res.rows);
  } catch(e) {
    console.log("Error:", e);
  }
  
  // Also check without location
  const queryNoLoc = `
    SELECT count(*), sum(grand_total) 
    FROM b2b_sales_invoices
    WHERE organization_id = $1 
      AND issue_date >= $2 
      AND issue_date <= $3
  `;
  const resNoLoc = await client.query(queryNoLoc, [organizationId, startDate, endDate]);
  console.log("Without location filter:", resNoLoc.rows);
  
  await client.end();
}
testDashboardQuery();
