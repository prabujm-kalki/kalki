"use client";

import { useEffect, useRef } from "react";
import { playNotificationTone } from "@/lib/audio";
import { apiGet } from "@/lib/api";

export function NotificationPoller({ 
  organizationId, 
  locationId 
}: { 
  organizationId: string; 
  locationId?: string | null; 
}) {
  const lastUpdateRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!organizationId) return;

    // Reset last update tracker whenever location changes so past tasks from another branch don't chime
    lastUpdateRef.current = Date.now();

    const interval = setInterval(async () => {
      try {
        const queryParams = new URLSearchParams({ organizationId });
        if (locationId && locationId !== "ALL") {
          queryParams.set("locationId", locationId);
        }

        const payload = await apiGet<{ tasks: any[] }>(`/api/tasks?${queryParams.toString()}`);
        const tasks = payload.tasks || [];
        
        let shouldPlayTone: string | null = null;
        let maxImportance = 0; // 0=none, 1=default, 2=chime, 3=alert, 4=urgent

        const toneMap: Record<string, number> = {
          "none": 0,
          "silent": 0,
          "default": 1,
          "level-1": 1,
          "chime": 2,
          "level-2": 2,
          "alert": 3,
          "level-3": 3,
          "level-4": 4,
          "urgent": 5,
          "level-5": 5
        };

        for (const task of tasks) {
          if (!task || task.status !== "pending") continue;

          // Routine/Task initial alerts (level 0) should only sound for the direct assignee
          const isAssignedToUser = Boolean(task.isAssignedToCurrentUser);
          const level = task.escalationLevel || 0;

          // If the task is at Level 0 (normal trigger/start) and NOT assigned to the logged-in user, skip audio tone
          if (level === 0 && !task.contextData?.isWarning && !isAssignedToUser) {
            continue;
          }

          const taskUpdatedTime = new Date(task.updatedAt || task.createdAt).getTime();
          if (taskUpdatedTime > lastUpdateRef.current) {
            // This task was just created or updated (escalated)
            const config = task.triggerConfig || {};
            
            let tone = "default";
            if (task.contextData?.isWarning) {
              // Warning only plays for assignee
              if (!isAssignedToUser) continue;
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
  }, [organizationId, locationId]);

  return null; // Silent background component
}
