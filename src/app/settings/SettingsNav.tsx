"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSessionView } from "@/components/AppShell";
import { Network, BookOpen, Shield, Users, Database } from "lucide-react";

export function SettingsNav() {
  const pathname = usePathname();
  const { selected, session } = useSessionView();
  
  const query = selected ? `?organizationId=${selected.organizationId}&locationId=${selected.locationId}` : "";

  // The navigation links match what was in the dashboard cards
  const links = [
    { name: "Organization Chart", href: `/settings/organization`, icon: <Network size={16} /> },
    { name: "Master Data", href: `/settings/master-data`, icon: <Database size={16} /> },
    { name: "Access & Roles", href: `/settings/roles`, icon: <Shield size={16} /> },
    { name: "Users", href: `/settings/users`, icon: <Users size={16} /> },
    // If they have import-fields, we could add it, but it wasn't on the dashboard
    // { name: "Import Fields", href: `/settings/import-fields`, icon: <Database size={16} /> },
  ];

  return (
    <nav className="kalki-module-topbar">
      {links.map((link) => {
        // Highlight if current path starts with the link href
        const isActive = pathname.startsWith(link.href);
        
        return (
          <Link
            key={link.name}
            href={`${link.href}${query}`}
            className={`kalki-module-link ${isActive ? "active" : ""}`}
          >
            {link.icon}
            {link.name}
          </Link>
        );
      })}
    </nav>
  );
}
