"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSessionView } from "@/components/AppShell";

export function ReportsSubNav() {
  const pathname = usePathname();
  const { selected } = useSessionView();
  const query = selected ? `?organizationId=${selected.organizationId}&locationId=${selected.locationId}` : "";

  const links = [
    { href: "/sales/reports/sales", label: "Sales Report" },
    { href: "/sales/reports/item-wise", label: "Item-wise Sales" },
    { href: "/sales/reports/customer", label: "Customer-wise Sales" },
    { href: "/sales/reports/branch", label: "Branch-wise Sales" },
    { href: "/sales/reports/tax", label: "Tax/GST Report" },
    { href: "/sales/reports/payment", label: "Payment Report" },
    { href: "/sales/reports/returns", label: "Sales Return Report" },
    { href: "/sales/reports/profit", label: "Profit Reports" }
  ];

  return (
    <div style={{ padding: "0.75rem 1.5rem", borderBottom: "1px solid var(--kalki-border)", backgroundColor: "var(--kalki-bg-primary)", display: "flex", gap: "1.5rem", overflowX: 'auto' }}>
      {links.map((link) => {
        const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
        return (
          <Link
            key={link.href}
            href={`${link.href}${query}`}
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
}