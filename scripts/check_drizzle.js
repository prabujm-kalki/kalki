const { Pool } = require('pg');
const { drizzle } = require('drizzle-orm/node-postgres');
const { sql, eq, and, ilike } = require('drizzle-orm');
const { pgTable, uuid, text } = require('drizzle-orm/pg-core');

const pool = new Pool({ connectionString: 'postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos' });
const db = drizzle(pool);

const customers = pgTable("customers", {
  id: uuid("id").primaryKey(),
  organizationId: uuid("organization_id"),
  name: text("name")
});

async function run() {
  try {
    const res = await db.select().from(customers).where(
      and(
        eq(customers.organizationId, sql`${'b5334ab2-b652-432b-8c16-774c90406261'}::uuid`),
        ilike(customers.name, `%%`)
      )
    ).limit(20);
    console.log(res);
  } catch (err) {
    console.error("ERROR:", err.message);
  }
  process.exit(0);
}
run();
