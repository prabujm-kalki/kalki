"use client";

import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { StatusMessage } from "@/components/StatusMessage";
import { TasksDashboard } from "@/components/tasks/TasksDashboard";

export default function TasksPage() {
  return (
    <Suspense fallback={<main className="app-main"><StatusMessage tone="loading">Loading Task Engine...</StatusMessage></main>}>
      <AppShell>
        <div className="kalki-page">
          <TasksDashboard />
        </div>
      </AppShell>
    </Suspense>
  );
}
