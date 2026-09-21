import { db } from '../src/db';
import { sql } from 'drizzle-orm';
import fs from 'fs';

async function main() {
  // 1. Identify Owner
  const ownerAuthRes = await db.execute(sql`SELECT user_id FROM system_authorities WHERE authority = 'OWNER'`);
  if (ownerAuthRes.rows.length === 0) {
    throw new Error('OWNER authority not found in system_authorities.');
  }
  const ownerUserId = ownerAuthRes.rows[0].user_id as string;

  const ownerEmpRes = await db.execute(sql`SELECT id, person_id FROM employees WHERE user_id = ${ownerUserId}`);
  if (ownerEmpRes.rows.length === 0) {
    throw new Error(`Owner employee record not found for user_id: ${ownerUserId}`);
  }
  const ownerEmployeeId = ownerEmpRes.rows[0].id as string;
  const ownerPersonId = ownerEmpRes.rows[0].person_id as string;

  // 2. Query all employees
  const employeesRes = await db.execute(sql`
    SELECT e.id, e.employee_code, p.id as person_id, p.display_name, p.phone as primary_mobile, p.email, e.status, e.category, l.name as branch, e.user_id, e.created_at
    FROM employees e
    JOIN people p ON e.person_id = p.id
    JOIN locations l ON e.location_id = l.id
  `);

  const deletionTargets = [];
  const manualReview = [];

  for (const emp of employeesRes.rows) {
    const isOwner = (emp.id === ownerEmployeeId) || (emp.user_id === ownerUserId) || (emp.person_id === ownerPersonId);

    let isTest = false;
    let testReason = [];

    // Synthesize criteria
    if (emp.user_id === null) testReason.push('No user_id');
    if ((emp.display_name as string)?.toLowerCase().includes('test')) testReason.push('Name contains test');
    if ((emp.display_name as string)?.match(/(Fail|X|Y|P Y|Zero Contact|One Contact|No Salary Change|SalB|Display-)/i)) testReason.push('Name matches test patterns');
    // We also know a lot of test data was created today or yesterday
    
    if (testReason.length > 0) {
        isTest = true;
    }

    if (isOwner) {
      manualReview.push({ ...emp, classificationReason: 'Is Owner/Super User' });
    } else if (isTest) {
      deletionTargets.push({ ...emp, classificationReason: testReason.join(', ') });
    } else {
      manualReview.push({ ...emp, classificationReason: 'Did not match definitive test criteria' });
    }
  }

  // Dependent records for targets
  const targetIds = deletionTargets.map(t => `'${t.id}'`).join(',');
  const targetPersonIds = deletionTargets.map(t => `'${t.person_id}'`).join(',');

  let familyCount = 0, salaryCount = 0, crCount = 0, roleAssnCount = 0, respCount = 0, workInstCount = 0;
  let histRoleCount = 0, histBranchCount = 0, histSalCount = 0, histRepCount = 0, histCatCount = 0, histStatusCount = 0;

  if (targetIds.length > 0) {
    const getCount = async (table: string, fk: string) => {
      const res = await db.execute(sql.raw(`SELECT count(*) as c FROM ${table} WHERE ${fk} IN (${targetIds})`));
      return Number(res.rows[0].c);
    };
    familyCount = await getCount('employee_family_contacts', 'employee_id');
    salaryCount = await getCount('employee_salary_info', 'employee_id');
    crCount = await getCount('employee_change_requests', 'employee_id');
    roleAssnCount = await getCount('employee_role_assignments', 'employee_id');
    respCount = await getCount('employee_responsibility_additions', 'employee_id');
    workInstCount = await getCount('work_instances', 'assigned_employee_id');

    histRoleCount = await getCount('employee_history_role', 'employee_id');
    histBranchCount = await getCount('employee_history_branch', 'employee_id');
    histSalCount = await getCount('employee_history_salary', 'employee_id');
    histRepCount = await getCount('employee_history_reporting', 'employee_id');
    histCatCount = await getCount('employee_history_category', 'employee_id');
    histStatusCount = await getCount('employee_history_status', 'employee_id');
  }

  let report = `# Data Deletion Target Preview\n\n`;
  report += `## Owner / Protected Details\n`;
  report += `- Protected Owner employee ID: ${ownerEmployeeId}\n`;
  report += `- Protected Owner person ID: ${ownerPersonId}\n`;
  report += `- Protected Owner user ID: ${ownerUserId}\n\n`;

  report += `## Summary\n`;
  report += `- Proposed deletion employee count: ${deletionTargets.length}\n`;
  report += `- Proposed deletion person count: ${deletionTargets.length}\n`;
  report += `- Manual-review/excluded employee count: ${manualReview.length}\n\n`;

  report += `## Dependent Records for Deletion Set\n`;
  report += `- Family contacts: ${familyCount}\n`;
  report += `- Salary records: ${salaryCount}\n`;
  report += `- Change requests: ${crCount}\n`;
  report += `- History (Role): ${histRoleCount}\n`;
  report += `- History (Branch): ${histBranchCount}\n`;
  report += `- History (Salary): ${histSalCount}\n`;
  report += `- History (Reporting): ${histRepCount}\n`;
  report += `- History (Category): ${histCatCount}\n`;
  report += `- History (Status): ${histStatusCount}\n`;
  report += `- Role assignments: ${roleAssnCount}\n`;
  report += `- Responsibility additions: ${respCount}\n`;
  report += `- Work instances: ${workInstCount}\n\n`;
  
  report += `## Manual Review / Protected (Sample)\n`;
  for (const emp of manualReview.slice(0, 10)) {
    report += `- ID: ${emp.id} | Name: ${emp.display_name} | Reason: ${emp.classificationReason}\n`;
  }
  
  report += `\n## Deletion Targets (Sample 50)\n`;
  for (const emp of deletionTargets.slice(0, 50)) {
    report += `- ID: ${emp.id} | Code: ${emp.employee_code} | Person: ${emp.person_id} | Name: ${emp.display_name} | Mobile: ${emp.primary_mobile} | Email: ${emp.email} | Status: ${emp.status} | Category: ${emp.category} | Branch: ${emp.branch} | User: ${emp.user_id} | Reason: ${emp.classificationReason}\n`;
  }

  fs.writeFileSync('C:/Users/Asus/.gemini/antigravity-ide/brain/4a5f63f2-20e4-478a-acd7-c2e15d0c5bf2/preview.md', report);
  
  console.log("SUCCESS");
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
