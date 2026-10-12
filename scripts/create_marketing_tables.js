const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos' });

async function createMarketingTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS marketing_campaigns (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL REFERENCES organizations(id),
        location_id uuid REFERENCES locations(id),
        name varchar(255) NOT NULL,
        description text,
        template_name varchar(100) NOT NULL,
        template_language varchar(10) DEFAULT 'en',
        status varchar(30) DEFAULT 'DRAFT' NOT NULL,
        target_audience_type varchar(50) DEFAULT 'ALL_CUSTOMERS' NOT NULL,
        audience_filter jsonb DEFAULT '{}'::jsonb,
        total_recipients integer DEFAULT 0 NOT NULL,
        sent_count integer DEFAULT 0 NOT NULL,
        delivered_count integer DEFAULT 0 NOT NULL,
        read_count integer DEFAULT 0 NOT NULL,
        failed_count integer DEFAULT 0 NOT NULL,
        scheduled_at timestamp with time zone,
        started_at timestamp with time zone,
        completed_at timestamp with time zone,
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        updated_at timestamp with time zone DEFAULT now() NOT NULL
      );
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS marketing_campaign_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id uuid NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
        customer_id uuid REFERENCES customers(id),
        recipient_phone varchar(50) NOT NULL,
        meta_message_id varchar(255),
        status varchar(30) DEFAULT 'PENDING' NOT NULL,
        error_message text,
        sent_at timestamp with time zone,
        delivered_at timestamp with time zone,
        read_at timestamp with time zone,
        created_at timestamp with time zone DEFAULT now() NOT NULL
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_mkt_camp_org ON marketing_campaigns(organization_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_mkt_camp_logs ON marketing_campaign_logs(campaign_id, status);
    `);

    console.log('Marketing tables created successfully!');
  } catch (err) {
    console.error('Error creating marketing tables:', err);
  } finally {
    await pool.end();
  }
}

createMarketingTables();
