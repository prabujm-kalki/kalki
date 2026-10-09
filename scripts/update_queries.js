const fs = require('fs');
let content = fs.readFileSync('src/app/sales/actions.ts', 'utf8');

// Add `or` import
if (!content.includes('or, eq')) {
  content = content.replace('eq, and, ilike, sql, desc, inArray', 'eq, and, or, ilike, sql, desc, inArray');
}

// Update fetchPendingOrders where clause
content = content.replace(
  "eq(salesInvoices.paymentStatus, 'PENDING')",
  \`eq(salesInvoices.paymentStatus, 'PENDING'),
        ...(searchQuery
          ? [
              or(
                ilike(salesInvoices.invoiceNumber, \\\`%\\\${searchQuery}%\\\`),
                ilike(salesInvoices.customerName, \\\`%\\\${searchQuery}%\\\`)
              ),
            ]
          : [])\`
);

// Update fetchCompletedOrders where clause
content = content.replace(
  "eq(salesInvoices.paymentStatus, 'PAID')",
  \`eq(salesInvoices.paymentStatus, 'PAID'),
        ...(searchQuery
          ? [
              or(
                ilike(salesInvoices.invoiceNumber, \\\`%\\\${searchQuery}%\\\`),
                ilike(salesInvoices.customerName, \\\`%\\\${searchQuery}%\\\`)
              ),
            ]
          : [])\`
);

fs.writeFileSync('src/app/sales/actions.ts', content);
console.log('Updated queries');
