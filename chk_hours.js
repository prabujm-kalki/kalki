const { Pool } = require('pg');
require('dotenv').config({path: '.env'});
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query(`SELECT min_hours_full_day FROM shift_definitions WHERE id = 'f6190b3f-9548-4d49-81cc-4059a857f4e9'`).then(res => { console.log(res.rows); pool.end(); });
