"use client";

import { Suspense } from "react";
import { StatusMessage } from "@/components/StatusMessage";
import { TaskConfigurationClient } from "@/components/tasks/TaskConfigurationClient";

export default function TasksConfigurePage() {
  return (
    <Suspense fallback={<StatusMessage tone="loading">Loading Routine Configurations...</StatusMessage>}>
      <TaskConfigurationClient />
    </Suspense>
  );
}
