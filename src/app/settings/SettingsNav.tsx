"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSessionView } from "@/components/AppShell";
import { Network, BookOpen, Shield, Users, Database, CheckSquare } from "lucide-react";

export function SettingsNav() {
  const pathname = usePathname();
  const { selected, session } = useSessionView();
  
  const query = selected ? `?organizationId=${selected.organizationId}&locationId=${selected.locationId}` : "";

  const links = [
    { name: "General Settings", href: `/settings/general`, icon: <Network size={16} /> },
    { name: "Organization Chart", href: `/settings/organization`, icon: <Network size={16} /> },
    { name: "Master Data", href: `/settings/master-data`, icon: <Database size={16} /> },
    { name: "Tasks Engine", href: `/settings/tasks`, icon: <Network size={16} /> },
    { name: "Access & Roles", href: `/settings/roles`, icon: <Shield size={16} /> },
    { name: "Users", href: `/settings/users`, icon: <Users size={16} /> },
    { name: "Approval Limits", href: `/settings/approval-limits`, icon: <CheckSquare size={16} /> },
    { name: "Statutory Settings", href: `/settings/statutory`, icon: <Database size={16} /> },
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
