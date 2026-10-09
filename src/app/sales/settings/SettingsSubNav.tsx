"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSessionView } from "@/components/AppShell";

export function SettingsSubNav() {
  const pathname = usePathname();
  const { selected } = useSessionView();
  const query = selected ? `?organizationId=${selected.organizationId}&locationId=${selected.locationId}` : "";

  const links = [
    { href: "/sales/settings/config", label: "Sales Configuration" },
    { href: "/sales/settings/tax", label: "Tax / GST" },
    { href: "/sales/settings/invoice", label: "Invoice Configuration" },
    { href: "/sales/settings/returns", label: "Return Policies" },
    { href: "/sales/settings/integrations", label: "Integrations" }
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