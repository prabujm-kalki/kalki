const { Client } = require('pg');

async function testDashboardQuery() {
  const client = new Client({
    connectionString: 'postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos'
  });
  await client.connect();
  
  const query = `
    WITH unified_sales AS (
      SELECT issue_date as date, grand_total as amount FROM b2b_sales_invoices LIMIT 10
    )
    SELECT 
      to_char(date, $1) as label,
      SUM(amount) as sales
    FROM unified_sales
    GROUP BY 1
    ORDER BY 1
  `;

  try {
    const res = await client.query(query, ['YYYY-MM']);
    console.log("Success!:", res.rows);
  } catch(e) {
    console.log("Error:", e.message);
  }
  
  await client.end();
}
testDashboardQuery();
