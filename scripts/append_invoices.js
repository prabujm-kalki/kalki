const fs = require('fs');
let content = fs.readFileSync('src/app/sales/reports/actions.ts', 'utf8');

const newAction = `

export async function fetchCustomerInvoices(
  organizationId: string,
  customerName: string,
  customerPhone: string
) {
  try {
    const isWalkIn = customerName === 'Walk-in Customer' && customerPhone === '-';
    
    const invoices = await db.select({
      id: salesInvoices.id,
      invoiceNumber: salesInvoices.invoiceNumber,
      invoiceDate: salesInvoices.invoiceDate,
      grandTotal: salesInvoices.grandTotal,
      orderCategory: salesInvoices.orderCategory,
      paymentStatus: salesInvoices.paymentStatus
    })
    .from(salesInvoices)
    .leftJoin(customers, eq(salesInvoices.customerId, customers.id))
    .where(and(
      eq(salesInvoices.organizationId, organizationId),
      sql\`\${salesInvoices.status} != 'CANCELLED' AND \${salesInvoices.paymentStatus} != 'CANCELLED'\`,
      isWalkIn ? or(sql\`TRIM(\${salesInvoices.customerName}) = ''\`, sql\`\${salesInvoices.customerName} IS NULL\`) : 
      and(
        eq(sql\`COALESCE(NULLIF(TRIM(\${salesInvoices.customerName}), ''), 'Walk-in Customer')\`, customerName),
        eq(sql\`COALESCE(NULLIF(TRIM(\${customers.phone}), ''), '-')\`, customerPhone)
      )
    ))
    .orderBy(desc(salesInvoices.invoiceDate))
    .limit(50);

    return invoices;
  } catch (err) {
    console.error('Error fetching customer invoices:', err);
    return [];
  }
}
`;

content += newAction;
fs.writeFileSync('src/app/sales/reports/actions.ts', content);
