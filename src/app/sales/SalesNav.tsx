"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSessionView } from "@/components/AppShell";

export function SalesNav() {
  const pathname = usePathname();
  const { session, selected } = useSessionView();
  const query = selected ? `?organizationId=${selected.organizationId}&locationId=${selected.locationId}` : "";

  const allLinks = [
    { href: "/sales/overview", label: "Overview", perm: "sales:read" },
    { href: "/sales/orders", label: "Orders", perm: "sales:read" },
    { href: "/sales/invoices", label: "Invoices", perm: "sales:read" },
    { href: "/sales/returns", label: "Returns & Credit Notes", perm: "sales:read" },
    { href: "/sales/reports", label: "Reports", perm: "sales:read" },
    { href: "/sales/settings", label: "Settings", perm: "sales:read" }
  ];

  const visibleLinks = allLinks;

  return (
    <nav className="kalki-module-topbar">
      {visibleLinks.map((link) => {
        const isActive = pathname === link.href || (link.href !== "/sales" && pathname.startsWith(link.href));
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