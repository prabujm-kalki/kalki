import { AppShell } from "@/components/AppShell";
import { MarketingNav } from "./MarketingNav";
import type { ReactNode } from "react";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell>
      <div className="kalki-module-layout">
        <MarketingNav />
        <main className="kalki-module-content" style={{ padding: "1.5rem" }}>
          {children}
        </main>
      </div>
    </AppShell>
  );
}
