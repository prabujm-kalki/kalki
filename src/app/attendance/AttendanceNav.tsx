"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Clock, CalendarCheck, FileSpreadsheet, Settings } from "lucide-react";

import { useSessionView } from "@/components/AppShell";

export function AttendanceNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const qs = searchParams.toString() ? `?${searchParams.toString()}` : "";
  const { session, selected } = useSessionView();

  const permissions = selected?.permissions || [];
  const isOwner = session?.isOwner;

  const canViewRecords = isOwner || permissions.includes("attendance.records:read");
  const canViewMyTime = isOwner || permissions.includes("attendance.my_time:read");
  const canViewApprovals = isOwner || permissions.includes("attendance.approvals:read");
  const canViewConfig = isOwner || permissions.includes("attendance.configuration:read");
  const canSelfiePunch = isOwner || permissions.includes("attendance.selfie_punch:execute");

  return (
    <nav className="att-topbar">
      {canSelfiePunch && (
        <Link 
          href={`/attendance/selfie-punch${qs}`} 
          className={`att-topbar-link ${pathname === "/attendance/selfie-punch" ? "active" : ""}`}
        >
          <Clock size={16} />
          Selfie Punch
        </Link>
      )}
      {canViewRecords && (
        <Link 
          href={`/attendance/overview${qs}`} 
          className={`att-topbar-link ${pathname === "/attendance/overview" ? "active" : ""}`}
        >
          <FileSpreadsheet size={16} />
          Overview & Upload
        </Link>
      )}
      {canViewMyTime && (
        <Link 
          href={`/attendance/my-time${qs}`} 
          className={`att-topbar-link ${pathname === "/attendance/my-time" ? "active" : ""}`}
        >
          <Clock size={16} />
          My Time
        </Link>
      )}
      {canViewApprovals && (
        <Link 
          href={`/attendance/approvals${qs}`} 
          className={`att-topbar-link ${pathname === "/attendance/approvals" ? "active" : ""}`}
        >
          <CalendarCheck size={16} />
          Approvals
        </Link>
      )}
      {canViewConfig && (
        <Link 
          href={`/attendance/settings${qs}`} 
          className={`att-topbar-link ${pathname === "/attendance/settings" ? "active" : ""}`}
        >
          <Settings size={16} />
          Configuration
        </Link>
      )}
    </nav>
  );
}
