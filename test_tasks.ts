import { db } from './src/db/index';
import { sql } from 'drizzle-orm';

db.execute(sql`SELECT id, key_name FROM task_definitions`).then(res => console.log(res.rows));
