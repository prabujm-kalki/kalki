const fs = require('fs');
const path = require('path');

const basePath = path.join(__dirname, '..', 'src', 'app', 'sales');

const redirects = [
  { file: 'page.tsx', target: '/sales/overview' },
  { file: 'orders/page.tsx', target: '/sales/orders/billing' },
  { file: 'invoices/page.tsx', target: '/sales/invoices/all' },
  { file: 'returns/page.tsx', target: '/sales/returns/sales-returns' },
  { file: 'reports/page.tsx', target: '/sales/reports/sales' },
  { file: 'settings/page.tsx', target: '/sales/settings/config' }
];

redirects.forEach(r => {
  const fullPath = path.join(basePath, r.file);
  const content = `import { redirect } from "next/navigation";

export default async function Page({ searchParams }: { searchParams: Promise<any> }) {
  const params = await searchParams;
  const orgId = params.organizationId;
  const locId = params.locationId;
  let q = "";
  if (orgId && locId) {
    q = \`?organizationId=\${orgId}&locationId=\${locId}\`;
  } else if (orgId) {
    q = \`?organizationId=\${orgId}\`;
  }
  redirect(\`${r.target}\${q}\`);
}
`;
  fs.writeFileSync(fullPath, content);
  console.log('Fixed redirect for', r.file);
});
