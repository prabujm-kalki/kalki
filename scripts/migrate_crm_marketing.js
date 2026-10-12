const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos' });

async function migrate() {
  await client.connect();

  const queries = [
    `CREATE TABLE IF NOT EXISTS crm_customer_profiles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES organizations(id),
      customer_id UUID NOT NULL UNIQUE REFERENCES customers(id) ON DELETE CASCADE,
      customer_type VARCHAR(50) NOT NULL DEFAULT 'RETAIL',
      preferred_location_id UUID REFERENCES locations(id),
      recency_days INTEGER NOT NULL DEFAULT 0,
      frequency_orders INTEGER NOT NULL DEFAULT 0,
      monetary_spend NUMERIC(12,2) NOT NULL DEFAULT 0.00,
      rfm_segment VARCHAR(50) NOT NULL DEFAULT 'NEW',
      priority_score INTEGER NOT NULL DEFAULT 50,
      lifecycle_stage VARCHAR(50) NOT NULL DEFAULT 'NEW',
      churn_risk_percentage NUMERIC(5,2) NOT NULL DEFAULT 10.00,
      predicted_next_visit_days INTEGER,
      tags JSONB DEFAULT '[]'::jsonb,
      whatsapp_consent BOOLEAN NOT NULL DEFAULT true,
      sms_consent BOOLEAN NOT NULL DEFAULT true,
      consent_updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
      last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS crm_leads (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES organizations(id),
      location_id UUID REFERENCES locations(id),
      customer_id UUID REFERENCES customers(id),
      title VARCHAR(255) NOT NULL,
      lead_type VARCHAR(50) NOT NULL DEFAULT 'CATERING',
      contact_name VARCHAR(255) NOT NULL,
      contact_phone VARCHAR(50) NOT NULL,
      contact_email VARCHAR(255),
      stage VARCHAR(50) NOT NULL DEFAULT 'NEW_ENQUIRY',
      estimated_value NUMERIC(12,2) NOT NULL DEFAULT 0.00,
      event_date TIMESTAMP WITH TIME ZONE,
      notes TEXT,
      assigned_user_id TEXT REFERENCES "user"(id),
      kuab_follow_up_task_id UUID REFERENCES kuab_tasks(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS crm_consent_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES organizations(id),
      customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      channel VARCHAR(30) NOT NULL,
      consent_granted BOOLEAN NOT NULL,
      source VARCHAR(100) NOT NULL,
      ip_address VARCHAR(100),
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS crm_tickets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES organizations(id),
      location_id UUID REFERENCES locations(id),
      customer_id UUID REFERENCES customers(id),
      ticket_number VARCHAR(50) NOT NULL,
      subject VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'OPEN',
      urgency VARCHAR(30) NOT NULL DEFAULT 'MEDIUM',
      category VARCHAR(50) NOT NULL DEFAULT 'BILLING',
      assigned_user_id TEXT REFERENCES "user"(id),
      resolved_at TIMESTAMP WITH TIME ZONE,
      resolution_notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS marketing_automations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES organizations(id),
      location_id UUID REFERENCES locations(id),
      name VARCHAR(255) NOT NULL,
      trigger_type VARCHAR(100) NOT NULL,
      channel VARCHAR(50) NOT NULL DEFAULT 'WHATSAPP',
      template_name VARCHAR(255),
      template_language VARCHAR(20) DEFAULT 'en',
      drip_delay_minutes INTEGER NOT NULL DEFAULT 0,
      status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
      exclusion_rules JSONB DEFAULT '{"excludeIfMessagedInDays": 7}'::jsonb,
      target_segment VARCHAR(50) NOT NULL DEFAULT 'ALL',
      execution_count INTEGER NOT NULL DEFAULT 0,
      last_triggered_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
    );`
  ];

  for (const q of queries) {
    await client.query(q);
  }

  console.log('CRM and Marketing tables migrated successfully.');
  await client.end();
}

migrate().catch(err => {
  console.error(err);
  process.exit(1);
});
