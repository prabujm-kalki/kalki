const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos' });
pool.query("ALTER TABLE organizations ADD COLUMN IF NOT EXISTS primary_sales_source TEXT DEFAULT 'Hybrid';").then(() => {
  console.log('Column added');
  process.exit(0);
}).catch(e => {
  console.error(e);
  process.exit(1);
});
