"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSessionView } from "@/components/AppShell";
import {
  LayoutDashboard,
  Megaphone,
  Users,
  LayoutTemplate,
  Bot,
  BarChart2,
  MessageSquare,
} from "lucide-react";

export function MarketingNav() {
  const pathname = usePathname();
  const { selected } = useSessionView();
  const query = selected ? `?organizationId=${selected.organizationId}&locationId=${selected.locationId}` : "";

  const allLinks = [
    { href: "/marketing/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/marketing/campaigns", label: "Campaigns", icon: Megaphone },
    { href: "/marketing/audiences", label: "Audiences", icon: Users },
    { href: "/marketing/templates", label: "Template Studio", icon: LayoutTemplate },
    { href: "/marketing/automations", label: "Automated Journeys", icon: Bot },
    { href: "/marketing/analytics", label: "ROI Analytics", icon: BarChart2 },
    { href: "/marketing/inbox", label: "Two-Way Inbox", icon: MessageSquare },
  ];

  return (
    <nav
      className="kalki-module-topbar"
      style={{
        display: "flex",
        gap: "0.25rem",
        borderBottom: "1px solid #e2e8f0",
        backgroundColor: "#ffffff",
        padding: "0 1.5rem",
        overflowX: "auto",
      }}
    >
      {allLinks.map((link) => {
        const Icon = link.icon;
        const isActive =
          pathname === link.href || (link.href !== "/marketing" && pathname.startsWith(`${link.href}/`));
        return (
          <Link
            key={link.href}
            href={`${link.href}${query}`}
            className={`kalki-module-link ${isActive ? "active" : ""}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.45rem",
              padding: "0.75rem 0.95rem",
              fontSize: "0.85rem",
              fontWeight: isActive ? 600 : 500,
              color: isActive ? "#16a34a" : "#64748b",
              borderBottom: isActive ? "2px solid #16a34a" : "2px solid transparent",
              textDecoration: "none",
              whiteSpace: "nowrap",
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
