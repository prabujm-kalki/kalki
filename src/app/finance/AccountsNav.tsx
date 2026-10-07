"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSessionView } from "@/components/AppShell";

export function AccountsNav() {
  const pathname = usePathname();
  const { session, selected } = useSessionView();
  const query = selected ? `?organizationId=${selected.organizationId}&locationId=${selected.locationId}` : "";

  const isOwner = session?.isOwner;
  const permissions = selected?.permissions || [];

  const hasAccess = (requiredPermission: string) => {
    if (isOwner) return true;
    return permissions.includes(requiredPermission);
  };

  const allLinks = [
    { href: "/finance", label: "Dashboard", perm: "finance.dashboard:read" },
    { href: "/finance/sales-receivables", label: "Sales & Receivables", perm: "finance.sales_&_receivables:read" },
    { href: "/finance/purchases-payables", label: "Purchases & Payables", perm: "finance.purchases_&_payables:read" },
    { href: "/finance/banking", label: "Banking & Cash", perm: "finance.banking_&_cash:read" },
    { href: "/finance/accounting", label: "Accounting", perm: "finance.accounting:read" },
    { href: "/finance/reports", label: "Reports", perm: "finance.reports:read" },
    { href: "/finance/settings", label: "Settings", perm: "finance.settings:read" },
  ];

  const visibleLinks = allLinks.filter(link => hasAccess(link.perm));

  return (
    <nav className="kalki-module-topbar">
      {visibleLinks.map((link) => {
        const isActive = pathname === link.href || (link.href !== "/finance" && pathname.startsWith(link.href));
        return (
          <Link
            key={link.href}
            href={`${link.href}${query}`}
            className={`kalki-module-link ${isActive ? "active" : ""}`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
