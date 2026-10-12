import { AppShell } from "@/components/AppShell";
import { CrmNav } from "./CrmNav";
import type { ReactNode } from "react";

export default function CrmLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell>
      <div className="kalki-module-layout">
        <CrmNav />
        <main className="kalki-module-content flex-1 flex flex-col min-h-screen bg-gray-50">
          {children}
        </main>
      </div>
    </AppShell>
  );
}
