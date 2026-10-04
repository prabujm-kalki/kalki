import 'dotenv/config';
import { db } from './src/db';
import { sql } from 'drizzle-orm';

async function run() {
  try {
    const schedules = await db.execute(sql`
      SELECT ps.id, ps.task_definition_id, td.completion_time_mins, td.title
      FROM purchase_schedules ps
      JOIN task_definitions td ON ps.task_definition_id = td.id
      WHERE ps.vendor_id = '0f57cf72-f2b5-402a-98ea-b351d5f5d1c0'
    `);
    
    if (schedules.rows.length > 0) {
      const defId = schedules.rows[0].task_definition_id;
      const matrices = await db.execute(sql`
        SELECT level, timeout_minutes, role_id
        FROM task_escalation_matrices
        WHERE definition_id = ${defId}
      `);
      console.log("Schedule & Def:", JSON.stringify(schedules.rows, null, 2));
      console.log("Matrices:", JSON.stringify(matrices.rows, null, 2));
    }
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
run();
