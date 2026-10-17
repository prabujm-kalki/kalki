"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSessionView } from "@/components/AppShell";
import { Calendar, Settings, UtensilsCrossed } from "lucide-react";

export function EventsNav() {
  const pathname = usePathname();
  const { selected } = useSessionView();

  const query = selected
    ? `?organizationId=${selected.organizationId}&locationId=${selected.locationId}`
    : "";

  const links = [
    {
      name: "Events Command Center",
      href: "/events",
      exact: true,
      icon: <Calendar size={16} />,
    },
    {
      name: "Configuration & Pricing",
      href: "/events/settings",
      exact: false,
      icon: <Settings size={16} />,
    },
  ];

  return (
    <nav className="kalki-module-topbar">
      {links.map((link) => {
        const isActive = link.exact
          ? pathname === link.href
          : pathname === link.href || pathname.startsWith(`${link.href}/`);

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
