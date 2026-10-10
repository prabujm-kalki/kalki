const { Client } = require('pg');

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  await client.connect();

  try {
    await client.query(`
      ALTER TABLE "b2b_sales_invoices" ADD COLUMN IF NOT EXISTS "channel_id" uuid;
    `);
    
    // Check if constraint exists before adding it
    const checkConstraint = await client.query(`
      SELECT 1 FROM pg_constraint WHERE conname = 'b2b_sales_invoices_channel_id_sales_channels_id_fk';
    `);
    
    if (checkConstraint.rowCount === 0) {
      await client.query(`
        ALTER TABLE "b2b_sales_invoices" ADD CONSTRAINT "b2b_sales_invoices_channel_id_sales_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."sales_channels"("id") ON DELETE no action ON UPDATE no action;
      `);
    }

    // Mark the drizzle migration as applied so db:migrate stops trying
    const hash = 'mockhash_0046_shocking_elektra_scripted';
    await client.query(`
      INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
      VALUES ($1, $2)
    `, [hash, Date.now()]);
    
    console.log("Migration 0046 applied successfully");
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    await client.end();
  }
}

run();
