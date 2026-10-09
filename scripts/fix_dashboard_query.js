const fs = require('fs');

let code = fs.readFileSync('src/app/sales/dashboard-actions.ts', 'utf8');

// Replace the unified CTE logic
const oldLogicStart = `    // Create the unified CTE (Approach A: Single Unified Table implemented logically at the query level for safety)`;
const newLogic = `    // Create the unified CTE
    const unifiedSql = sql\`
      SELECT 
        id as id,
        invoice_number as identifier,
        issue_date as date,
        grand_total as amount,
        customer_name as customer,
        payment_status as status,
        CASE WHEN tmbill_raw_data IS NOT NULL THEN 'TMBILL_IMPORT' ELSE 'KALKI_B2B' END as source
      FROM b2b_sales_invoices
      WHERE \${locFilterB2B} AND \${dateFilterB2B}
    \`;

    const unifiedQuery = sql\`WITH unified_sales AS (\${unifiedSql})\`;`;

// Find where unifiedQuery is defined
const unifiedQueryEnd = `    const unifiedQuery = sql\`WITH unified_sales AS (\${unifiedSql})\`;`;

code = code.substring(0, code.indexOf(oldLogicStart)) + newLogic + code.substring(code.indexOf(unifiedQueryEnd) + unifiedQueryEnd.length);

fs.writeFileSync('src/app/sales/dashboard-actions.ts', code);
console.log('Fixed dashboard-actions.ts');
