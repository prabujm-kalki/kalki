import { AppShell } from "@/components/AppShell";
import type { ReactNode } from "react";
import { PurchasingNav } from "./PurchasingNav";

export default function PurchasingLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell>
      <div className="kalki-module-layout">
        <PurchasingNav />
        <main className="kalki-module-content">
          {children}
        </main>
      </div>
    </AppShell>
  );
}
