const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos' });

async function run() {
  await client.connect();
  const q = `
    INSERT INTO crm_customer_profiles (
      organization_id, customer_id, preferred_location_id, recency_days, frequency_orders, monetary_spend, rfm_segment, priority_score, lifecycle_stage, churn_risk_percentage, last_calculated_at, created_at, updated_at
    )
    SELECT 
      c.organization_id,
      c.id,
      loc.location_id,
      COALESCE(loc.recency_days, 999),
      COALESCE(loc.frequency, 0),
      COALESCE(loc.monetary, 0.00),
      CASE 
        WHEN loc.frequency >= 5 AND loc.monetary >= 5000 AND loc.recency_days <= 30 THEN 'CHAMPIONS'
        WHEN loc.frequency >= 3 AND loc.recency_days <= 45 THEN 'LOYAL'
        WHEN loc.recency_days > 60 AND loc.recency_days <= 120 AND loc.frequency >= 2 THEN 'AT_RISK'
        WHEN loc.recency_days > 120 THEN 'DORMANT'
        ELSE 'NEW'
      END as rfm_segment,
      CASE 
        WHEN loc.frequency >= 5 AND loc.monetary >= 5000 AND loc.recency_days <= 30 THEN 95
        WHEN loc.frequency >= 3 AND loc.recency_days <= 45 THEN 80
        WHEN loc.recency_days > 60 AND loc.recency_days <= 120 AND loc.frequency >= 2 THEN 70
        WHEN loc.recency_days > 120 THEN 35
        ELSE 50
      END as priority_score,
      CASE 
        WHEN loc.frequency >= 3 THEN 'ACTIVE'
        WHEN loc.recency_days > 60 AND loc.recency_days <= 120 THEN 'AT_RISK'
        WHEN loc.recency_days > 120 THEN 'DORMANT'
        ELSE 'NEW'
      END as lifecycle_stage,
      10.00,
      now(),
      now(),
      now()
    FROM customers c
    LEFT JOIN LATERAL (
      SELECT 
        b.location_id,
        count(*) as frequency,
        sum(b.total_amount::numeric) as monetary,
        EXTRACT(DAY FROM (now() - max(b.invoice_date)))::int as recency_days
      FROM b2b_sales_invoices b
      WHERE b.customer_id = c.id
      GROUP BY b.location_id
      ORDER BY count(*) DESC, max(b.invoice_date) DESC
      LIMIT 1
    ) loc ON true
    ON CONFLICT (customer_id) DO UPDATE SET
      preferred_location_id = EXCLUDED.preferred_location_id,
      recency_days = EXCLUDED.recency_days,
      frequency_orders = EXCLUDED.frequency_orders,
      monetary_spend = EXCLUDED.monetary_spend,
      rfm_segment = EXCLUDED.rfm_segment,
      priority_score = EXCLUDED.priority_score,
      lifecycle_stage = EXCLUDED.lifecycle_stage,
      last_calculated_at = now(),
      updated_at = now();
  `;
  const res = await client.query(q);
  console.log('Upserted CRM profiles:', res.rowCount);
  const dist = await client.query('SELECT preferred_location_id, l.name, count(*) FROM crm_customer_profiles p LEFT JOIN locations l ON l.id = p.preferred_location_id GROUP BY p.preferred_location_id, l.name');
  console.log('CRM profile distribution:');
  console.table(dist.rows);
  await client.end();
}
run().catch(console.error);
