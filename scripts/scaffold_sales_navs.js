const fs = require('fs');
const path = require('path');

const basePath = path.join(__dirname, '..', 'src', 'app', 'sales');

const generateMain = (title, items) => {
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

  const visibleLinks = allLinks;

  return (
    <nav className="kalki-module-topbar">
      {visibleLinks.map((link) => {
        const isActive = pathname === link.href || (link.href !== "/sales" && pathname.startsWith(link.href));
        return (
          <Link
            key={link.href}
            href={\`\${link.href}\${query}\`}
            className={\`kalki-module-link \${isActive ? "active" : ""}\`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}`;
};

const generateSub = (title, items) => {
  const links = items.map(item => `{ href: "${item.href}", label: "${item.label}" }`).join(',\n    ');
  return `"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSessionView } from "@/components/AppShell";

export function ${title}() {
  const pathname = usePathname();
  const { selected } = useSessionView();
  const query = selected ? \`?organizationId=\${selected.organizationId}&locationId=\${selected.locationId}\` : "";

  const links = [
    ${links}
  ];

  return (
    <div style={{ padding: "0.75rem 1.5rem", borderBottom: "1px solid var(--kalki-border)", backgroundColor: "var(--kalki-bg-primary)", display: "flex", gap: "1.5rem", overflowX: 'auto' }}>
      {links.map((link) => {
        const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
        return (
          <Link
            key={link.href}
            href={\`\${link.href}\${query}\`}
            style={{
              textDecoration: "none",
              fontSize: "0.875rem",
              fontWeight: isActive ? 600 : 500,
              color: isActive ? "var(--kalki-primary)" : "var(--kalki-text-secondary)",
              borderBottom: isActive ? "2px solid var(--kalki-primary)" : "2px solid transparent",
              paddingBottom: "0.5rem",
              transition: "all 0.2s",
              whiteSpace: "nowrap"
            }}
          >
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}`;
};

// 1. Top Level SalesNav
fs.writeFileSync(path.join(basePath, 'SalesNav.tsx'), generateMain('SalesNav', [
  { href: "/sales/overview", label: "Overview" },
  { href: "/sales/orders", label: "Orders" },
  { href: "/sales/invoices", label: "Invoices" },
  { href: "/sales/returns", label: "Returns & Credit Notes" },
  { href: "/sales/reports", label: "Reports" },
  { href: "/sales/settings", label: "Settings" }
]));

// ORDERS
fs.writeFileSync(path.join(basePath, 'orders', 'OrdersSubNav.tsx'), generateSub('OrdersSubNav', [
  { href: "/sales/orders/billing", label: "Billing" },
  { href: "/sales/orders/status", label: "Order Status" },
  { href: "/sales/orders/pending", label: "Pending Orders" },
  { href: "/sales/orders/completed", label: "Completed Orders" },
  { href: "/sales/orders/cancelled", label: "Cancelled Orders" }
]));

// INVOICES
fs.writeFileSync(path.join(basePath, 'invoices', 'InvoicesSubNav.tsx'), generateSub('InvoicesSubNav', [
  { href: "/sales/invoices/all", label: "All Invoices" },
  { href: "/sales/invoices/tax", label: "Tax Invoices" },
  { href: "/sales/invoices/b2b", label: "B2B Invoices" },
  { href: "/sales/invoices/b2c", label: "B2C Invoices" },
  { href: "/sales/invoices/search", label: "Invoice Search" },
  { href: "/sales/invoices/details", label: "Invoice Details" }
]));

// RETURNS
fs.writeFileSync(path.join(basePath, 'returns', 'ReturnsSubNav.tsx'), generateSub('ReturnsSubNav', [
  { href: "/sales/returns/sales-returns", label: "Sales Returns" },
  { href: "/sales/returns/credit-notes", label: "Credit Notes" },
  { href: "/sales/returns/refunds", label: "Refunds" },
  { href: "/sales/returns/cancelled", label: "Cancelled Invoices" }
]));

// REPORTS
fs.writeFileSync(path.join(basePath, 'reports', 'ReportsSubNav.tsx'), generateSub('ReportsSubNav', [
  { href: "/sales/reports/sales", label: "Sales Report" },
  { href: "/sales/reports/product", label: "Product-wise Sales" },
  { href: "/sales/reports/customer", label: "Customer-wise Sales" },
  { href: "/sales/reports/branch", label: "Branch-wise Sales" },
  { href: "/sales/reports/tax", label: "Tax/GST Report" },
  { href: "/sales/reports/payment", label: "Payment Report" },
  { href: "/sales/reports/returns", label: "Sales Return Report" },
  { href: "/sales/reports/profit", label: "Profit Reports" }
]));

// SETTINGS
fs.writeFileSync(path.join(basePath, 'settings', 'SettingsSubNav.tsx'), generateSub('SettingsSubNav', [
  { href: "/sales/settings/config", label: "Sales Configuration" },
  { href: "/sales/settings/tax", label: "Tax / GST" },
  { href: "/sales/settings/invoice", label: "Invoice Configuration" },
  { href: "/sales/settings/integrations", label: "Integrations" }
]));

console.log("Navigations updated to match Finance module exactly.");
