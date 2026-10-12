"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSessionView } from "@/components/AppShell";
import { Users, PieChart, Star, Briefcase, ShieldCheck, Headphones, LayoutTemplate } from "lucide-react";

export function CrmNav() {
  const pathname = usePathname();
  const { selected } = useSessionView();
  const query = selected ? `?organizationId=${selected.organizationId}&locationId=${selected.locationId}` : "";

  const allLinks = [
    { href: "/crm/customers", label: "Customer Master", icon: Users },
    { href: "/crm/intelligence", label: "Auto-Segmentation", icon: PieChart },
    { href: "/crm/scoring", label: "Predictive Scoring", icon: Star },
    { href: "/crm/leads", label: "B2B & Catering Leads", icon: Briefcase },
    { href: "/crm/compliance", label: "Consent Center", icon: ShieldCheck },
    { href: "/crm/service", label: "Service Tickets", icon: Headphones },
    { href: "/crm/templates", label: "Templates", icon: LayoutTemplate },
  ];

  return (
    <nav className="kalki-module-topbar" style={{ display: "flex", gap: "0.25rem", borderBottom: "1px solid #e2e8f0", backgroundColor: "#ffffff", padding: "0 1.5rem", overflowX: "auto" }}>
      {allLinks.map((link) => {
        const Icon = link.icon;
        const isActive = pathname === link.href || (link.href !== "/crm" && pathname.startsWith(`${link.href}/`));
        return (
          <Link
            key={link.href}
            href={`${link.href}${query}`}
            className={`kalki-module-link ${isActive ? "active" : ""}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.45rem",
              padding: "0.75rem 0.9rem",
              fontSize: "0.85rem",
              fontWeight: isActive ? 600 : 500,
              color: isActive ? "#d97706" : "#64748b",
              borderBottom: isActive ? "2px solid #d97706" : "2px solid transparent",
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
