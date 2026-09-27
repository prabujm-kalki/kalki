const { Pool } = require('pg');
require('dotenv').config({path: '.env'});
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function test() {
  const structId = '01fe0de1-484a-4b46-8fa0-0b8ff7be25ee';
  const compsRes = await pool.query(`
    SELECT c.name, c.type, esc.amount
    FROM employee_salary_structure_components esc
    JOIN salary_components c ON esc.component_id = c.id
    WHERE esc.structure_id = $1
  `, [structId]);
  
  const components = compsRes.rows;
  console.log('Comps from DB:', components);

  const uniqueComps = Array.from(new Map(components.map(c => [c.name, c])).values());
  console.log('Unique Comps:', uniqueComps);

  let payBasis = 'HOURLY';
  let totalPresent = 2;
  let totalDaysInPeriod = 6;
  let totalNetHours = 16;
  
  let proRatedGross = 0;
  let finalDeductions = 0;

  for (const comp of uniqueComps) {
      const amt = Number(comp.amount) || 0;
      console.log('Checking:', comp.name, 'Amount:', amt);
      if (comp.type === "EARNING") {
        if (payBasis === "MONTHLY" || payBasis === "WEEKLY") {
            proRatedGross += (amt / totalDaysInPeriod) * totalPresent;
        } else if (payBasis === "DAILY") {
            proRatedGross += amt * totalPresent;
        } else if (payBasis === "HOURLY") {
            if (comp.name.toLowerCase().includes("basic") || comp.name.toLowerCase().includes("hourly")) {
              proRatedGross += amt * totalNetHours;
              console.log('Added to gross:', amt * totalNetHours);
            }
        }
      }
  }
  
  console.log('Gross:', proRatedGross);
  pool.end();
}
test();
