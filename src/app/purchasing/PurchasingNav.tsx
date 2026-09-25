"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSessionView } from "@/components/AppShell";
import { LayoutDashboard, Box, Store, Settings, BookOpen } from "lucide-react";

export function PurchasingNav() {
  const pathname = usePathname();
  const { selected } = useSessionView();
  
  const query = selected ? `?organizationId=${selected.organizationId}&locationId=${selected.locationId}` : "";

  const links = [
    { name: "Dashboard", href: `/purchasing`, exact: true, icon: <LayoutDashboard size={16} /> },
    { name: "Items", href: `/purchasing/items`, exact: false, icon: <Box size={16} /> },
    { name: "Vendors", href: `/purchasing/vendors`, exact: false, icon: <Store size={16} /> },
    { name: "Configuration", href: `/purchasing/configuration`, exact: false, icon: <Settings size={16} /> },
    { name: "User Manual", href: `/purchasing/manual`, exact: false, icon: <BookOpen size={16} /> },
  ];

  return (
    <nav className="kalki-module-topbar">
      {links.map((link) => {
        const isActive = link.exact 
          ? pathname === link.href 
          : pathname.startsWith(link.href);
        
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
