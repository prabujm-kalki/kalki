"use client";

import { Suspense } from "react";
import { StatusMessage } from "@/components/StatusMessage";
import { TasksDashboard } from "@/components/tasks/TasksDashboard";

export default function TasksPage() {
  return (
    <Suspense fallback={<StatusMessage tone="loading">Loading Tasks...</StatusMessage>}>
      <TasksDashboard />
    </Suspense>
  );
}
