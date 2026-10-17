import { AppShell } from "@/components/AppShell";
import { EventsNav } from "./EventsNav";
import type { ReactNode } from "react";

export default function EventsLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell>
      <div className="kalki-module-layout">
        <EventsNav />
        <main className="kalki-module-content">
          {children}
        </main>
      </div>
    </AppShell>
  );
}
