"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { StatusMessage } from "@/components/StatusMessage";
import { EmployeeProfile } from "@/components/people/EmployeeProfile";

export default function EmployeeProfilePage() {
  const params = useParams<{ id: string }>();
  const employeeId = Array.isArray(params.id) ? params.id[0] : params.id;
  return (
    <Suspense fallback={<main className="app-main"><StatusMessage tone="loading">Loading employee…</StatusMessage></main>}>
      <AppShell>
        {employeeId ? <EmployeeProfile employeeId={employeeId} /> : <StatusMessage tone="error">Employee id is required</StatusMessage>}
      </AppShell>
    </Suspense>
  );
}
