const fs = require('fs');

let code = fs.readFileSync('src/app/sales/reports/actions.ts', 'utf8');

const fetchChannelsBlock = `export async function fetchOrgChannels(organizationId: string) {
  try {
    if (!organizationId) return [];
    const res = await db.select({
      id: salesChannels.id,
      name: salesChannels.name,
    })
    .from(salesChannels)
    .where(eq(salesChannels.organizationId, organizationId))
    .orderBy(salesChannels.name);
    return res;
  } catch (error) {
    console.error('Error fetching channels:', error);
    return [];
  }
}

export async function fetchOrgLocations`;

if (!code.includes('fetchOrgChannels')) {
  code = code.replace('export async function fetchOrgLocations', fetchChannelsBlock);
}

// 1. Update fetchSalesReportData
code = code.replace(
  `export async function fetchSalesReportData(
  organizationId: string, 
  locationId?: string, 
  startDate?: string, 
  endDate?: string,
  page: number = 1,
  limit: number = 15,
  searchQuery?: string
)`,
  `export async function fetchSalesReportData(
  organizationId: string, 
  locationId?: string, 
  startDate?: string, 
  endDate?: string,
  page: number = 1,
  limit: number = 15,
  searchQuery?: string,
  channelId?: string
)`
);

code = code.replace(
  `locationId && locationId !== 'all' ? eq(salesInvoices.locationId, locationId) : undefined,`,
  `locationId && locationId !== 'all' ? eq(salesInvoices.locationId, locationId) : undefined,\n      channelId && channelId !== 'all' ? eq(salesInvoices.channelId, channelId) : undefined,`
);


// 2. Update fetchItemWiseReportData
code = code.replace(
  `export async function fetchItemWiseReportData(
  organizationId: string, 
  locationId?: string, 
  categoryId?: string,
  startDate?: string, 
  endDate?: string,
  page: number = 1,
  limit: number = 15,
  searchQuery?: string
)`,
  `export async function fetchItemWiseReportData(
  organizationId: string, 
  locationId?: string, 
  categoryId?: string,
  startDate?: string, 
  endDate?: string,
  page: number = 1,
  limit: number = 15,
  searchQuery?: string,
  channelId?: string
)`
);
code = code.replace(
  `locationId && locationId !== 'all' ? eq(salesInvoices.locationId, locationId) : undefined,`,
  `locationId && locationId !== 'all' ? eq(salesInvoices.locationId, locationId) : undefined,\n      channelId && channelId !== 'all' ? eq(salesInvoices.channelId, channelId) : undefined,`
);


// 3. Update fetchCustomerWiseReportData
code = code.replace(
  `export async function fetchCustomerWiseReportData(
  organizationId: string, 
  locationId?: string, 
  startDate?: string, 
  endDate?: string,
  page: number = 1,
  limit: number = 15,
  searchQuery?: string
)`,
  `export async function fetchCustomerWiseReportData(
  organizationId: string, 
  locationId?: string, 
  startDate?: string, 
  endDate?: string,
  page: number = 1,
  limit: number = 15,
  searchQuery?: string,
  channelId?: string
)`
);
code = code.replace(
  `locationId && locationId !== 'all' ? eq(salesInvoices.locationId, locationId) : undefined,`,
  `locationId && locationId !== 'all' ? eq(salesInvoices.locationId, locationId) : undefined,\n      channelId && channelId !== 'all' ? eq(salesInvoices.channelId, channelId) : undefined,`
);

fs.writeFileSync('src/app/sales/reports/actions.ts', code);
console.log('done');
