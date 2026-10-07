import { AppShell } from "@/components/AppShell";
import { AccountsNav } from "./AccountsNav";
import type { ReactNode } from "react";

export default function AccountsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <AppShell>
      <div className="kalki-module-layout">
        <AccountsNav />
        <main className="kalki-module-content flex-1 flex flex-col min-h-screen bg-gray-50">
          {children}
        </main>
      </div>
    </AppShell>
  );
}
