const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos' });

pool.query('select "id" from "customers" where ("customers"."organization_id" = $1::uuid and "customers"."name" ilike $2) limit $3', ['b5334ab2-b652-432b-8c16-774c90406261', '%%', 20])
  .then(res => {
    console.log(res.rows);
    process.exit(0);
  }).catch(e => {
    console.error(e);
    process.exit(1);
  });
