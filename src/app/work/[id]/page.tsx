"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { StatusMessage } from "@/components/StatusMessage";
import { WorkDetail } from "@/components/work/WorkDetail";

export default function WorkDetailPage() {
  const params = useParams<{ id: string }>();
  const instanceId = Array.isArray(params.id) ? params.id[0] : params.id;
  return (
    <Suspense fallback={<main className="app-main"><StatusMessage tone="loading">Loading work…</StatusMessage></main>}>
      <AppShell>
        {instanceId ? <WorkDetail instanceId={instanceId} /> : <StatusMessage tone="error">Work instance id is required</StatusMessage>}
      </AppShell>
    </Suspense>
  );
}
