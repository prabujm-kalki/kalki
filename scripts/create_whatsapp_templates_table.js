const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos' });

async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS whatsapp_templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      display_name VARCHAR(255),
      category VARCHAR(50) DEFAULT 'MARKETING' NOT NULL,
      language VARCHAR(20) DEFAULT 'en' NOT NULL,
      status VARCHAR(50) DEFAULT 'APPROVED' NOT NULL,
      body_text TEXT NOT NULL,
      header_type VARCHAR(20) DEFAULT 'NONE',
      header_text TEXT,
      footer_text TEXT,
      variable_count INTEGER DEFAULT 0 NOT NULL,
      meta_template_id VARCHAR(255),
      rejection_reason TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      CONSTRAINT unique_org_template_lang UNIQUE (organization_id, name, language)
    );
  `);
  console.log('whatsapp_templates table created successfully.');
  await pool.end();
}

migrate().catch(console.error);
