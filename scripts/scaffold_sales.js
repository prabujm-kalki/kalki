const fs = require('fs');
const path = require('path');

const basePath = path.join(__dirname, '..', 'src', 'app', 'sales');

const dirs = [
  'overview',
  'orders/billing', 'orders/status', 'orders/pending', 'orders/completed', 'orders/cancelled',
  'invoices/all', 'invoices/tax', 'invoices/b2b', 'invoices/b2c', 'invoices/search', 'invoices/details',
  'returns/sales-returns', 'returns/credit-notes', 'returns/refunds', 'returns/cancelled',
  'reports/sales', 'reports/product', 'reports/customer', 'reports/branch', 'reports/tax', 'reports/payment', 'reports/returns', 'reports/profit',
  'settings/config', 'settings/tax', 'settings/invoice', 'settings/integrations'
];

dirs.forEach(d => {
  fs.mkdirSync(path.join(basePath, d), { recursive: true });
});

const generateNav = (title, items) => {
  const links = items.map(item => `{ href: "${item.href}", label: "${item.label}", perm: "sales:read" }`).join(',\n    ');
  return `"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSessionView } from "@/components/AppShell";

export function ${title}() {
  const pathname = usePathname();
  const { session, selected } = useSessionView();
  const query = selected ? \`?organizationId=\${selected.organizationId}&locationId=\${selected.locationId}\` : "";

  const allLinks = [
    ${links}
  ];

  const visibleLinks = allLinks; // Add perm checks later

  return (
    <div className="kalki-subnav border-b border-gray-200 bg-white">
      <div className="flex gap-6 px-6 pt-4">
        {visibleLinks.map((link) => {
          const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
          return (
            <Link
              key={link.href}
              href={link.href + query}
              className={\`pb-3 text-sm font-medium border-b-2 transition-colors \${
                isActive 
                  ? "border-[var(--kalki-primary)] text-[var(--kalki-primary)]" 
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }\`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}`;
};

// 1. Top Level SalesNav
fs.writeFileSync(path.join(basePath, 'SalesNav.tsx'), generateNav('SalesNav', [
  { href: "/sales/overview", label: "Overview" },
  { href: "/sales/orders", label: "Orders" },
  { href: "/sales/invoices", label: "Invoices" },
  { href: "/sales/returns", label: "Returns & Credit Notes" },
  { href: "/sales/reports", label: "Reports" },
  { href: "/sales/settings", label: "Settings" }
]));

// 2. Top Level Layout
fs.writeFileSync(path.join(basePath, 'layout.tsx'), `import { AppShell } from "@/components/AppShell";
import { SalesNav } from "./SalesNav";
import type { ReactNode } from "react";

export default function SalesLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell>
      <div className="kalki-module-layout">
        <SalesNav />
        <main className="kalki-module-content flex-1 flex flex-col min-h-screen bg-gray-50">
          {children}
        </main>
      </div>
    </AppShell>
  );
}
`);

// 3. Top Level Page
fs.writeFileSync(path.join(basePath, 'page.tsx'), `import { redirect } from "next/navigation";
export default function Page() { redirect("/sales/overview"); }
`);

// OVERVIEW
fs.writeFileSync(path.join(basePath, 'overview', 'page.tsx'), `"use client";
import { SalesOverview } from "@/components/sales/SalesOverview";
export default function Page() { return <div className="p-6"><SalesOverview /></div>; }
`);

// ORDERS
fs.writeFileSync(path.join(basePath, 'orders', 'OrdersSubNav.tsx'), generateNav('OrdersSubNav', [
  { href: "/sales/orders/billing", label: "Billing" },
  { href: "/sales/orders/status", label: "Order Status" },
  { href: "/sales/orders/pending", label: "Pending Orders" },
  { href: "/sales/orders/completed", label: "Completed Orders" },
  { href: "/sales/orders/cancelled", label: "Cancelled Orders" }
]));
fs.writeFileSync(path.join(basePath, 'orders', 'layout.tsx'), `import { OrdersSubNav } from "./OrdersSubNav";
export default function Layout({ children }: { children: React.ReactNode }) {
  return <><OrdersSubNav />{children}</>;
}
`);
fs.writeFileSync(path.join(basePath, 'orders', 'page.tsx'), `import { redirect } from "next/navigation";
export default function Page() { redirect("/sales/orders/billing"); }
`);
fs.writeFileSync(path.join(basePath, 'orders', 'billing', 'page.tsx'), `"use client";
import { B2BBilling } from "@/components/sales/B2BBilling";
export default function Page() { return <div className="p-6"><B2BBilling /></div>; }
`);
['status', 'pending', 'completed', 'cancelled'].forEach(sub => {
  fs.writeFileSync(path.join(basePath, 'orders', sub, 'page.tsx'), `export default function Page() { return <div className="p-6 text-gray-500">Page under construction</div>; }`);
});

// INVOICES
fs.writeFileSync(path.join(basePath, 'invoices', 'InvoicesSubNav.tsx'), generateNav('InvoicesSubNav', [
  { href: "/sales/invoices/all", label: "All Invoices" },
  { href: "/sales/invoices/tax", label: "Tax Invoices" },
  { href: "/sales/invoices/b2b", label: "B2B Invoices" },
  { href: "/sales/invoices/b2c", label: "B2C Invoices" },
  { href: "/sales/invoices/search", label: "Invoice Search" },
  { href: "/sales/invoices/details", label: "Invoice Details" }
]));
fs.writeFileSync(path.join(basePath, 'invoices', 'layout.tsx'), `import { InvoicesSubNav } from "./InvoicesSubNav";
export default function Layout({ children }: { children: React.ReactNode }) {
  return <><InvoicesSubNav />{children}</>;
}
`);
fs.writeFileSync(path.join(basePath, 'invoices', 'page.tsx'), `import { redirect } from "next/navigation";
export default function Page() { redirect("/sales/invoices/all"); }
`);
['all', 'tax', 'b2b', 'b2c', 'search', 'details'].forEach(sub => {
  fs.writeFileSync(path.join(basePath, 'invoices', sub, 'page.tsx'), `export default function Page() { return <div className="p-6 text-gray-500">Page under construction</div>; }`);
});


// RETURNS
fs.writeFileSync(path.join(basePath, 'returns', 'ReturnsSubNav.tsx'), generateNav('ReturnsSubNav', [
  { href: "/sales/returns/sales-returns", label: "Sales Returns" },
  { href: "/sales/returns/credit-notes", label: "Credit Notes" },
  { href: "/sales/returns/refunds", label: "Refunds" },
  { href: "/sales/returns/cancelled", label: "Cancelled Invoices" }
]));
fs.writeFileSync(path.join(basePath, 'returns', 'layout.tsx'), `import { ReturnsSubNav } from "./ReturnsSubNav";
export default function Layout({ children }: { children: React.ReactNode }) {
  return <><ReturnsSubNav />{children}</>;
}
`);
fs.writeFileSync(path.join(basePath, 'returns', 'page.tsx'), `import { redirect } from "next/navigation";
export default function Page() { redirect("/sales/returns/sales-returns"); }
`);
['sales-returns', 'credit-notes', 'refunds', 'cancelled'].forEach(sub => {
  fs.writeFileSync(path.join(basePath, 'returns', sub, 'page.tsx'), `export default function Page() { return <div className="p-6 text-gray-500">Page under construction</div>; }`);
});


// REPORTS
fs.writeFileSync(path.join(basePath, 'reports', 'ReportsSubNav.tsx'), generateNav('ReportsSubNav', [
  { href: "/sales/reports/sales", label: "Sales Report" },
  { href: "/sales/reports/product", label: "Product-wise Sales" },
  { href: "/sales/reports/customer", label: "Customer-wise Sales" },
  { href: "/sales/reports/branch", label: "Branch-wise Sales" },
  { href: "/sales/reports/tax", label: "Tax/GST Report" },
  { href: "/sales/reports/payment", label: "Payment Report" },
  { href: "/sales/reports/returns", label: "Sales Return Report" },
  { href: "/sales/reports/profit", label: "Profit Reports" }
]));
fs.writeFileSync(path.join(basePath, 'reports', 'layout.tsx'), `import { ReportsSubNav } from "./ReportsSubNav";
export default function Layout({ children }: { children: React.ReactNode }) {
  return <><ReportsSubNav />{children}</>;
}
`);
fs.writeFileSync(path.join(basePath, 'reports', 'page.tsx'), `import { redirect } from "next/navigation";
export default function Page() { redirect("/sales/reports/sales"); }
`);
['sales', 'product', 'customer', 'branch', 'tax', 'payment', 'returns', 'profit'].forEach(sub => {
  fs.writeFileSync(path.join(basePath, 'reports', sub, 'page.tsx'), `export default function Page() { return <div className="p-6 text-gray-500">Page under construction</div>; }`);
});


// SETTINGS
fs.writeFileSync(path.join(basePath, 'settings', 'SettingsSubNav.tsx'), generateNav('SettingsSubNav', [
  { href: "/sales/settings/config", label: "Sales Configuration" },
  { href: "/sales/settings/tax", label: "Tax / GST" },
  { href: "/sales/settings/invoice", label: "Invoice Configuration" },
  { href: "/sales/settings/integrations", label: "Integrations" }
]));
fs.writeFileSync(path.join(basePath, 'settings', 'layout.tsx'), `import { SettingsSubNav } from "./SettingsSubNav";
export default function Layout({ children }: { children: React.ReactNode }) {
  return <><SettingsSubNav />{children}</>;
}
`);
fs.writeFileSync(path.join(basePath, 'settings', 'page.tsx'), `import { redirect } from "next/navigation";
export default function Page() { redirect("/sales/settings/config"); }
`);
['config', 'tax', 'invoice'].forEach(sub => {
  fs.writeFileSync(path.join(basePath, 'settings', sub, 'page.tsx'), `export default function Page() { return <div className="p-6 text-gray-500">Page under construction</div>; }`);
});

fs.writeFileSync(path.join(basePath, 'settings', 'integrations', 'page.tsx'), `"use client";
import { TMBillConfig } from "@/components/integrations/TMBillConfig";
export default function Page() { 
  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Integration Settings</h1>
        <p className="text-gray-500">Configure external system connections and APIs.</p>
      </div>
      <TMBillConfig />
    </div>
  ); 
}
`);

console.log("Scaffold complete.");
