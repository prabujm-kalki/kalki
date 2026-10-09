const fs = require('fs');
let code = fs.readFileSync('src/app/sales/actions.ts', 'utf8');

const oldFetch = `export async function fetchAllOrders(organizationId: string, locationId: string, searchQuery?: string, page: number = 1, limit: number = 10, startDate?: string, endDate?: string) {
  if (!organizationId || !locationId) return { data: [], total: 0 };
  
  const offset = (page - 1) * limit;

  let startObj: Date | undefined = undefined;
  if (startDate) {
    startObj = new Date(startDate);
    startObj.setUTCHours(0, 0, 0, 0);
  }

  let endObj: Date | undefined = undefined;
  if (endDate) {
    endObj = new Date(endDate);
    endObj.setUTCHours(23, 59, 59, 999);
  }

  const whereClause = and(
    eq(salesInvoices.organizationId, organizationId),
    eq(salesInvoices.locationId, locationId),
    ...(startObj ? [gte(salesInvoices.invoiceDate, startObj)] : []),
    ...(endObj ? [lte(salesInvoices.invoiceDate, endObj)] : []),
    ...(searchQuery
      ? [
          or(
            ilike(salesInvoices.invoiceNumber, \`%\${searchQuery}%\`),
            ilike(salesInvoices.customerName, \`%\${searchQuery}%\`)
          ),
        ]
      : [])
  );

  const data = await db.select({
    id: salesInvoices.id,
    invoiceNumber: salesInvoices.invoiceNumber,
    customerName: salesInvoices.customerName,
    invoiceDate: salesInvoices.invoiceDate,
    dueDate: salesInvoices.dueDate,
    paymentStatus: salesInvoices.paymentStatus,
    paymentMode: salesInvoices.paymentMode,
    grandTotal: salesInvoices.grandTotal,
    status: salesInvoices.status,
  })
    .from(salesInvoices)
    .where(whereClause)
    .orderBy(desc(salesInvoices.invoiceDate))
    .limit(limit)
    .offset(offset);

  const totalResult = await db.select({ count: sql<number>\`count(*)\` }).from(salesInvoices).where(whereClause);
  const total = Number(totalResult[0]?.count || 0);

  return { data, total };
}`;

const newFetch = `export async function fetchAllOrders(organizationId: string, locationId: string, searchQuery?: string, page: number = 1, limit: number = 10, startDate?: string, endDate?: string, paymentMode?: string, status?: string) {
  if (!organizationId || !locationId) return { data: [], total: 0 };
  
  const offset = (page - 1) * limit;

  let startObj: Date | undefined = undefined;
  if (startDate) {
    startObj = new Date(startDate);
    startObj.setUTCHours(0, 0, 0, 0);
  }

  let endObj: Date | undefined = undefined;
  if (endDate) {
    endObj = new Date(endDate);
    endObj.setUTCHours(23, 59, 59, 999);
  }

  const whereClause = and(
    eq(salesInvoices.organizationId, organizationId),
    eq(salesInvoices.locationId, locationId),
    ...(startObj ? [gte(salesInvoices.invoiceDate, startObj)] : []),
    ...(endObj ? [lte(salesInvoices.invoiceDate, endObj)] : []),
    ...(paymentMode ? [eq(salesInvoices.paymentMode, paymentMode)] : []),
    ...(status ? [eq(salesInvoices.status, status)] : []),
    ...(searchQuery
      ? [
          or(
            ilike(salesInvoices.invoiceNumber, \`%\${searchQuery}%\`),
            ilike(salesInvoices.customerName, \`%\${searchQuery}%\`),
            ilike(customers.phone, \`%\${searchQuery}%\`)
          ),
        ]
      : [])
  );

  const data = await db.select({
    id: salesInvoices.id,
    invoiceNumber: salesInvoices.invoiceNumber,
    customerName: salesInvoices.customerName,
    customerPhone: customers.phone,
    invoiceDate: salesInvoices.invoiceDate,
    dueDate: salesInvoices.dueDate,
    paymentStatus: salesInvoices.paymentStatus,
    paymentMode: salesInvoices.paymentMode,
    grandTotal: salesInvoices.grandTotal,
    status: salesInvoices.status,
  })
    .from(salesInvoices)
    .leftJoin(customers, eq(salesInvoices.customerId, customers.id))
    .where(whereClause)
    .orderBy(desc(salesInvoices.invoiceDate))
    .limit(limit)
    .offset(offset);

  const totalResult = await db.select({ count: sql<number>\`count(*)\` })
    .from(salesInvoices)
    .leftJoin(customers, eq(salesInvoices.customerId, customers.id))
    .where(whereClause);
  const total = Number(totalResult[0]?.count || 0);

  return { data, total };
}`;

if (code.includes(oldFetch)) {
  code = code.replace(oldFetch, newFetch);
  fs.writeFileSync('src/app/sales/actions.ts', code);
  console.log('Replaced fetchAllOrders');
} else {
  console.log('Could not find oldFetch to replace.');
}
