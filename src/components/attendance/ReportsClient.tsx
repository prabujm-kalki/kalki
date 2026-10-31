"use client";

import { useState, useEffect } from "react";
import { generateAttendanceReport } from "@/domains/attendance/reportActions";
import { useSessionView } from "@/components/AppShell";
import { Download, Filter, Search, Table2, CalendarDays, PieChart, FileText } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type ReportType = "RAW" | "DETAILED" | "SUMMARY";

function isEmployeeAttendanceExempt(emp: any): boolean {
  const code = (emp.code || "").toUpperCase();
  const title = (emp.jobTitle || "").toLowerCase();
  const name = (emp.name || "").toLowerCase();
  // System owner and corporate executive/owner roles are exempt from shift punch attendance calculations
  if (code.includes("OWNER") || code === "KAL-EMP-0002") return true;
  if (title.includes("owner") || title.includes("director") || title.includes("executive")) return true;
  if (name.includes("owner") || name.includes("prabha")) return true;
  return false;
}

export default function ReportsClient({ 
  departments, 
  roles, 
  employees 
}: { 
  departments: any[], 
  roles: any[], 
  employees: any[] 
}) {
  const { selected } = useSessionView();
  
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [roleId, setRoleId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  
  const [reportType, setReportType] = useState<ReportType>("RAW");
  const [reportData, setReportData] = useState<any[] | null>(null);
  const [approvedLeaves, setApprovedLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const today = new Date().toISOString().split("T")[0];
    setStartDate(today);
    setEndDate(today);
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    
    setLoading(true);
    setError("");
    
    try {
      const data = await generateAttendanceReport({
        startDate,
        endDate,
        departmentId: departmentId || undefined,
        roleId: roleId || undefined,
        employeeId: employeeId || undefined,
        organizationId: selected?.organizationId,
        locationId: selected?.locationId
      });
      if (data && typeof data === "object" && "punches" in data) {
        setReportData(data.punches);
        setApprovedLeaves(data.approvedLeaves || []);
      } else {
        setReportData(Array.isArray(data) ? data : []);
        setApprovedLeaves([]);
      }
    } catch (err: any) {
      setError(err.message || "Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  const getDatesInRange = (start: string, end: string) => {
    const dates = [];
    let current = new Date(start);
    const last = new Date(end);
    while(current <= last) {
      dates.push(new Date(current).toISOString().split("T")[0]);
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  const exportCSV = () => {
    if (!reportData || reportData.length === 0) return;
    
    let csvContent = "";
    
    if (reportType === "RAW") {
      const headers = ["Employee Code", "Name", "Department", "Role", "Punch Type", "Timestamp", "Source"];
      const rows = reportData.map(r => [
        r.employeeCode,
        r.employeeName,
        r.departmentName || "N/A",
        r.roleTitle || "N/A",
        r.punchType.replace("_", " "),
        new Date(r.punchTimestamp).toLocaleString(),
        r.sourceType
      ]);
      csvContent = [
        headers.join(","),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
      ].join("\n");
    } else if (reportType === "DETAILED" || reportType === "SUMMARY") {
      const dates = getDatesInRange(startDate, endDate);
      const filteredEmployees = employees.filter(e => {
        if (isEmployeeAttendanceExempt(e)) return false;
        if (e.organizationId && e.organizationId !== selected?.organizationId) return false;
        if (e.locationId && e.locationId !== selected?.locationId) return false;
        if (employeeId && e.id !== employeeId) return false;
        if (departmentId && e.departmentId !== departmentId) return false;
        return true;
      });

      if (reportType === "DETAILED") {
        const headers = ["Employee Code", "Name", "Date", "Punch IN", "Break IN", "Break OUT", "Punch OUT", "Status", "Remarks / Anomalies"];
        const rows: string[][] = [];
        filteredEmployees.forEach(emp => {
          dates.forEach(d => {
            const dayPunches = reportData.filter(r => r.employeeId === emp.id && new Date(r.punchTimestamp).toISOString().split("T")[0] === d);
            const leave = approvedLeaves.find(l => l.employeeId === emp.id && l.startDate <= d && l.endDate >= d);

            if (leave) {
              rows.push([emp.code, emp.name, d, "-", "-", "-", "-", "ON_LEAVE", `Approved Leave (${leave.leaveTypeName})`]);
              return;
            }

            if (dayPunches.length === 0) {
              rows.push([emp.code, emp.name, d, "-", "-", "-", "-", "ABSENT", "No Punch Recorded"]);
              return;
            }

            const pi = [...dayPunches].reverse().find(p => p.punchType === "PUNCH_IN");
            const bi = dayPunches.find(p => p.punchType === "BREAK_IN");
            const bo = dayPunches.find(p => p.punchType === "BREAK_OUT");
            const po = dayPunches.find(p => p.punchType === "PUNCH_OUT");
            
            const formatTime = (p: any) => p ? new Date(p.punchTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-";
            
            let anomalies = [];
            let status = "PRESENT";
            const shiftStartTime = pi?.shiftStartTime || emp.shiftStartTime;
            const shiftGrace = pi?.shiftGracePeriod ?? emp.shiftGracePeriod ?? 15;
            const shiftExtremeCutoff = pi?.shiftExtremeLateThresholdMinutes ?? emp.shiftExtremeLateThresholdMinutes ?? 120;
            const minHalf = parseFloat(pi?.shiftMinHoursHalfDay || emp.shiftMinHoursHalfDay || "4.00");
            const minFull = parseFloat(pi?.shiftMinHoursFullDay || emp.shiftMinHoursFullDay || "8.00");

            if (pi && shiftStartTime) {
              const punchTime = new Date(pi.punchTimestamp);
              const shiftStartParts = shiftStartTime.split(":");
              const expectedStart = new Date(punchTime);
              expectedStart.setHours(parseInt(shiftStartParts[0]), parseInt(shiftStartParts[1]), parseInt(shiftStartParts[2] || "0"), 0);
              
              const graceMs = shiftGrace * 60 * 1000;
              const isLate = punchTime.getTime() > expectedStart.getTime() + graceMs;
              const extremeCutoffMs = shiftExtremeCutoff * 60 * 1000;
              const isExtremeLate = punchTime.getTime() > expectedStart.getTime() + extremeCutoffMs;

              if (isLate) {
                anomalies.push("LATE IN");
                status = "PRESENT_LATE";
              }

              if (po) {
                const punchOutTime = new Date(po.punchTimestamp);
                const hoursWorked = (punchOutTime.getTime() - punchTime.getTime()) / (1000 * 60 * 60);
                
                if (hoursWorked < minHalf) {
                  anomalies.push(`SHORT HOURS (${hoursWorked.toFixed(1)}h)`);
                  status = "ABSENT";
                } else if (hoursWorked < minFull || isExtremeLate) {
                  if (isExtremeLate) anomalies.push(`EXTREME DELAY (>${shiftExtremeCutoff}m)`);
                  else anomalies.push(`SHORT HOURS (${hoursWorked.toFixed(1)}h)`);
                  status = "HALF_DAY";
                }
              } else {
                anomalies.push("MISSING OUT PUNCH");
                status = "ABSENT";
              }
            } else {
              anomalies.push(pi ? "NO SHIFT ASSIGNED" : "NO PUNCH");
              if (!po) {
                anomalies.push("MISSING OUT PUNCH");
                status = "ABSENT";
              }
            }

            rows.push([
              emp.code,
              emp.name,
              d,
              formatTime(pi),
              formatTime(bi),
              formatTime(bo),
              formatTime(po),
              status,
              anomalies.join(", ") || "On-Time"
            ]);
          });
        });
        csvContent = [
          headers.join(","),
          ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
        ].join("\n");
      } else if (reportType === "SUMMARY") {
        const headers = ["Employee Code", "Name", "Total Days", "Present (Full)", "Late Days", "Half Days", "Leaves", "Absent Days", "Attendance %"];
        const rows: string[][] = [];
        filteredEmployees.forEach(emp => {
          let presentCount = 0;
          let lateCount = 0;
          let halfDayCount = 0;
          let leaveCount = 0;
          let absentCount = 0;

          dates.forEach(d => {
            const leave = approvedLeaves.find(l => l.employeeId === emp.id && l.startDate <= d && l.endDate >= d);
            if (leave) {
              leaveCount++;
              return;
            }

            const dayPunches = reportData.filter(r => r.employeeId === emp.id && new Date(r.punchTimestamp).toISOString().split("T")[0] === d);
            if (dayPunches.length === 0) {
              absentCount++;
              return;
            }

            const pi = [...dayPunches].reverse().find(p => p.punchType === "PUNCH_IN");
            const po = dayPunches.find(p => p.punchType === "PUNCH_OUT");
            if (!pi || !po) {
              absentCount++;
              return;
            }

            const shiftStartTime = pi?.shiftStartTime || emp.shiftStartTime;
            const shiftGrace = pi?.shiftGracePeriod ?? emp.shiftGracePeriod ?? 15;
            const shiftExtremeCutoff = pi?.shiftExtremeLateThresholdMinutes ?? emp.shiftExtremeLateThresholdMinutes ?? 120;
            const minHalf = parseFloat(pi?.shiftMinHoursHalfDay || emp.shiftMinHoursHalfDay || "4.00");
            const minFull = parseFloat(pi?.shiftMinHoursFullDay || emp.shiftMinHoursFullDay || "8.00");

            const punchInTime = new Date(pi.punchTimestamp);
            const punchOutTime = new Date(po.punchTimestamp);
            const hoursWorked = (punchOutTime.getTime() - punchInTime.getTime()) / (1000 * 60 * 60);

            let isLate = false;
            let isExtremeLate = false;
            if (shiftStartTime) {
              const shiftStartParts = shiftStartTime.split(":");
              const expectedStart = new Date(punchInTime);
              expectedStart.setHours(parseInt(shiftStartParts[0]), parseInt(shiftStartParts[1]), parseInt(shiftStartParts[2] || "0"), 0);
              isLate = punchInTime.getTime() > expectedStart.getTime() + (shiftGrace * 60 * 1000);
              isExtremeLate = punchInTime.getTime() > expectedStart.getTime() + (shiftExtremeCutoff * 60 * 1000);
            }

            if (hoursWorked < minHalf) {
              absentCount++;
            } else if (hoursWorked < minFull || isExtremeLate) {
              halfDayCount++;
              if (isLate) lateCount++;
            } else {
              presentCount++;
              if (isLate) lateCount++;
            }
          });

          const attendedEquivalent = presentCount + (halfDayCount * 0.5) + leaveCount;
          const pct = dates.length > 0 ? `${Math.round((attendedEquivalent / dates.length) * 100)}%` : "0%";

          rows.push([
            emp.code,
            emp.name,
            dates.length.toString(),
            presentCount.toString(),
            lateCount.toString(),
            halfDayCount.toString(),
            leaveCount.toString(),
            absentCount.toString(),
            pct
          ]);
        });
        csvContent = [
          headers.join(","),
          ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
        ].join("\n");
      }
    }
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `attendance_${reportType.toLowerCase()}_report_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPDF = () => {
    if (!reportData || reportData.length === 0) return;

    const isLandscape = reportType === "DETAILED";
    const doc = new jsPDF({
      orientation: isLandscape ? "landscape" : "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const titleMap: Record<ReportType, string> = {
      RAW: "Raw Attendance Log Report",
      DETAILED: "Detailed Employee Attendance Records",
      SUMMARY: "Attendance Summary Overview Report",
    };

    // 1. Top Decorative Brand Banner
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, 24, "F");

    // Brand accent line
    doc.setFillColor(59, 130, 246); // blue-500
    doc.rect(0, 24, pageWidth, 1.5, "F");

    // Header Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text(titleMap[reportType], 14, 12);

    // Header Subtitle / Meta in top banner
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184); // slate-400
    const locationName = selected?.locationName || "All Locations";
    doc.text(`Period: ${startDate} to ${endDate}   |   Location: ${locationName}`, 14, 18.5);

    // Generation timestamp on right side of top banner
    const genText = `Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    doc.text(genText, pageWidth - 14, 15, { align: "right" });

    // Status Styling Palettes [text RGB, bg RGB]
    const STATUS_THEMES: Record<string, { text: [number, number, number]; bg: [number, number, number] }> = {
      PRESENT: { text: [22, 101, 52], bg: [220, 252, 231] }, // emerald-700 / 100
      PRESENT_LATE: { text: [180, 83, 9], bg: [254, 243, 199] }, // amber-700 / 100
      HALF_DAY: { text: [3, 105, 161], bg: [224, 242, 254] }, // sky-700 / 100
      ABSENT: { text: [185, 28, 28], bg: [254, 226, 226] }, // red-700 / 100
      ON_LEAVE: { text: [109, 40, 217], bg: [237, 233, 254] }, // purple-700 / 100
    };

    if (reportType === "RAW") {
      const head = [["Employee Code", "Name", "Department", "Role", "Punch Type", "Timestamp", "Source"]];
      const body = reportData.map((r) => [
        r.employeeCode,
        r.employeeName,
        r.departmentName || "N/A",
        r.roleTitle || "N/A",
        r.punchType.replace("_", " "),
        new Date(r.punchTimestamp).toLocaleString([], { dateStyle: "short", timeStyle: "short" }),
        r.sourceType,
      ]);

      autoTable(doc, {
        startY: 32,
        head,
        body,
        theme: "plain",
        styles: {
          fontSize: 8,
          cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
          textColor: [51, 65, 85],
          lineColor: [226, 232, 240],
          lineWidth: 0.1,
          font: "helvetica",
        },
        headStyles: {
          fillColor: [30, 41, 59],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 8.5,
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        didDrawPage: (data) => {
          doc.setFontSize(8);
          doc.setTextColor(148, 163, 184);
          doc.text(`Page ${data.pageNumber}`, pageWidth - 14, pageHeight - 8, { align: "right" });
          doc.text("Kalki BOS • Automated Attendance System", 14, pageHeight - 8);
        },
      });
    } else if (reportType === "DETAILED") {
      const dates = getDatesInRange(startDate, endDate);
      const filteredEmployees = employees.filter((e) => {
        if (isEmployeeAttendanceExempt(e)) return false;
        if (e.organizationId && e.organizationId !== selected?.organizationId) return false;
        if (e.locationId && e.locationId !== selected?.locationId) return false;
        if (employeeId && e.id !== employeeId) return false;
        if (departmentId && e.departmentId !== departmentId) return false;
        return true;
      });

      const head = [["Employee Code", "Name", "Date", "Punch IN", "Break IN", "Break OUT", "Punch OUT", "Status", "Remarks / Anomalies"]];
      const body: string[][] = [];

      let countPresent = 0;
      let countLate = 0;
      let countHalfDay = 0;
      let countAbsent = 0;
      let countLeave = 0;

      filteredEmployees.forEach((emp) => {
        dates.forEach((d) => {
          const dayPunches = reportData.filter(
            (r) => r.employeeId === emp.id && new Date(r.punchTimestamp).toISOString().split("T")[0] === d
          );
          const leave = approvedLeaves.find(l => l.employeeId === emp.id && l.startDate <= d && l.endDate >= d);

          if (leave) {
            countLeave++;
            body.push([emp.code, emp.name, d, "-", "-", "-", "-", "ON_LEAVE", `Approved Leave (${leave.leaveTypeName})`]);
            return;
          }

          if (dayPunches.length === 0) {
            countAbsent++;
            body.push([emp.code, emp.name, d, "-", "-", "-", "-", "ABSENT", "No Punch Recorded"]);
            return;
          }

          const pi = [...dayPunches].reverse().find((p) => p.punchType === "PUNCH_IN");
          const bi = dayPunches.find((p) => p.punchType === "BREAK_IN");
          const bo = dayPunches.find((p) => p.punchType === "BREAK_OUT");
          const po = dayPunches.find((p) => p.punchType === "PUNCH_OUT");

          const formatTime = (p: any) =>
            p ? new Date(p.punchTimestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-";

          let anomalies = [];
          let status = "PRESENT";
          const shiftStartTime = pi?.shiftStartTime || emp.shiftStartTime;
          const shiftGrace = pi?.shiftGracePeriod ?? emp.shiftGracePeriod ?? 15;
          const shiftExtremeCutoff = pi?.shiftExtremeLateThresholdMinutes ?? emp.shiftExtremeLateThresholdMinutes ?? 120;
          const minHalf = parseFloat(pi?.shiftMinHoursHalfDay || emp.shiftMinHoursHalfDay || "4.00");
          const minFull = parseFloat(pi?.shiftMinHoursFullDay || emp.shiftMinHoursFullDay || "8.00");

          if (pi && shiftStartTime) {
            const punchTime = new Date(pi.punchTimestamp);
            const shiftStartParts = shiftStartTime.split(":");
            const expectedStart = new Date(punchTime);
            expectedStart.setHours(
              parseInt(shiftStartParts[0]),
              parseInt(shiftStartParts[1]),
              parseInt(shiftStartParts[2] || "0"),
              0
            );

            const graceMs = shiftGrace * 60 * 1000;
            const isLate = punchTime.getTime() > expectedStart.getTime() + graceMs;
            const extremeCutoffMs = shiftExtremeCutoff * 60 * 1000;
            const isExtremeLate = punchTime.getTime() > expectedStart.getTime() + extremeCutoffMs;

            if (isLate) {
              anomalies.push("LATE IN");
              status = "PRESENT_LATE";
            }

            if (po) {
              const punchOutTime = new Date(po.punchTimestamp);
              const hoursWorked = (punchOutTime.getTime() - punchTime.getTime()) / (1000 * 60 * 60);

              if (hoursWorked < minHalf) {
                anomalies.push(`SHORT (${hoursWorked.toFixed(1)}h)`);
                status = "ABSENT";
              } else if (hoursWorked < minFull || isExtremeLate) {
                if (isExtremeLate) anomalies.push(`EXTREME DELAY (>${shiftExtremeCutoff}m)`);
                else anomalies.push(`SHORT (${hoursWorked.toFixed(1)}h)`);
                status = "HALF_DAY";
              }
            } else {
              anomalies.push("MISSING OUT PUNCH");
              status = "ABSENT";
            }
          } else {
            anomalies.push(pi ? "NO SHIFT" : "NO PUNCH");
            if (!po) {
              anomalies.push("MISSING OUT PUNCH");
              status = "ABSENT";
            }
          }

          if (status === "PRESENT") countPresent++;
          else if (status === "PRESENT_LATE") countLate++;
          else if (status === "HALF_DAY") countHalfDay++;
          else if (status === "ABSENT") countAbsent++;

          body.push([
            emp.code,
            emp.name,
            d,
            formatTime(pi),
            formatTime(bi),
            formatTime(bo),
            formatTime(po),
            status,
            anomalies.join(", ") || "On-Time"
          ]);
        });
      });

      // Quick Summary KPI Badges above the table
      const kpis = [
        { label: "PRESENT", count: countPresent, color: [22, 101, 52], bg: [220, 252, 231] },
        { label: "LATE IN", count: countLate, color: [180, 83, 9], bg: [254, 243, 199] },
        { label: "HALF DAY", count: countHalfDay, color: [3, 105, 161], bg: [224, 242, 254] },
        { label: "ABSENT", count: countAbsent, color: [185, 28, 28], bg: [254, 226, 226] },
        { label: "ON LEAVE", count: countLeave, color: [109, 40, 217], bg: [237, 233, 254] },
      ];

      let kpiX = 14;
      const kpiY = 29;
      const badgeWidth = 32;
      const badgeHeight = 7.5;
      kpis.forEach((kpi) => {
        doc.setFillColor(kpi.bg[0], kpi.bg[1], kpi.bg[2]);
        doc.roundedRect(kpiX, kpiY, badgeWidth, badgeHeight, 1.5, 1.5, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
        doc.text(`${kpi.label}: ${kpi.count}`, kpiX + (badgeWidth / 2), kpiY + 4.8, { align: "center" });
        kpiX += badgeWidth + 4;
      });

      autoTable(doc, {
        startY: 39,
        head,
        body,
        theme: "plain",
        styles: {
          fontSize: 8,
          cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
          textColor: [51, 65, 85],
          lineColor: [226, 232, 240],
          lineWidth: 0.1,
          font: "helvetica",
        },
        headStyles: {
          fillColor: [30, 41, 59], // dark navy slate
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 8.5,
        },
        columnStyles: {
          0: { cellWidth: 26, fontStyle: "bold" },
          1: { cellWidth: 40, fontStyle: "bold", textColor: [15, 23, 42] },
          2: { cellWidth: 24 },
          3: { cellWidth: 22 },
          4: { cellWidth: 20 },
          5: { cellWidth: 20 },
          6: { cellWidth: 22 },
          7: { cellWidth: 32, halign: "center" },
          8: { cellWidth: "auto" },
        },
        didParseCell: (data) => {
          if (data.section === "body") {
            const rawRow = data.row.raw as any;
            const rawStatus = String(rawRow?.[7] || "");
            const remarks = String(rawRow?.[8] || "");

            // Subtle row tint for Absent to spot immediately
            if (rawStatus === "ABSENT") {
              data.cell.styles.fillColor = [255, 245, 245];
            } else if (data.row.index % 2 === 1) {
              data.cell.styles.fillColor = [248, 250, 252];
            } else {
              data.cell.styles.fillColor = [255, 255, 255];
            }

            // Punch Out missing warning text
            if (data.column.index === 6 && data.cell.text[0] === "-") {
              data.cell.styles.textColor = [156, 163, 175];
            }

            // Remarks / Anomalies column styling
            if (data.column.index === 8) {
              if (remarks.includes("MISSING") || remarks.includes("No Punch")) {
                data.cell.styles.textColor = [185, 28, 28]; // red
                data.cell.styles.fontStyle = "bold";
              } else if (remarks.includes("LATE") || remarks.includes("SHORT")) {
                data.cell.styles.textColor = [180, 83, 9]; // amber
              } else if (remarks === "On-Time") {
                data.cell.styles.textColor = [22, 101, 52]; // green
              }
            }
          }
        },
        didDrawCell: (data) => {
          // Render a vibrant rounded status pill in the Status column
          if (data.section === "body" && data.column.index === 7) {
            const statusKey = String(data.cell.raw || "");
            const theme = STATUS_THEMES[statusKey] || { text: [71, 85, 105], bg: [241, 245, 249] };
            
            const cell = data.cell;
            const padX = 2;
            const padY = 1.5;
            const pillX = cell.x + padX;
            const pillY = cell.y + padY;
            const pillW = cell.width - (padX * 2);
            const pillH = cell.height - (padY * 2);

            // Draw rounded pill background
            doc.setFillColor(theme.bg[0], theme.bg[1], theme.bg[2]);
            doc.roundedRect(pillX, pillY, pillW, pillH, 2, 2, "F");

            // Draw pill border
            doc.setDrawColor(theme.text[0], theme.text[1], theme.text[2]);
            doc.setLineWidth(0.2);
            doc.roundedRect(pillX, pillY, pillW, pillH, 2, 2, "S");

            // Draw pill label text
            doc.setFont("helvetica", "bold");
            doc.setFontSize(7.5);
            doc.setTextColor(theme.text[0], theme.text[1], theme.text[2]);
            doc.text(statusKey.replace("_", " "), cell.x + (cell.width / 2), cell.y + (cell.height / 2) + 1, {
              align: "center",
              baseline: "middle",
            });
          }
        },
        didDrawPage: (data) => {
          doc.setFontSize(8);
          doc.setTextColor(148, 163, 184);
          doc.text(`Page ${data.pageNumber}`, pageWidth - 14, pageHeight - 8, { align: "right" });
          doc.text("Kalki BOS • Automated Attendance System", 14, pageHeight - 8);
        },
      });
    } else if (reportType === "SUMMARY") {
      const dates = getDatesInRange(startDate, endDate);
      const filteredEmployees = employees.filter((e) => {
        if (isEmployeeAttendanceExempt(e)) return false;
        if (e.organizationId && e.organizationId !== selected?.organizationId) return false;
        if (e.locationId && e.locationId !== selected?.locationId) return false;
        if (employeeId && e.id !== employeeId) return false;
        if (departmentId && e.departmentId !== departmentId) return false;
        return true;
      });

      const head = [["Employee Code", "Name", "Total Days", "Present", "Late Days", "Half Days", "Leaves", "Absent", "Attendance %"]];
      const body: string[][] = [];

      filteredEmployees.forEach((emp) => {
        let presentCount = 0;
        let lateCount = 0;
        let halfDayCount = 0;
        let leaveCount = 0;
        let absentCount = 0;

        dates.forEach((d) => {
          const leave = approvedLeaves.find(l => l.employeeId === emp.id && l.startDate <= d && l.endDate >= d);
          if (leave) {
            leaveCount++;
            return;
          }

          const dayPunches = reportData.filter(
            (r) => r.employeeId === emp.id && new Date(r.punchTimestamp).toISOString().split("T")[0] === d
          );
          if (dayPunches.length === 0) {
            absentCount++;
            return;
          }

          const pi = [...dayPunches].reverse().find((p) => p.punchType === "PUNCH_IN");
          const po = dayPunches.find((p) => p.punchType === "PUNCH_OUT");
          if (!pi || !po) {
            absentCount++;
            return;
          }

          const shiftStartTime = pi?.shiftStartTime || emp.shiftStartTime;
          const shiftGrace = pi?.shiftGracePeriod ?? emp.shiftGracePeriod ?? 15;
          const shiftExtremeCutoff = pi?.shiftExtremeLateThresholdMinutes ?? emp.shiftExtremeLateThresholdMinutes ?? 120;
          const minHalf = parseFloat(pi?.shiftMinHoursHalfDay || emp.shiftMinHoursHalfDay || "4.00");
          const minFull = parseFloat(pi?.shiftMinHoursFullDay || emp.shiftMinHoursFullDay || "8.00");

          const punchInTime = new Date(pi.punchTimestamp);
          const punchOutTime = new Date(po.punchTimestamp);
          const hoursWorked = (punchOutTime.getTime() - punchInTime.getTime()) / (1000 * 60 * 60);

          let isLate = false;
          let isExtremeLate = false;
          if (shiftStartTime) {
            const shiftStartParts = shiftStartTime.split(":");
            const expectedStart = new Date(punchInTime);
            expectedStart.setHours(parseInt(shiftStartParts[0]), parseInt(shiftStartParts[1]), parseInt(shiftStartParts[2] || "0"), 0);
            isLate = punchInTime.getTime() > expectedStart.getTime() + (shiftGrace * 60 * 1000);
            isExtremeLate = punchInTime.getTime() > expectedStart.getTime() + (shiftExtremeCutoff * 60 * 1000);
          }

          if (hoursWorked < minHalf) {
            absentCount++;
          } else if (hoursWorked < minFull || isExtremeLate) {
            halfDayCount++;
            if (isLate) lateCount++;
          } else {
            presentCount++;
            if (isLate) lateCount++;
          }
        });

        const attendedEquivalent = presentCount + (halfDayCount * 0.5) + leaveCount;
        const pct = dates.length > 0 ? `${Math.round((attendedEquivalent / dates.length) * 100)}%` : "0%";
        body.push([
          emp.code, 
          emp.name, 
          dates.length.toString(), 
          presentCount.toString(), 
          lateCount.toString(), 
          halfDayCount.toString(), 
          leaveCount.toString(), 
          absentCount.toString(), 
          pct
        ]);
      });

      autoTable(doc, {
        startY: 32,
        head,
        body,
        theme: "plain",
        styles: {
          fontSize: 8.5,
          cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
          textColor: [51, 65, 85],
          lineColor: [226, 232, 240],
          lineWidth: 0.1,
          font: "helvetica",
        },
        headStyles: {
          fillColor: [30, 41, 59],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 9,
        },
        columnStyles: {
          0: { fontStyle: "bold", cellWidth: 26 },
          1: { fontStyle: "bold", textColor: [15, 23, 42] },
          8: { fontStyle: "bold", halign: "right" },
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        didParseCell: (data) => {
          if (data.section === "body") {
            // Highlighting Attendance %
            if (data.column.index === 8) {
              const val = parseInt(String(data.cell.raw).replace("%", "") || "0");
              if (val >= 90) {
                data.cell.styles.textColor = [22, 101, 52]; // green
              } else if (val < 75) {
                data.cell.styles.textColor = [185, 28, 28]; // red
              } else {
                data.cell.styles.textColor = [180, 83, 9]; // amber
              }
            }
          }
        },
        didDrawPage: (data) => {
          doc.setFontSize(8);
          doc.setTextColor(148, 163, 184);
          doc.text(`Page ${data.pageNumber}`, pageWidth - 14, pageHeight - 8, { align: "right" });
          doc.text("Kalki BOS • Automated Attendance System", 14, pageHeight - 8);
        },
      });
    }

    doc.save(`attendance_${reportType.toLowerCase()}_report_${startDate}_to_${endDate}.pdf`);
  };

  if (!isMounted) return null;

  if (!selected) {
    return <div className="att-card" style={{ padding: "3rem", textAlign: "center" }}>Please select an organization/location.</div>;
  }

  const renderReportContent = () => {
    if (!reportData) return null;

    if (reportType === "RAW") {
      return (
        <div style={{ overflowX: "auto" }}>
          <table className="att-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department / Role</th>
                <th>Punch Details</th>
                <th>Timestamp</th>
                <th>Evidence</th>
              </tr>
            </thead>
            <tbody>
              {reportData.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: "3rem", textAlign: "center", color: "var(--att-text-muted)" }}>
                    No raw attendance records found.
                  </td>
                </tr>
              ) : (
                reportData.map(row => (
                  <tr key={row.id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{row.employeeName}</div>
                      <div style={{ color: "var(--att-text-muted)", fontSize: "0.75rem" }}>{row.employeeCode}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{row.departmentName || "-"}</div>
                      <div style={{ color: "var(--att-text-muted)", fontSize: "0.75rem" }}>{row.roleTitle || "-"}</div>
                    </td>
                    <td>
                      <span className={`kalki-badge ${row.punchType.includes('OUT') ? 'kalki-badge--warning' : 'kalki-badge--success'}`} style={{ padding: "0.25rem 0.5rem", borderRadius: "12px", fontSize: "0.75rem", fontWeight: 600, border: "1px solid", backgroundColor: row.punchType.includes('OUT') ? "#fffbeb" : "#f0fdf4", color: row.punchType.includes('OUT') ? "#d97706" : "#16a34a", borderColor: row.punchType.includes('OUT') ? "#fcd34d" : "#bbf7d0" }}>
                        {row.punchType.replace("_", " ")}
                      </span>
                      <div style={{ marginTop: "0.25rem", fontSize: "0.75rem", color: "var(--att-text-muted)" }}>
                        Source: {row.sourceType.replace("_", " ")}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{new Date(row.punchTimestamp).toLocaleDateString()}</div>
                      <div style={{ color: "var(--att-text-muted)", fontSize: "0.75rem" }}>{new Date(row.punchTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                    <td>
                      {row.snapshotUrl ? (
                        <a href={row.snapshotUrl} target="_blank" rel="noreferrer" style={{ color: "var(--att-accent)" }}>Photo</a>
                      ) : (
                        <span style={{ color: "var(--att-text-muted)" }}>-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      );
    }

    if (reportType === "DETAILED" || reportType === "SUMMARY") {
      const dates = getDatesInRange(startDate, endDate);
      const filteredEmployees = employees.filter(e => {
        if (isEmployeeAttendanceExempt(e)) return false;
        if (e.organizationId && e.organizationId !== selected?.organizationId) return false;
        if (e.locationId && e.locationId !== selected?.locationId) return false;
        if (employeeId && e.id !== employeeId) return false;
        if (departmentId && e.departmentId !== departmentId) return false;
        return true;
      });

      if (filteredEmployees.length === 0) {
        return <div style={{ padding: "3rem", textAlign: "center", color: "var(--att-text-muted)" }}>No employees match filters.</div>;
      }

      if (reportType === "DETAILED") {
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
            {filteredEmployees.map(emp => {
              return (
                <div key={emp.id} style={{ border: "1px solid var(--att-border)", borderRadius: "8px", overflow: "hidden" }}>
                  <div style={{ padding: "0.85rem 1rem", backgroundColor: "var(--att-secondary)", borderBottom: "1px solid var(--att-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontWeight: 600 }}>
                      {emp.name} <span style={{ color: "var(--att-text-muted)", fontSize: "0.8rem", marginLeft: "0.5rem" }}>({emp.code})</span>
                    </div>
                    {emp.shiftStartTime && (
                      <span style={{ fontSize: "0.75rem", color: "var(--att-text-muted)" }}>
                        Shift: {emp.shiftStartTime.slice(0, 5)} - {emp.shiftEndTime ? emp.shiftEndTime.slice(0, 5) : "-"} (Grace: {emp.shiftGracePeriod ?? 15}m)
                      </span>
                    )}
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table className="att-table" style={{ marginTop: 0 }}>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Punch IN</th>
                          <th>Break IN</th>
                          <th>Break OUT</th>
                          <th>Punch OUT</th>
                          <th>Status / Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dates.map(d => {
                          const leave = approvedLeaves.find(l => l.employeeId === emp.id && l.startDate <= d && l.endDate >= d);
                          if (leave) {
                            return (
                              <tr key={d} style={{ backgroundColor: "#eff6ff" }}>
                                <td style={{ fontWeight: 500 }}>{d}</td>
                                <td>-</td>
                                <td>-</td>
                                <td>-</td>
                                <td>-</td>
                                <td>
                                  <span style={{ color: "#2563eb", fontWeight: 600, fontSize: "0.85rem" }}>
                                    ON LEAVE ({leave.leaveTypeName})
                                  </span>
                                </td>
                              </tr>
                            );
                          }

                          const dayPunches = reportData.filter(r => r.employeeId === emp.id && new Date(r.punchTimestamp).toISOString().split("T")[0] === d);
                          
                          if (dayPunches.length === 0) {
                            return (
                              <tr key={d} style={{ backgroundColor: "#fff5f5" }}>
                                <td style={{ fontWeight: 500 }}>{d}</td>
                                <td>-</td>
                                <td>-</td>
                                <td>-</td>
                                <td>-</td>
                                <td>
                                  <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                                    <span style={{ color: "var(--att-destructive)", fontWeight: 600 }}>ABSENT</span>
                                    <span style={{ fontSize: "0.75rem", color: "#b91c1c" }}>No punch recorded</span>
                                  </div>
                                </td>
                              </tr>
                            );
                          }

                          const pi = [...dayPunches].reverse().find(p => p.punchType === "PUNCH_IN");
                          const bi = dayPunches.find(p => p.punchType === "BREAK_IN");
                          const bo = dayPunches.find(p => p.punchType === "BREAK_OUT");
                          const po = dayPunches.find(p => p.punchType === "PUNCH_OUT");
                          
                          const formatTime = (p: any) => p ? new Date(p.punchTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-";

                          let anomalies = [];
                          let status = "PRESENT";
                          const shiftStartTime = pi?.shiftStartTime || emp.shiftStartTime;
                          const shiftGrace = pi?.shiftGracePeriod ?? emp.shiftGracePeriod ?? 15;
                          const shiftExtremeCutoff = pi?.shiftExtremeLateThresholdMinutes ?? emp.shiftExtremeLateThresholdMinutes ?? 120;
                          const minHalf = parseFloat(pi?.shiftMinHoursHalfDay || emp.shiftMinHoursHalfDay || "4.00");
                          const minFull = parseFloat(pi?.shiftMinHoursFullDay || emp.shiftMinHoursFullDay || "8.00");

                          if (pi && shiftStartTime) {
                            const punchTime = new Date(pi.punchTimestamp);
                            const shiftStartParts = shiftStartTime.split(":");
                            const expectedStart = new Date(punchTime);
                            expectedStart.setHours(parseInt(shiftStartParts[0]), parseInt(shiftStartParts[1]), parseInt(shiftStartParts[2] || "0"), 0);
                            
                            const graceMs = shiftGrace * 60 * 1000;
                            const isLate = punchTime.getTime() > expectedStart.getTime() + graceMs;
                            const extremeCutoffMs = shiftExtremeCutoff * 60 * 1000;
                            const isExtremeLate = punchTime.getTime() > expectedStart.getTime() + extremeCutoffMs;

                            if (isLate) {
                              anomalies.push("LATE IN");
                              status = "PRESENT_LATE";
                            }

                            if (po) {
                              const punchOutTime = new Date(po.punchTimestamp);
                              const hoursWorked = (punchOutTime.getTime() - punchTime.getTime()) / (1000 * 60 * 60);
                              
                              if (hoursWorked < minHalf) {
                                anomalies.push(`SHORT HOURS (${hoursWorked.toFixed(1)}h)`);
                                status = "ABSENT";
                              } else if (hoursWorked < minFull || isExtremeLate) {
                                if (isExtremeLate) anomalies.push(`EXTREME DELAY (>${shiftExtremeCutoff}m)`);
                                else anomalies.push(`SHORT HOURS (${hoursWorked.toFixed(1)}h)`);
                                status = "HALF_DAY";
                              }
                            } else {
                              anomalies.push("MISSING OUT PUNCH");
                              status = "ABSENT";
                            }
                          } else {
                            anomalies.push(pi ? "NO SHIFT ASSIGNED" : "NO PUNCH");
                            if (!po) {
                              anomalies.push("MISSING OUT PUNCH");
                              status = "ABSENT";
                            }
                          }

                          return (
                            <tr key={d}>
                              <td style={{ fontWeight: 500 }}>{d}</td>
                              <td>{formatTime(pi)}</td>
                              <td>{formatTime(bi)}</td>
                              <td>{formatTime(bo)}</td>
                              <td>{formatTime(po)}</td>
                              <td>
                                {status === "ABSENT" ? (
                                  <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                                    <span style={{ color: "var(--att-destructive)", fontWeight: 600 }}>ABSENT</span>
                                    {anomalies.map((a, i) => (
                                      <span key={i} style={{ fontSize: "0.75rem", padding: "0.1rem 0.4rem", background: "#fee2e2", color: "#b91c1c", borderRadius: "4px", width: "fit-content" }}>
                                        {a}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                                    <span style={{ color: status === "PRESENT" ? "var(--att-success)" : status === "HALF_DAY" ? "#0284c7" : "#d97706", fontWeight: 600 }}>
                                      {status}
                                    </span>
                                    {anomalies.map((a, i) => (
                                      <span key={i} style={{ fontSize: "0.75rem", padding: "0.1rem 0.4rem", background: status === "PRESENT_LATE" ? "#fef3c7" : "#fee2e2", color: status === "PRESENT_LATE" ? "#92400e" : "#b91c1c", borderRadius: "4px", width: "fit-content" }}>
                                        {a}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        );
      }

      if (reportType === "SUMMARY") {
        return (
          <div style={{ overflowX: "auto" }}>
            <table className="att-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th style={{ textAlign: "center" }}>Total Days</th>
                  <th style={{ textAlign: "center" }}>Present</th>
                  <th style={{ textAlign: "center" }}>Late Days</th>
                  <th style={{ textAlign: "center" }}>Half Days</th>
                  <th style={{ textAlign: "center" }}>Leaves</th>
                  <th style={{ textAlign: "center" }}>Absent</th>
                  <th style={{ textAlign: "center" }}>Attendance %</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map(emp => {
                  let presentCount = 0;
                  let lateCount = 0;
                  let halfDayCount = 0;
                  let leaveCount = 0;
                  let absentCount = 0;

                  dates.forEach(d => {
                    const leave = approvedLeaves.find(l => l.employeeId === emp.id && l.startDate <= d && l.endDate >= d);
                    if (leave) {
                      leaveCount++;
                      return;
                    }

                    const dayPunches = reportData.filter(r => r.employeeId === emp.id && new Date(r.punchTimestamp).toISOString().split("T")[0] === d);
                    if (dayPunches.length === 0) {
                      absentCount++;
                      return;
                    }

                    const pi = [...dayPunches].reverse().find(p => p.punchType === "PUNCH_IN");
                    const po = dayPunches.find(p => p.punchType === "PUNCH_OUT");
                    if (!pi || !po) {
                      absentCount++;
                      return;
                    }

                    const shiftStartTime = pi?.shiftStartTime || emp.shiftStartTime;
                    const shiftGrace = pi?.shiftGracePeriod ?? emp.shiftGracePeriod ?? 15;
                    const shiftExtremeCutoff = pi?.shiftExtremeLateThresholdMinutes ?? emp.shiftExtremeLateThresholdMinutes ?? 120;
                    const minHalf = parseFloat(pi?.shiftMinHoursHalfDay || emp.shiftMinHoursHalfDay || "4.00");
                    const minFull = parseFloat(pi?.shiftMinHoursFullDay || emp.shiftMinHoursFullDay || "8.00");

                    const punchInTime = new Date(pi.punchTimestamp);
                    const punchOutTime = new Date(po.punchTimestamp);
                    const hoursWorked = (punchOutTime.getTime() - punchInTime.getTime()) / (1000 * 60 * 60);

                    let isLate = false;
                    let isExtremeLate = false;
                    if (shiftStartTime) {
                      const shiftStartParts = shiftStartTime.split(":");
                      const expectedStart = new Date(punchInTime);
                      expectedStart.setHours(parseInt(shiftStartParts[0]), parseInt(shiftStartParts[1]), parseInt(shiftStartParts[2] || "0"), 0);
                      isLate = punchInTime.getTime() > expectedStart.getTime() + (shiftGrace * 60 * 1000);
                      isExtremeLate = punchInTime.getTime() > expectedStart.getTime() + (shiftExtremeCutoff * 60 * 1000);
                    }

                    if (hoursWorked < minHalf) {
                      absentCount++;
                    } else if (hoursWorked < minFull || isExtremeLate) {
                      halfDayCount++;
                      if (isLate) lateCount++;
                    } else {
                      presentCount++;
                      if (isLate) lateCount++;
                    }
                  });

                  const attendedEquivalent = presentCount + (halfDayCount * 0.5) + leaveCount;
                  const pct = dates.length > 0 ? Math.round((attendedEquivalent / dates.length) * 100) : 0;

                  return (
                    <tr key={emp.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{emp.name}</div>
                        <div style={{ color: "var(--att-text-muted)", fontSize: "0.75rem" }}>{emp.code}</div>
                      </td>
                      <td style={{ textAlign: "center", fontWeight: 500 }}>{dates.length}</td>
                      <td style={{ textAlign: "center", color: "var(--att-success)", fontWeight: 600 }}>{presentCount}</td>
                      <td style={{ textAlign: "center", color: "#d97706", fontWeight: 600 }}>{lateCount}</td>
                      <td style={{ textAlign: "center", color: "#0284c7", fontWeight: 600 }}>{halfDayCount}</td>
                      <td style={{ textAlign: "center", color: "#7c3aed", fontWeight: 600 }}>{leaveCount}</td>
                      <td style={{ textAlign: "center", color: "var(--att-destructive)", fontWeight: 600 }}>{absentCount}</td>
                      <td style={{ textAlign: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", justifyContent: "center" }}>
                          <div style={{ width: "70px", backgroundColor: "var(--att-border)", height: "6px", borderRadius: "3px", overflow: "hidden" }}>
                            <div style={{ width: `${pct}%`, backgroundColor: pct > 80 ? "var(--att-success)" : pct > 50 ? "#eab308" : "var(--att-destructive)", height: "100%" }}></div>
                          </div>
                          <span style={{ fontSize: "0.75rem", fontWeight: 600 }}>{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      }
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div className="att-card" style={{ padding: "1.5rem" }}>
        <h2 style={{ margin: "0 0 1.5rem 0", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.25rem", color: "var(--att-primary)" }}>
          <Filter size={20} /> Report Configuration
        </h2>
        
        <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem", borderBottom: "1px solid var(--att-border)", paddingBottom: "1rem", flexWrap: "wrap" }}>
          <button 
            type="button"
            onClick={() => setReportType("RAW")}
            className={`att-button-premium ${reportType === "RAW" ? "" : "inactive"}`}
            style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: reportType === "RAW" ? "var(--att-primary)" : "transparent", color: reportType === "RAW" ? "white" : "var(--att-text-muted)", boxShadow: "none", border: reportType === "RAW" ? "1px solid var(--att-primary)" : "1px solid var(--att-border)" }}
          >
            <Table2 size={16} /> Raw Data Report
          </button>
          <button 
            type="button"
            onClick={() => setReportType("DETAILED")}
            className={`att-button-premium ${reportType === "DETAILED" ? "" : "inactive"}`}
            style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: reportType === "DETAILED" ? "var(--att-primary)" : "transparent", color: reportType === "DETAILED" ? "white" : "var(--att-text-muted)", boxShadow: "none", border: reportType === "DETAILED" ? "1px solid var(--att-primary)" : "1px solid var(--att-border)" }}
          >
            <CalendarDays size={16} /> Detailed Employee Report
          </button>
          <button 
            type="button"
            onClick={() => setReportType("SUMMARY")}
            className={`att-button-premium ${reportType === "SUMMARY" ? "" : "inactive"}`}
            style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: reportType === "SUMMARY" ? "var(--att-primary)" : "transparent", color: reportType === "SUMMARY" ? "white" : "var(--att-text-muted)", boxShadow: "none", border: reportType === "SUMMARY" ? "1px solid var(--att-primary)" : "1px solid var(--att-border)" }}
          >
            <PieChart size={16} /> Attendance Summary Report
          </button>
        </div>

        <form onSubmit={handleGenerate} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.25rem" }}>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: 500, color: "var(--att-text-muted)" }}>Start Date *</label>
            <input type="date" className="att-input-premium" value={startDate} onChange={e => setStartDate(e.target.value)} required />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: 500, color: "var(--att-text-muted)" }}>End Date *</label>
            <input type="date" className="att-input-premium" value={endDate} onChange={e => setEndDate(e.target.value)} required />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: 500, color: "var(--att-text-muted)" }}>Department</label>
            <select className="att-input-premium" value={departmentId} onChange={e => setDepartmentId(e.target.value)}>
              <option value="">All Departments</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: 500, color: "var(--att-text-muted)" }}>Role</label>
            <select className="att-input-premium" value={roleId} onChange={e => setRoleId(e.target.value)}>
              <option value="">All Roles</option>
              {roles.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: 500, color: "var(--att-text-muted)" }}>Employee</label>
            <select className="att-input-premium" value={employeeId} onChange={e => setEmployeeId(e.target.value)}>
              <option value="">All Employees</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.code})</option>)}
            </select>
          </div>
          
          <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1rem" }}>
            <button type="submit" className="att-button-premium" disabled={loading} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Search size={16} /> {loading ? "Generating..." : "Generate Report"}
            </button>
            {reportData && reportData.length > 0 && (
              <>
                <button type="button" onClick={exportCSV} className="att-button-premium" style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "var(--att-success)" }}>
                  <Download size={16} /> Export CSV
                </button>
                <button type="button" onClick={exportPDF} className="att-button-premium" style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "#b91c1c", color: "#ffffff" }}>
                  <FileText size={16} /> Export PDF
                </button>
              </>
            )}
          </div>
        </form>
        {error && <div style={{ color: "var(--att-destructive)", marginTop: "1rem", padding: "1rem", background: "#fee", borderRadius: "8px" }}>{error}</div>}
      </div>

      {reportData && (
        <div className="att-card">
          <div style={{ padding: "1.5rem", borderBottom: "1px solid var(--att-border)", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 style={{ margin: 0, fontSize: "1.25rem", color: "var(--att-primary)" }}>
              {reportType === "RAW" ? "Raw Attendance Log" : reportType === "DETAILED" ? "Detailed Employee Records" : "Attendance Summary Overview"}
            </h3>
            {reportType === "RAW" && <span style={{ fontSize: "0.875rem", color: "var(--att-text-muted)", fontWeight: 600 }}>{reportData.length} records</span>}
          </div>
          {renderReportContent()}
        </div>
      )}
    </div>
  );
}

