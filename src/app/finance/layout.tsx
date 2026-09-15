import { ReactNode } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";

export default function FinanceLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell>
      <div className="panel" style={{ marginBottom: "1.5rem" }}>
        <div className="row" style={{ padding: "0.5rem" }}>
          <Link href="/finance" className="nav-link">Dashboard</Link>
          <Link href="/finance/invoices" className="nav-link">Supplier Invoices</Link>
          <Link href="/finance/payments" className="nav-link">Payments</Link>
        </div>
      </div>
      {children}
    </AppShell>
  );
}
