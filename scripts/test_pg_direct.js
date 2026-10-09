const { Client } = require('pg');

async function testInsert() {
  const client = new Client({
    connectionString: "postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos"
  });
  
  try {
    await client.connect();
    console.log("Connected");
    const query = `
      insert into "sales_returns" (
        "id", "organization_id", "location_id", "return_number", 
        "invoice_id", "return_date", "status", "total_amount", 
        "reason", "created_user_id", "created_at", "updated_at"
      ) values (
        default, $1, $2, $3, $4, $5, $6, $7, $8, $9, default, default
      ) returning "id"
    `;
    const values = [
      'b5334ab2-b652-432b-8c16-774c90406261', 
      'd7f7131b-58e4-4e28-b83f-95a9b2c111a3', 
      'RET-1791504853727', 
      '989cea1a-1bd4-4979-92b8-b4a59209b9ed', 
      '2026-10-07T00:00:00.000Z', 
      'APPROVED', 
      '225', 
      'Damaged Item', 
      'system'
    ];
    await client.query(query, values);
    console.log("Success");
  } catch (err) {
    console.error("PG ERROR:", err.message);
    console.error("PG ERROR DETAIL:", err.detail);
  } finally {
    await client.end();
  }
}

testInsert();
