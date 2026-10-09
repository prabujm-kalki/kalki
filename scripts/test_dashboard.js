const { db } = require('./src/db/index.js');
const { sql } = require('drizzle-orm');

async function testDashboardQuery() {
  const organizationId = "b5334ab2-b652-432b-8c16-774c90406261";
  const locationId = "467e6ec4-e7c0-4b24-8aeb-4e641f849da2";
  const startDate = "2026-10-01";
  const endDate = "2026-10-08";

  const locFilterB2B = locationId === "ALL" ? sql`organization_id = ${organizationId}` : sql`organization_id = ${organizationId} AND location_id = ${locationId}`;
  const dateFilterB2B = sql`issue_date >= ${new Date(startDate).toISOString()} AND issue_date <= ${new Date(endDate + 'T23:59:59Z').toISOString()}`;
  
  const unifiedSql = sql`
    SELECT 
      id as id,
      invoice_number as identifier,
      issue_date as date,
      grand_total as amount,
      customer_name as customer,
      payment_status as status,
      CASE WHEN tmbill_raw_data IS NOT NULL THEN 'TMBILL_IMPORT' ELSE 'KALKI_B2B' END as source
    FROM b2b_sales_invoices
    WHERE ${locFilterB2B} AND ${dateFilterB2B}
  `;

  const unifiedQuery = sql`WITH unified_sales AS (${unifiedSql})`;

  try {
    const totalSalesRes = await db.execute(sql`${unifiedQuery} SELECT SUM(amount) as val FROM unified_sales`);
    console.log("Total Sales:", totalSalesRes);
    
    const countRes = await db.execute(sql`${unifiedQuery} SELECT COUNT(*) as val FROM unified_sales`);
    console.log("Total Count:", countRes);
    
    const sample = await db.execute(sql`${unifiedQuery} SELECT * FROM unified_sales LIMIT 3`);
    console.log("Sample:", sample);
  } catch(e) {
    console.log("Error:", e);
  }
}
testDashboardQuery();
