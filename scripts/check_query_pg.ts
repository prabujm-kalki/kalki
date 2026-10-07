import { Client } from "pg";

async function main() {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  try {
    const res = await c.query(`SELECT count(*) FROM "journal_entries" where ("journal_entries"."organization_id" = '00000000-0000-0000-0000-000000000000' and "journal_entries"."status" = 'PENDING_APPROVAL')`);
    console.log("Success:", res.rows);
  } catch (e: any) {
    console.log("PG ERROR Message:", e.message);
    console.log("PG ERROR Code:", e.code);
  } finally {
    await c.end();
  }
}
main();
