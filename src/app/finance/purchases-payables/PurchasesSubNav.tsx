"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSessionView } from "@/components/AppShell";

export function PurchasesSubNav() {
  const pathname = usePathname();
  const { selected, session } = useSessionView();
  const query = selected ? `?organizationId=${selected.organizationId}&locationId=${selected.locationId}` : "";

  const links = [
    { href: "/finance/purchases-payables/bills", label: "Bills" },
    { href: "/finance/purchases-payables/payments", label: "Payments" },
    { href: "/finance/purchases-payables/vendor-balances", label: "Vendor Balances" },
    { href: "/finance/purchases-payables/debit-notes", label: "Debit Notes" },
    // { href: "/finance/purchases-payables/ageing", label: "Ageing" }
  ];
  
  if (session?.isOwner || selected?.permissions.some(p => p.includes("payables") && p.includes("approve"))) {
    links.push({ href: "/finance/purchases-payables/audit-queue", label: "Audit Queue" });
  }

  return (
    <div style={{ padding: "0.75rem 1.5rem", borderBottom: "1px solid var(--kalki-border)", backgroundColor: "var(--kalki-bg-primary)", display: "flex", gap: "1.5rem" }}>
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
              transition: "all 0.2s"
            }}
          >
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}
