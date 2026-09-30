const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    console.log("Creating Advances tables...");
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS advance_type_definitions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id),
        location_id UUID REFERENCES locations(id),
        code VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        calculation_basis VARCHAR(50),
        max_cap_percentage INTEGER,
        max_count_monthly INTEGER,
        max_count_weekly INTEGER,
        min_tenure_days INTEGER,
        min_notice_days INTEGER,
        min_cycle_days_worked INTEGER,
        holdback_days INTEGER,
        max_repayment_months INTEGER,
        allowed_payment_modes VARCHAR(255),
        allow_concurrent_advances BOOLEAN NOT NULL DEFAULT false,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS employee_advance_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id),
        location_id UUID NOT NULL REFERENCES locations(id),
        employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        advance_type_id UUID NOT NULL REFERENCES advance_type_definitions(id),
        requested_amount NUMERIC NOT NULL,
        approved_amount NUMERIC,
        repayment_months INTEGER,
        payment_mode VARCHAR(50),
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        repaid_amount NUMERIC NOT NULL DEFAULT '0',
        remaining_balance NUMERIC,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS advance_repayment_schedules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        advance_request_id UUID NOT NULL REFERENCES employee_advance_requests(id) ON DELETE CASCADE,
        cycle_start_date DATE,
        cycle_end_date DATE,
        installment_number INTEGER,
        deduction_amount NUMERIC NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    console.log('✅ Tables created successfully!');
  } catch(e) {
    console.error('❌ Failed to create tables:', e);
  } finally {
    await pool.end();
  }
}

run();
