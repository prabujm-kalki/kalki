import { db } from './src/db';
import { sql } from 'drizzle-orm';

async function main() {
  const employees = await db.execute(sql`
    SELECT e.id, e.employee_code, p.display_name, e.status, e.category, l.name as branch, p.email, p.phone
    FROM employees e
    JOIN people p ON e.person_id = p.id
    JOIN locations l ON e.location_id = l.id
  `);
  console.log('--- EMPLOYEES ---');
  console.log(JSON.stringify(employees.rows, null, 2));

  const tables = [
    'people', 'employee_family_contacts', 'employee_salary_info',
    'employee_change_requests', 'employee_history_role', 'employee_history_branch',
    'employee_history_salary', 'employee_history_reporting', 'employee_history_category',
    'employee_history_status', 'employee_role_assignments', 'employee_responsibility_additions',
    'work_instances', 'audit_events'
  ];
  for (const table of tables) {
    const res = await db.execute(sql.raw(`SELECT count(*) FROM ${table}`));
    console.log(`${table} count: ${res.rows[0].count}`);
  }
  process.exit(0);
}
main().catch(console.error);
