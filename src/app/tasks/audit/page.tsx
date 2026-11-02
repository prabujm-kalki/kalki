"use client";

import { Suspense } from "react";
import { StatusMessage } from "@/components/StatusMessage";
import { TasksAuditClient } from "@/components/tasks/TasksAuditClient";

export default function TasksAuditPage() {
  return (
    <Suspense fallback={<StatusMessage tone="loading">Loading Tasks Audit Queue...</StatusMessage>}>
      <TasksAuditClient />
    </Suspense>
  );
}
