export interface DashboardScopeContext {
  organizationId: string;
  locationId?: string | null;
  userId: string;
  isOwner?: boolean;
  dateRangePreset?: "today" | "yesterday" | "this_week" | "this_month" | "custom";
  fromDate?: string; // YYYY-MM-DD
  toDate?: string;   // YYYY-MM-DD
}

export interface TaskPriorityBreakdown {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  overdue: number;
}

export interface OverdueTaskItem {
  id: string;
  title: string;
  priority: string;
  dueAt: string | null;
  overdueMinutes: number;
  assignedUserName?: string | null;
  assignedRoleName?: string | null;
  locationId?: string | null;
  locationName?: string | null;
}

export interface TasksPulseData {
  highPriority: TaskPriorityBreakdown;
  mediumPriority: TaskPriorityBreakdown;
  lowPriority: TaskPriorityBreakdown;
  routineCompletionRate: number; // e.g. 75 (%)
  routinesTotal: number;
  routinesDone: number;
  topOverdueList: OverdueTaskItem[];
}

export interface LeaveRequestItem {
  id: string;
  employeeName: string;
  employeeCode: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason?: string | null;
  locationId?: string | null;
  locationName?: string | null;
}

export interface AttendancePulseData {
  totalScheduled: number;
  clockedIn: number;
  presentRate: number; // e.g. 91 (%)
  lateArrivals: number;
  absentCount: number;
  pendingLeaves: LeaveRequestItem[];
}

export interface PurchasingPulseData {
  pendingPoCount: number;
  pendingSpotPurchasesCount: number;
}

export interface CateringOrderItem {
  id: string;
  title: string;
  functionType: string;
  eventDate: string;
  timeSlot: string;
  expectedPax: number;
  status: string;
  contactName: string;
  contactPhone: string;
  locationId: string;
  locationName?: string | null;
}

export interface EventsPulseData {
  upcoming48hCount: number;
  upcoming48hOrders: CateringOrderItem[];
  openEnquiriesCount: number;
}

export interface BranchComparisonItem {
  locationId: string;
  locationName: string;
  locationCode?: string | null;
  onDutyStaff: number;
  scheduledStaff: number;
  attendancePercent: number;
  highPriorityOverdue: number;
  routineDoneRate: number;
  pendingPoCount: number;
}

export interface ExecutiveCockpitPulse {
  scope: {
    organizationId: string;
    locationId: string | null;
    isAllLocations: boolean;
    locationName?: string;
    dateRangePreset: "today" | "yesterday" | "this_week" | "this_month" | "custom";
    fromDate: string;
    toDate: string;
  };
  tasks: TasksPulseData;
  attendance: AttendancePulseData;
  purchasing: PurchasingPulseData;
  events: EventsPulseData;
  branchComparison: BranchComparisonItem[];
}
