"use client";

import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { StatusMessage } from "@/components/StatusMessage";
import { WorkQueue } from "@/components/work/WorkQueue";

export default function WorkPage() {
  return (
    <Suspense fallback={<main className="app-main"><StatusMessage tone="loading">Loading work…</StatusMessage></main>}>
      <AppShell>
        <WorkQueue />
      </AppShell>
    </Suspense>
  );
}
