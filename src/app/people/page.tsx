"use client";

import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { StatusMessage } from "@/components/StatusMessage";
import { PeopleDashboard } from "@/components/people/PeopleDashboard";

export default function PeoplePage() {
  return (
    <Suspense fallback={<main className="app-main"><StatusMessage tone="loading">Loading people…</StatusMessage></main>}>
      <AppShell>
        <PeopleDashboard />
      </AppShell>
    </Suspense>
  );
}
