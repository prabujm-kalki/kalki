"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getSessionContext } from "@/domains/session/service";
import { locations } from "@/db/schema";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { DashboardScopeContext, ExecutiveCockpitPulse } from "@/domains/dashboard/types";
import { getTasksPulse } from "@/domains/dashboard/taskPulseService";
import { getAttendancePulse } from "@/domains/dashboard/attendancePulseService";
import { getPurchasingPulse } from "@/domains/dashboard/purchasingPulseService";
import { getEventsPulse } from "@/domains/dashboard/eventsPulseService";
import { getBranchComparisonMatrix } from "@/domains/dashboard/branchMatrixService";
import { resolveDateRange } from "@/domains/dashboard/dateRangeResolver";

export async function fetchExecutiveCockpitPulse(params?: {
  organizationId?: string;
  locationId?: string;
  preset?: string;
  from?: string;
  to?: string;
}): Promise<{
  success: boolean;
  data?: ExecutiveCockpitPulse;
  error?: string;
}> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const context = await getSessionContext(session.user);
    const primaryScope = context.scopes[0];
    const organizationId = params?.organizationId || primaryScope?.organizationId;
    const rawLocationId = params?.locationId || primaryScope?.locationId;
    const isAllLocations = !rawLocationId || rawLocationId === "ALL";
    const locationId = isAllLocations ? null : rawLocationId;

    if (!organizationId) {
      return { success: false, error: "No organization context available." };
    }

    let locationName: string | undefined;
    if (locationId) {
      const [loc] = await db
        .select({ name: locations.name })
        .from(locations)
        .where(eq(locations.id, locationId));
      locationName = loc?.name;
    }

    const resolvedRange = resolveDateRange(params?.preset, params?.from, params?.to);

    const scopeContext: DashboardScopeContext = {
      organizationId,
      locationId: locationId || undefined,
      userId: session.user.id,
      isOwner: context.isOwner || false,
      dateRangePreset: resolvedRange.preset,
      fromDate: resolvedRange.fromDate,
      toDate: resolvedRange.toDate,
    };

    // Parallel async execution via Promise.allSettled
    const [tasksRes, attRes, purchRes, eventsRes, matrixRes] = await Promise.allSettled([
      getTasksPulse(scopeContext),
      getAttendancePulse(scopeContext),
      getPurchasingPulse(scopeContext),
      getEventsPulse(scopeContext),
      isAllLocations ? getBranchComparisonMatrix(scopeContext) : Promise.resolve([]),
    ]);

    const defaultBucket = { total: 0, completed: 0, inProgress: 0, pending: 0, overdue: 0 };

    const tasks = tasksRes.status === "fulfilled" ? tasksRes.value : {
      highPriority: defaultBucket,
      mediumPriority: defaultBucket,
      lowPriority: defaultBucket,
      routineCompletionRate: 100,
      routinesTotal: 0,
      routinesDone: 0,
      topOverdueList: [],
    };

    const attendance = attRes.status === "fulfilled" ? attRes.value : {
      totalScheduled: 0,
      clockedIn: 0,
      presentRate: 100,
      lateArrivals: 0,
      absentCount: 0,
      pendingLeaves: [],
    };

    const purchasing = purchRes.status === "fulfilled" ? purchRes.value : {
      pendingPoCount: 0,
      pendingSpotPurchasesCount: 0,
    };

    const events = eventsRes.status === "fulfilled" ? eventsRes.value : {
      upcoming48hCount: 0,
      upcoming48hOrders: [],
      openEnquiriesCount: 0,
    };

    const branchComparison = matrixRes.status === "fulfilled" ? matrixRes.value : [];

    const pulseData: ExecutiveCockpitPulse = {
      scope: {
        organizationId,
        locationId,
        isAllLocations,
        locationName,
        dateRangePreset: resolvedRange.preset,
        fromDate: resolvedRange.fromDate,
        toDate: resolvedRange.toDate,
      },
      tasks,
      attendance,
      purchasing,
      events,
      branchComparison,
    };

    return {
      success: true,
      data: pulseData,
    };
  } catch (err: any) {
    console.error("fetchExecutiveCockpitPulse failed:", err);
    return {
      success: false,
      error: err.message || "Failed to load dashboard pulse.",
    };
  }
}
