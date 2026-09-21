import { db } from '../src/db';
import { sql } from 'drizzle-orm';
import fs from 'fs';

async function main() {
  // Pre-fetch all audit events count for post-verification
  const auditRes = await db.execute(sql`SELECT count(*) FROM audit_events`);
  const initialAuditCount = Number(auditRes.rows[0].count);

  console.log('--- STARTING SAFETY ASSERTIONS ---');

  // Generate target set again using exact same logic to get the 2086 targets
  const ownerEmployeeId = '8ea913ff-50c1-4ff7-8df2-f2ff7024a8b1';
  const ownerPersonId = '6dde4190-21bd-4e6c-90f5-aa7440033d3d';
  const ownerUserId = 'vFNmCIS1V8da8doi8D7yh8gCNfXmUqud';
  const prabhaEmployeeId = '6ca1172f-3f8f-4899-89c5-566b4646ed38';

  const employeesRes = await db.execute(sql`
    SELECT e.id, e.employee_code, p.id as person_id, p.display_name, p.phone as primary_mobile, p.email, e.status, e.category, l.name as branch, e.user_id, e.created_at
    FROM employees e
    JOIN people p ON e.person_id = p.id
    JOIN locations l ON e.location_id = l.id
  `);

  const targetIds: string[] = [];
  const targetPersonIds: string[] = [];

  for (const emp of employeesRes.rows) {
    const isOwner = (emp.id === ownerEmployeeId) || (emp.user_id === ownerUserId) || (emp.person_id === ownerPersonId);

    let isTest = false;
    let testReason = [];
    if (emp.user_id === null) testReason.push('No user_id');
    if ((emp.display_name as string)?.toLowerCase().includes('test')) testReason.push('Name contains test');
    if ((emp.display_name as string)?.match(/(Fail|X|Y|P Y|Zero Contact|One Contact|No Salary Change|SalB|Display-)/i)) testReason.push('Name matches test patterns');
    if (testReason.length > 0) isTest = true;

    if (!isOwner && isTest && emp.id !== prabhaEmployeeId) {
      targetIds.push(emp.id as string);
      targetPersonIds.push(emp.person_id as string);
    }
  }

  // Pre-Delete Assertions
  if (targetIds.length !== 2086) throw new Error(`Assertion failed: Target employee count is ${targetIds.length}, expected 2086`);
  if (targetPersonIds.length !== 2086) throw new Error(`Assertion failed: Target person count is ${targetPersonIds.length}, expected 2086`);
  if (targetIds.includes(ownerEmployeeId)) throw new Error(`Assertion failed: Owner employee ID is in target list`);
  if (targetPersonIds.includes(ownerPersonId)) throw new Error(`Assertion failed: Owner person ID is in target list`);
  if (targetIds.includes(prabhaEmployeeId)) throw new Error(`Assertion failed: Prabha employee ID is in target list`);
  
  for (const emp of employeesRes.rows) {
      if (targetIds.includes(emp.id as string)) {
          if (emp.user_id === ownerUserId) throw new Error(`Assertion failed: Target employee has Owner user_id`);
      }
  }

  const targetIdsStr = targetIds.map(id => `'${id}'`).join(',');
  const targetPersonIdsStr = targetPersonIds.map(id => `'${id}'`).join(',');

  const workInstancesRes = await db.execute(sql.raw(`SELECT count(*) FROM work_instances WHERE assigned_employee_id IN (${targetIdsStr})`));
  if (Number(workInstancesRes.rows[0].count) !== 0) throw new Error(`Assertion failed: Target employees have non-zero work_instances`);

  console.log('--- PRE-DELETE ASSERTIONS PASSED ---');

  // Deletion Transaction
  await db.transaction(async (tx) => {
    console.log('--- EXECUTING DELETIONS ---');

    await tx.execute(sql.raw(`DELETE FROM employee_role_assignments WHERE employee_id IN (${targetIdsStr})`));
    await tx.execute(sql.raw(`DELETE FROM employee_responsibility_additions WHERE employee_id IN (${targetIdsStr})`));
    
    // Clear self-referencing foreign keys to prevent constraint violations
    await tx.execute(sql.raw(`UPDATE employees SET reporting_employee_id = NULL WHERE id IN (${targetIdsStr})`));
    await tx.execute(sql.raw(`DELETE FROM employee_history_reporting WHERE employee_id IN (${targetIdsStr}) OR reporting_employee_id IN (${targetIdsStr})`));

    await tx.execute(sql.raw(`DELETE FROM employees WHERE id IN (${targetIdsStr})`));
    await tx.execute(sql.raw(`DELETE FROM people WHERE id IN (${targetPersonIdsStr})`));

    console.log('--- STARTING POST-DELETE VERIFICATIONS ---');

    const checkEmp = await tx.execute(sql.raw(`SELECT count(*) FROM employees WHERE id IN (${targetIdsStr})`));
    if (Number(checkEmp.rows[0].count) !== 0) throw new Error(`Post-verify failed: Target employees still exist`);

    const checkPeople = await tx.execute(sql.raw(`SELECT count(*) FROM people WHERE id IN (${targetPersonIdsStr})`));
    if (Number(checkPeople.rows[0].count) !== 0) throw new Error(`Post-verify failed: Target people still exist`);

    const checkOwnerEmp = await tx.execute(sql`SELECT count(*) FROM employees WHERE id = ${ownerEmployeeId}`);
    if (Number(checkOwnerEmp.rows[0].count) !== 1) throw new Error(`Post-verify failed: Owner employee missing`);

    const checkOwnerPerson = await tx.execute(sql`SELECT count(*) FROM people WHERE id = ${ownerPersonId}`);
    if (Number(checkOwnerPerson.rows[0].count) !== 1) throw new Error(`Post-verify failed: Owner person missing`);

    const checkOwnerUser = await tx.execute(sql`SELECT count(*) FROM "user" WHERE id = ${ownerUserId}`);
    if (Number(checkOwnerUser.rows[0].count) !== 1) throw new Error(`Post-verify failed: Owner user missing`);

    const checkOwnerAuth = await tx.execute(sql`SELECT count(*) FROM system_authorities WHERE user_id = ${ownerUserId} AND authority = 'OWNER'`);
    if (Number(checkOwnerAuth.rows[0].count) !== 1) throw new Error(`Post-verify failed: Owner authority missing`);

    const checkPrabhaEmp = await tx.execute(sql`SELECT count(*) FROM employees WHERE id = ${prabhaEmployeeId}`);
    if (Number(checkPrabhaEmp.rows[0].count) !== 1) throw new Error(`Post-verify failed: Prabha employee missing`);

    const checkOrgs = await tx.execute(sql`SELECT count(*) FROM organizations`);
    if (Number(checkOrgs.rows[0].count) === 0) throw new Error(`Post-verify failed: Organizations wiped`);

    const checkLocs = await tx.execute(sql`SELECT count(*) FROM locations`);
    if (Number(checkLocs.rows[0].count) === 0) throw new Error(`Post-verify failed: Locations wiped`);

    const checkRoles = await tx.execute(sql`SELECT count(*) FROM business_roles`);
    if (Number(checkRoles.rows[0].count) === 0) throw new Error(`Post-verify failed: Business roles wiped`);

    const checkAudit = await tx.execute(sql`SELECT count(*) FROM audit_events`);
    if (Number(checkAudit.rows[0].count) !== initialAuditCount) throw new Error(`Post-verify failed: Audit events were modified`);

    console.log('--- ALL VERIFICATIONS PASSED, COMMITTING TRANSACTION ---');
  });

  console.log('--- TRANSACTION COMMITTED SUCCESSFULLY ---');

  // Read-only report post-commit
  const finalEmp = await db.execute(sql`SELECT count(*) FROM employees`);
  const finalPeople = await db.execute(sql`SELECT count(*) FROM people`);
  const finalFamily = await db.execute(sql`SELECT count(*) FROM employee_family_contacts`);
  const finalSal = await db.execute(sql`SELECT count(*) FROM employee_salary_info`);
  const finalRole = await db.execute(sql`SELECT count(*) FROM employee_role_assignments`);
  const finalHistBranch = await db.execute(sql`SELECT count(*) FROM employee_history_branch`);
  const finalWork = await db.execute(sql`SELECT count(*) FROM work_instances`);
  const finalAudit = await db.execute(sql`SELECT count(*) FROM audit_events`);

  const report = [
    '### Post-Reset Verification Report',
    `- Employees remaining: ${finalEmp.rows[0].count}`,
    `- People remaining: ${finalPeople.rows[0].count}`,
    `- Owner verification: Intact`,
    `- Prabha verification: Intact`,
    `- Remaining family contacts: ${finalFamily.rows[0].count}`,
    `- Remaining salary records: ${finalSal.rows[0].count}`,
    `- Remaining role assignments: ${finalRole.rows[0].count}`,
    `- Remaining history records (Branch): ${finalHistBranch.rows[0].count}`,
    `- Remaining work instances: ${finalWork.rows[0].count}`,
    `- Audit event count (Before vs After): ${initialAuditCount} vs ${finalAudit.rows[0].count}`,
    `- Master/configuration verification: Intact`,
    `- Exact transaction result: SUCCESSFULLY COMMITTED`
  ].join('\\n');

  console.log(report);
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
