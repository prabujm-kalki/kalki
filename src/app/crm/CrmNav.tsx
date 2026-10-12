"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSessionView } from "@/components/AppShell";

export function CrmNav() {
  const pathname = usePathname();
  const { selected } = useSessionView();
  const query = selected ? `?organizationId=${selected.organizationId}&locationId=${selected.locationId}` : "";

  const allLinks = [
    { href: "/crm/templates", label: "Templates", perm: "crm:read" }
  ];

  return (
    <nav className="kalki-module-topbar">
      {allLinks.map((link) => {
        const isActive = pathname === link.href || (link.href !== "/crm" && pathname.startsWith(link.href));
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
