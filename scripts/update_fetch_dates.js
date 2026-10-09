const fs = require('fs');
let content = fs.readFileSync('src/app/sales/actions.ts', 'utf8');

if (!content.includes('gte, lte')) {
    content = content.replace('eq, and, or, ilike, sql, desc, inArray', 'eq, and, or, ilike, sql, desc, inArray, gte, lte');
}

const oldFetchCompletedOrders = `export async function fetchCompletedOrders(organizationId: string, locationId: string, searchQuery?: string, page: number = 1, limit: number = 10) {
  if (!organizationId || !locationId) return { data: [], total: 0 };
  
  const offset = (page - 1) * limit;

  const whereClause = and(
    eq(salesInvoices.organizationId, organizationId),
    eq(salesInvoices.locationId, locationId),
    eq(salesInvoices.paymentStatus, 'PAID'),
    ...(searchQuery
      ? [
          or(
            ilike(salesInvoices.invoiceNumber, \`%\${searchQuery}%\`),
            ilike(salesInvoices.customerName, \`%\${searchQuery}%\`)
          ),
        ]
      : [])
  );`;

const newFetchCompletedOrders = `export async function fetchCompletedOrders(organizationId: string, locationId: string, searchQuery?: string, page: number = 1, limit: number = 10, startDate?: Date, endDate?: Date) {
  if (!organizationId || !locationId) return { data: [], total: 0 };
  
  const offset = (page - 1) * limit;

  const whereClause = and(
    eq(salesInvoices.organizationId, organizationId),
    eq(salesInvoices.locationId, locationId),
    eq(salesInvoices.paymentStatus, 'PAID'),
    ...(startDate ? [gte(salesInvoices.invoiceDate, startDate)] : []),
    ...(endDate ? [lte(salesInvoices.invoiceDate, endDate)] : []),
    ...(searchQuery
      ? [
          or(
            ilike(salesInvoices.invoiceNumber, \`%\${searchQuery}%\`),
            ilike(salesInvoices.customerName, \`%\${searchQuery}%\`)
          ),
        ]
      : [])
  );`;

content = content.replace(oldFetchCompletedOrders, newFetchCompletedOrders);
fs.writeFileSync('src/app/sales/actions.ts', content);
console.log('actions.ts updated');
