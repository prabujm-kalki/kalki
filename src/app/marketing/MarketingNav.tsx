"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSessionView } from "@/components/AppShell";
import { BarChart3, Megaphone, MessageSquare, LayoutTemplate, Users, Bot } from "lucide-react";

export function MarketingNav() {
  const pathname = usePathname();
  const { selected } = useSessionView();
  const query = selected ? `?organizationId=${selected.organizationId}&locationId=${selected.locationId}` : "";

  const allLinks = [
    { href: "/marketing", label: "Overview", icon: BarChart3, exact: true },
    { href: "/marketing/campaigns", label: "Campaigns", icon: Megaphone },
    { href: "/marketing/inbox", label: "Two-Way Inbox", icon: MessageSquare },
    { href: "/marketing/templates", label: "Template Studio", icon: LayoutTemplate },
    { href: "/marketing/audiences", label: "Audiences & Segments", icon: Users },
    { href: "/marketing/automations", label: "Automations", icon: Bot },
  ];

  return (
    <nav className="kalki-module-topbar" style={{ display: "flex", gap: "0.25rem", borderBottom: "1px solid #e2e8f0", backgroundColor: "#ffffff", padding: "0 1.5rem" }}>
      {allLinks.map((link) => {
        const Icon = link.icon;
        const isActive = link.exact ? pathname === link.href : pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={`${link.href}${query}`}
            className={`kalki-module-link ${isActive ? "active" : ""}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.45rem",
              padding: "0.75rem 1rem",
              fontSize: "0.875rem",
              fontWeight: isActive ? 600 : 500,
              color: isActive ? "#16a34a" : "#64748b",
              borderBottom: isActive ? "2px solid #16a34a" : "2px solid transparent",
              textDecoration: "none",
              transition: "all 0.15s ease",
            }}
          >
            <Icon size={16} />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
