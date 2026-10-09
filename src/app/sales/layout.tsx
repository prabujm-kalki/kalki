import { AppShell } from "@/components/AppShell";
import { SalesNav } from "./SalesNav";
import type { ReactNode } from "react";

export default function SalesLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell>
      <div className="kalki-module-layout">
        <SalesNav />
        <main className="kalki-module-content flex-1 flex flex-col min-h-screen bg-gray-50">
          {children}
        </main>
      </div>
    </AppShell>
  );
}
