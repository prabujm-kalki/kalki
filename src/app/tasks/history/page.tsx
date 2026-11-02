"use client";

import { Suspense } from "react";
import { StatusMessage } from "@/components/StatusMessage";
import { TasksHistoryClient } from "@/components/tasks/TasksHistoryClient";

export default function TasksHistoryPage() {
  return (
    <Suspense fallback={<StatusMessage tone="loading">Loading Tasks History...</StatusMessage>}>
      <TasksHistoryClient />
    </Suspense>
  );
}
