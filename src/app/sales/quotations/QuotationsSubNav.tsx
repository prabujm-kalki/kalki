"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

export function QuotationsSubNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const orgId = searchParams.get("organizationId");
  const locId = searchParams.get("locationId");
  const query = orgId && locId ? `?organizationId=${orgId}&locationId=${locId}` : "";

  const navItems = [
    { href: "/sales/quotations", label: "All Quotations" },
    { href: "/sales/quotations/new", label: "+ New Quotation" },
  ];

  return (
    <div
      className="no-print"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        marginBottom: "20px",
        borderBottom: "1px solid #e2e8f0",
        paddingBottom: "10px",
      }}
    >
      {navItems.map((item) => {
        const isActive =
          item.href === "/sales/quotations"
            ? pathname === "/sales/quotations"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={`${item.href}${query}`}
            style={{
              padding: "7px 14px",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: 600,
              textDecoration: "none",
              color: isActive ? "#ffffff" : "#475569",
              backgroundColor: isActive ? "#0f172a" : "transparent",
              transition: "all 0.15s ease",
            }}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

