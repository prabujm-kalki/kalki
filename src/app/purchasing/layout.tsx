import { AppShell } from "@/components/AppShell";
import Link from "next/link";
import type { ReactNode } from "react";

export default function PurchasingLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell>
      <div className="app-main">
        <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
          <h1 className="page-title" style={{ marginBottom: '1rem' }}>Purchasing & Inventory</h1>
          <nav className="app-header-nav" style={{ gap: '1rem' }}>
            <Link href="/purchasing" className="nav-link">Dashboard</Link>
            <Link href="/purchasing/items" className="nav-link">Items</Link>
            <Link href="/purchasing/vendors" className="nav-link">Vendors</Link>
            <Link href="/purchasing/configuration" className="nav-link">Configuration</Link>
            <Link href="/purchasing/manual" className="nav-link">User Manual</Link>
          </nav>
        </div>
        {children}
      </div>
    </AppShell>
  );
}
