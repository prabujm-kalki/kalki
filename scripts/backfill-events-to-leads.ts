import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function mapEventStatusToLeadStage(eventStatus: string) {
  switch (eventStatus) {
    case 'ENQUIRY':
      return 'NEW_ENQUIRY';
    case 'LIKELY':
    case 'AT_RISK':
      return 'CONTACTED';
    case 'CONFIRMED_NO_ADVANCE':
      return 'QUOTE_SENT';
    case 'BOOKED_PAID':
    case 'COMPLETED':
    case 'COMPLETED_PENDING':
      return 'WON';
    case 'CANCELLED':
      return 'LOST';
    default:
      return 'NEW_ENQUIRY';
  }
}

async function backfill() {
  const evts = await pool.query('SELECT * FROM events');
  console.log(`Found ${evts.rows.length} events to inspect.`);
  
  for (const ev of evts.rows) {
    let leadId = ev.lead_id;
    const stage = mapEventStatusToLeadStage(ev.status);
    const title = `${ev.title} (${ev.guaranteed_pax} Pax)`;
    const estVal = (Number(ev.price_per_pax || 0) * Number(ev.guaranteed_pax || 0) + Number(ev.hall_rent || 0)).toFixed(2);
    
    if (leadId) {
      console.log(`Updating existing lead ${leadId} for event ${ev.id}`);
      await pool.query(
        'UPDATE crm_leads SET stage = $1, estimated_value = $2, event_date = $3, updated_at = NOW() WHERE id = $4',
        [stage, estVal, ev.event_date, leadId]
      );
    } else {
      console.log(`Creating new CRM Lead for event ${ev.id}: ${ev.title}`);
      const insertSql = `
        INSERT INTO crm_leads 
        (organization_id, location_id, customer_id, title, lead_type, contact_name, contact_phone, contact_email, estimated_value, event_date, stage, notes, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
        RETURNING id
      `;
      const inserted = await pool.query(insertSql, [
        ev.organization_id,
        ev.location_id,
        ev.customer_id,
        title,
        'CATERING',
        ev.contact_name,
        ev.contact_phone,
        ev.contact_email,
        estVal,
        ev.event_date,
        stage,
        ev.notes || `Catering Function: ${ev.function_type} | Slot: ${ev.time_slot}`,
      ]);
      const newLeadId = inserted.rows[0].id;
      await pool.query('UPDATE events SET lead_id = $1 WHERE id = $2', [newLeadId, ev.id]);
      console.log(`Linked event ${ev.id} -> CRM Lead ${newLeadId} (Stage: ${stage})`);
    }
  }
  
  const finalLeads = await pool.query('SELECT id, title, stage, lead_type, location_id FROM crm_leads');
  console.log('CRM Leads after backfill:', finalLeads.rows);
  await pool.end();
}

backfill().catch((err) => {
  console.error('Backfill error:', err);
  process.exit(1);
});
