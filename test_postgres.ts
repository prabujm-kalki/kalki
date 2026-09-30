import { db } from './src/db/index';
import { sql } from 'drizzle-orm';
db.execute(sql`SELECT column_name FROM information_schema.columns WHERE table_name='organizations'`).then((res: any) => console.log(res.rows || res));
