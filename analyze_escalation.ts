import 'dotenv/config';
import { db } from './src/db';
import { taskInstances, taskDefinitions, taskEscalationMatrices, purchaseSchedules } from './src/db/schema';
import { sql, eq } from 'drizzle-orm';

async function run() {
  try {
    const res = await db.execute(sql`SELECT id, status, created_at, due_at, escalation_level, assigned_role_id, context_data FROM task_instances WHERE status = 'pending'`);
    console.log("PENDING TASKS:");
    console.dir(res.rows, { depth: null });
    
    // Check escalation configuration for the relevant definitions
    const defs = await db.execute(sql`SELECT id, title, completion_time_mins FROM task_definitions WHERE title LIKE '%1Min%' OR title = 'Medium_1Min_1Min'`);
    console.log("TASK DEFINITIONS:");
    console.dir(defs.rows, { depth: null });

    const escalations = await db.execute(sql`SELECT id, definition_id, level, role_id, timeout_minutes FROM task_escalation_matrices`);
    console.log("ESCALATION MATRICES:");
    console.dir(escalations.rows, { depth: null });
    
    // check schedules
    const schedules = await db.execute(sql`SELECT id, vendor_id, reminder_time FROM purchase_schedules`);
    console.log("SCHEDULES:");
    console.dir(schedules.rows, { depth: null });

  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
run();
