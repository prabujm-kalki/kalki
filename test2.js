const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos' });
pool.query(`
      SELECT 
        to_char(je.entry_date, 'Mon') as name,
        to_char(je.entry_date, 'YYYY-MM') as month_sort,
        SUM(CASE WHEN jli.account_id::text IN ('00000000-0000-0000-0000-000000000000') THEN jli.credit - jli.debit ELSE 0 END) as revenue
      FROM journal_entries je
      JOIN journal_line_items jli ON je.id = jli.journal_entry_id
      GROUP BY to_char(je.entry_date, 'Mon'), to_char(je.entry_date, 'YYYY-MM')
      ORDER BY to_char(je.entry_date, 'YYYY-MM') ASC
`).then(res => console.log('ROWS:', res.rows)).catch(console.error).finally(() => pool.end());
