import { db } from './src/db/index';

const run = async () => {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS organization_statutory_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id),
        epf_employee_contribution_rate NUMERIC NOT NULL DEFAULT 12.00,
        epf_employer_contribution_rate NUMERIC NOT NULL DEFAULT 12.00,
        epf_wage_ceiling NUMERIC NOT NULL DEFAULT 15000.00,
        epf_include_employer_in_ctc BOOLEAN NOT NULL DEFAULT true,
        esi_employee_contribution_rate NUMERIC NOT NULL DEFAULT 0.75,
        esi_employer_contribution_rate NUMERIC NOT NULL DEFAULT 3.25,
        esi_wage_ceiling NUMERIC NOT NULL DEFAULT 21000.00,
        esi_include_employer_in_ctc BOOLEAN NOT NULL DEFAULT true,
        pt_state VARCHAR(255),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      )
    `);
    console.log('Table created');
  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
};

run();
