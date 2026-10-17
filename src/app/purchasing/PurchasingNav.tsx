"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSessionView } from "@/components/AppShell";
import { LayoutDashboard, Box, Store, Settings, BookOpen, ShoppingCart, BarChart2 } from "lucide-react";

type PurchasingNavLink = {
  name: string;
  href: string;
  exact: boolean;
  icon: any;
  perm?: string;
};

const NAV_LINKS: PurchasingNavLink[] = [
  { name: "Dashboard", href: `/purchasing/dashboard`, exact: false, icon: LayoutDashboard, perm: "purchasing.dashboard:read" },
  { name: "Create PO", href: `/purchasing/purchase-orders/create`, exact: false, icon: ShoppingCart, perm: "purchasing.create_po:create" },
  { name: "Items", href: `/purchasing/items`, exact: false, icon: Box, perm: "purchasing.items:read" },
  { name: "Vendors", href: `/purchasing/vendors`, exact: false, icon: Store, perm: "purchasing.vendors:read" },
  { name: "Reports", href: `/purchasing/reports`, exact: false, icon: BarChart2, perm: "purchasing.reports:read" },
  { name: "Configuration", href: `/purchasing/configuration`, exact: false, icon: Settings, perm: "purchasing.configuration:read" },
  { name: "User Manual", href: `/purchasing/manual`, exact: false, icon: BookOpen, perm: "purchasing.manual:read" },
];

export function PurchasingNav() {
  const pathname = usePathname();
  const { session, selected } = useSessionView();
  
  const query = useMemo(() => {
    return selected?.organizationId && selected?.locationId
      ? `?organizationId=${selected.organizationId}&locationId=${selected.locationId}`
      : "";
  }, [selected?.organizationId, selected?.locationId]);

  const isOwner = session?.isOwner;
  const permissions = selected?.permissions || [];

  const hasAccess = (requiredPermission?: string) => {
    if (!requiredPermission || isOwner) return true;
    return permissions.includes(requiredPermission);
  };

  const visibleLinks = NAV_LINKS.filter(link => hasAccess(link.perm));

  return (
    <nav className="kalki-module-topbar">
      {visibleLinks.map((link) => {
        const isActive = link.exact 
          ? pathname === link.href 
          : pathname.startsWith(link.href);
        const Icon = link.icon;
        
        return (
          <Link
            key={link.name}
            href={`${link.href}${query}`}
            className={`kalki-module-link ${isActive ? "active" : ""}`}
            prefetch={false}
          >
            <Icon size={16} />
            {link.name}
          </Link>
        );
      })}
    </nav>
  );
}

