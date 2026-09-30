require('dotenv').config(); 
const { Client } = require('pg'); 

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL }); 
  await client.connect();
  
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS pay_configurations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), 
        organization_id uuid NOT NULL, 
        employee_id uuid NOT NULL, 
        pay_frequency varchar(50) DEFAULT 'MONTHLY' NOT NULL, 
        payment_method varchar(50) DEFAULT 'BANK' NOT NULL, 
        bank_account_number varchar(255), 
        bank_ifsc_code varchar(50), 
        is_epf_applicable boolean DEFAULT false NOT NULL, 
        is_esi_applicable boolean DEFAULT false NOT NULL, 
        is_pt_applicable boolean DEFAULT false NOT NULL, 
        created_at timestamp with time zone DEFAULT now() NOT NULL, 
        updated_at timestamp with time zone DEFAULT now() NOT NULL
      ); 
      
      CREATE TABLE IF NOT EXISTS employee_earnings (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), 
        pay_configuration_id uuid NOT NULL REFERENCES pay_configurations(id) ON DELETE CASCADE, 
        component_name varchar(255) NOT NULL, 
        amount numeric NOT NULL, 
        type varchar(50) DEFAULT 'FIXED' NOT NULL
      ); 
      
      CREATE TABLE IF NOT EXISTS employee_deductions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), 
        pay_configuration_id uuid NOT NULL REFERENCES pay_configurations(id) ON DELETE CASCADE, 
        component_name varchar(255) NOT NULL, 
        amount numeric NOT NULL, 
        type varchar(50) DEFAULT 'FIXED' NOT NULL
      );
    `);
    console.log('Tables created successfully!'); 
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await client.end(); 
  }
}

main();
