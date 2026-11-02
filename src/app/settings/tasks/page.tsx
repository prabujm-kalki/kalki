"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { StatusMessage } from "@/components/StatusMessage";

function SettingsTasksRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const q = searchParams.toString();
    router.replace(`/tasks/configure${q ? `?${q}` : ""}`);
  }, [router, searchParams]);

  return (
    <div style={{ padding: "40px", textAlign: "center" }}>
      <StatusMessage tone="loading">Redirecting to Tasks Configuration...</StatusMessage>
    </div>
  );
}

export default function SettingsTasksPage() {
  return (
    <Suspense fallback={<StatusMessage tone="loading">Redirecting...</StatusMessage>}>
      <SettingsTasksRedirect />
    </Suspense>
  );
}
