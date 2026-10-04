"use client";

import { useEffect, useRef } from "react";
import { playNotificationTone } from "@/lib/audio";
import { apiGet } from "@/lib/api";

export function NotificationPoller({ organizationId }: { organizationId: string }) {
  const lastUpdateRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!organizationId) return;

    const interval = setInterval(async () => {
      try {
        const payload = await apiGet<{ tasks: any[] }>(`/api/tasks?organizationId=${organizationId}`);
        const tasks = payload.tasks || [];
        
        let shouldPlayTone: string | null = null;
        let maxImportance = 0; // 0=none, 1=default, 2=chime, 3=alert, 4=urgent

        const toneMap: Record<string, number> = {
          "default": 1,
          "chime": 2,
          "alert": 3,
          "urgent": 4
        };

        for (const task of tasks) {
          
          if (!task || task.status !== "pending") continue;

          const taskUpdatedTime = new Date(task.updatedAt || task.createdAt).getTime();
          if (taskUpdatedTime > lastUpdateRef.current) {
            // This task was just created or updated (escalated)
            const level = task.escalationLevel || 0;
            const config = task.triggerConfig || {};
            
            let tone = "default";
            if (task.contextData?.isWarning) {
              tone = "chime"; // Play a chime for warnings
            } else if (level === 0) {
              tone = config.reminderTone || "default";
            } else {
              const escTones = config.escalationTones || [];
              tone = escTones[level - 1] || "alert";
            }

            const importance = toneMap[tone] || 1;
            if (importance > maxImportance) {
              maxImportance = importance;
              shouldPlayTone = tone;
            }
          }
        }

        if (shouldPlayTone) {
          playNotificationTone(shouldPlayTone);
        }

        lastUpdateRef.current = Date.now();
      } catch (err) {
        console.error("Poller error", err);
      }
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(interval);
  }, [organizationId]);

  return null; // Silent background component
}
