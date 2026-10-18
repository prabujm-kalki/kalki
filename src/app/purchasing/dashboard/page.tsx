"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Plus,
  Calendar,
  ChevronDown,
  FileText,
  ShoppingCart,
  Truck,
  Clock,
  Wallet,
  TrendingUp,
  AlertCircle,
  Eye,
  RefreshCw,
  Bell,
  ChevronRight,
  MoreVertical,
  MessageCircle,
  PackageCheck,
  Zap,
  X,
  Check,
  CheckCircle2
} from "lucide-react";
import { QuickPurchaseModal } from "@/components/purchasing/QuickPurchaseModal";
import { POTimelineModal } from "@/components/purchasing/POTimelineModal";
import { TaskTimelineModal } from "@/components/purchasing/TaskTimelineModal";
import { useSessionView } from "@/components/AppShell";
import { ActionRequiredBanner } from "@/components/ui/ActionRequiredBanner";
import { ShiftEndAuditQueue } from "@/components/purchasing/ShiftEndAuditQueue";
import {
  fetchPurchaseDashboardData,
  PendingTaskItem,
  PurchaseKPIData,
  RecentPurchaseItem,
  PendingDeliveryItem,
  TopVendorItem,
  TopPurchasedItem,
  LowStockAlertItem,
  MonthlyTrendItem,
  CategoryBreakdownItem
} from "../dashboard-actions";
import { buildPoWhatsappMessage } from "@/lib/whatsapp-po";

export default function PurchaseDashboardPage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingTasks, setPendingTasks] = useState<PendingTaskItem[]>([]);
  const [kpiData, setKpiData] = useState<PurchaseKPIData>({
    totalMonthlySpend: 0,
    spendVsLastMonthPercent: 0,
    totalOrdersCount: 0,
    ordersThisMonthCount: 0,
    goodsReceivedCount: 0,
    pendingReceiptsCount: 0,
    pendingBillsAmount: 0,
    pendingBillsCount: 0,
    overdueCount: 0,
    activeVendorCount: 0
  });
  const [purchases, setPurchases] = useState<RecentPurchaseItem[]>([]);
  const [pendingDeliveries, setPendingDeliveries] = useState<PendingDeliveryItem[]>([]);
  const [topVendors, setTopVendors] = useState<TopVendorItem[]>([]);
  const [topItems, setTopItems] = useState<TopPurchasedItem[]>([]);
  const [lowStockItems, setLowStockItems] = useState<LowStockAlertItem[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrendItem[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdownItem[]>([]);
  const [totalCategorySpend, setTotalCategorySpend] = useState<number>(0);
  const [spotAuditList, setSpotAuditList] = useState<any[]>([]);
  const [trendRange, setTrendRange] = useState<"3M" | "6M" | "12M">("6M");
  const { selected, session } = useSessionView();
  const [isQuickPurchaseOpen, setIsQuickPurchaseOpen] = useState<boolean>(false);
  const [rangePreset, setRangePreset] = useState<string>("this_month");
  const [customFrom, setCustomFrom] = useState<string>("");
  const [customTo, setCustomTo] = useState<string>("");
  const [isDateMenuOpen, setIsDateMenuOpen] = useState<boolean>(false);

  // Modal states for Recent Activity Feed features
  const [previewToken, setPreviewToken] = useState<string | null>(null);
  const [timelinePoId, setTimelinePoId] = useState<string | null>(null);
  const [timelineTaskId, setTimelineTaskId] = useState<string | null>(null);
  const [receivingPo, setReceivingPo] = useState<RecentPurchaseItem | null>(null);
  const [receiveLines, setReceiveLines] = useState<any[]>([]);
  const [loadingReceiveLines, setLoadingReceiveLines] = useState<boolean>(false);
  const [submittingReceive, setSubmittingReceive] = useState<boolean>(false);
  const [processOwnerProof, setProcessOwnerProof] = useState<File | null>(null);

  // Review & Approval Modal State
  const [reviewingPo, setReviewingPo] = useState<{ id: string; poNumber?: string; publicToken?: string | null; vendorName?: string } | null>(null);
  const [reviewLines, setReviewLines] = useState<any[]>([]);
  const [loadingLines, setLoadingLines] = useState<boolean>(false);
  const [submittingApproval, setSubmittingApproval] = useState<boolean>(false);

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (previewToken) setPreviewToken(null);
        if (timelinePoId) setTimelinePoId(null);
        if (timelineTaskId) setTimelineTaskId(null);
        if (receivingPo) setReceivingPo(null);
        if (reviewingPo) setReviewingPo(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewToken, timelinePoId, timelineTaskId, receivingPo, reviewingPo]);

  const openApprovalModal = async (poId: string, title?: string, publicToken?: string | null) => {
    setReviewingPo({ id: poId, poNumber: title, publicToken });
    setLoadingLines(true);
    try {
      // First try receive-details which returns authoritative lines with item names
      const res = await fetch(`/api/purchase-orders/${poId}/receive-details`);
      if (res.ok) {
        const data = await res.json();
        const lines = data.lines || [];
        setReviewLines(lines.map((l: any) => ({
          ...l,
          editQuantity: l.orderedQuantity != null ? String(l.orderedQuantity) : "1",
          unitRate: l.unitRate != null ? String(l.unitRate) : "0",
        })));
        if (data.vendorName) {
          setReviewingPo({ id: poId, poNumber: data.po?.poNumber || title, publicToken: data.po?.publicToken || publicToken, vendorName: data.vendorName });
        }
      } else if (publicToken) {
        // Fallback to public token
        const pubRes = await fetch(`/api/public/po?token=${publicToken}`);
        if (pubRes.ok) {
          const data = await pubRes.json();
          const lines = data.lines || [];
          setReviewLines(lines.map((l: any) => ({
            ...l,
            editQuantity: l.orderedQuantity != null ? String(l.orderedQuantity) : "1",
            unitRate: l.unitRate != null ? String(l.unitRate) : "0",
          })));
        } else {
          alert("Unable to fetch PO line items.");
        }
      } else {
        alert("Failed to load PO details for review.");
      }
    } catch (err: any) {
      console.error("Error opening approval modal:", err);
      alert("Error loading PO items.");
    } finally {
      setLoadingLines(false);
    }
  };

  const handleApproveAction = async (action: "accept" | "reject") => {
    if (!reviewingPo) return;
    setSubmittingApproval(true);
    try {
      const apiLines = reviewLines.map((l) => ({
        itemId: l.itemId,
        orderedQuantity: l.editQuantity,
        unitRate: l.unitRate,
      }));

      const res = await fetch(`/api/purchase-orders/${reviewingPo.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines: apiLines, action }),
      });

      if (res.ok) {
        setReviewingPo(null);
        await loadData();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || `Failed to ${action} PO.`);
      }
    } catch (err: any) {
      console.error(`Error during PO ${action}:`, err);
      alert(`An error occurred while trying to ${action} PO.`);
    } finally {
      setSubmittingApproval(false);
    }
  };

  const closeReceiveModal = () => {
    setReceivingPo(null);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (url.searchParams.has("receivePoId")) {
        url.searchParams.delete("receivePoId");
        window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
      }
    }
  };

  const openReceiveModal = async (po: RecentPurchaseItem) => {
    setReceivingPo(po);
    setLoadingReceiveLines(true);
    setProcessOwnerProof(null);
    try {
      // First try receive-details endpoint
      const res = await fetch(`/api/purchase-orders/${po.id}/receive-details`);
      let linesData: any[] = [];
      if (res.ok) {
        const data = await res.json();
        linesData = data.lines || [];
      } else if (po.publicToken) {
        const pubRes = await fetch(`/api/public/po?token=${po.publicToken}`);
        if (pubRes.ok) {
          const data = await pubRes.json();
          linesData = data.lines || [];
        } else {
          alert("Failed to load PO details for receiving");
        }
      } else {
        alert("Failed to load PO items");
      }

      setReceiveLines(
        linesData.map((l: any) => ({
          ...l,
          orderedQuantity: l.orderedQuantity,
          receivedQuantity: l.orderedQuantity,
          acknowledged: true,
          actionTaken: "OK" as "OK" | "ZERO" | "MODIFIED" | null,
          isZero: false,
        }))
      );
    } catch (err) {
      console.error("Error loading lines for receive modal:", err);
      alert("Error loading PO lines");
    } finally {
      setLoadingReceiveLines(false);
    }
  };

  const handleReceiveQtyChange = (idx: number, value: string) => {
    setReceiveLines((prev) => {
      const updated = [...prev];
      const target = { ...updated[idx] };
      const isZero = Number(value) === 0;
      const isFull = Number(value) === Number(target.orderedQuantity);
      target.receivedQuantity = value;
      target.isZero = isZero;
      target.acknowledged = true;
      target.actionTaken = isFull ? "OK" : isZero ? "ZERO" : "MODIFIED";
      updated[idx] = target;
      return updated;
    });
  };

  const handleReceiveSetOk = (idx: number) => {
    setReceiveLines((prev) => {
      const updated = [...prev];
      const target = { ...updated[idx] };
      target.receivedQuantity = target.orderedQuantity;
      target.isZero = false;
      target.acknowledged = true;
      target.actionTaken = "OK";
      updated[idx] = target;
      return updated;
    });
  };

  const handleReceiveSetZero = (idx: number) => {
    setReceiveLines((prev) => {
      const updated = [...prev];
      const target = { ...updated[idx] };
      target.receivedQuantity = "0";
      target.isZero = true;
      target.acknowledged = true;
      target.actionTaken = "ZERO";
      updated[idx] = target;
      return updated;
    });
  };

  const handleReceiveSetAllOk = () => {
    setReceiveLines((prev) =>
      prev.map((l) => ({
        ...l,
        receivedQuantity: l.orderedQuantity,
        isZero: false,
        acknowledged: true,
        actionTaken: "OK",
      }))
    );
  };

  const handleSubmitQuickReceive = async () => {
    if (!receivingPo) return;
    const allChecked = receiveLines.length > 0 && receiveLines.every((l) => l.acknowledged);
    if (!allChecked) {
      alert("Please verify all items (click 'All OK' or update quantity) before submitting.");
      return;
    }

    setSubmittingReceive(true);
    try {
      const payloadLines = receiveLines.map((l: any) => ({
        id: l.id,
        orderedQuantity: l.orderedQuantity,
        receivedQuantity: l.receivedQuantity !== undefined && l.receivedQuantity !== null ? l.receivedQuantity : l.orderedQuantity,
      }));

      const formData = new FormData();
      formData.append("receivedLines", JSON.stringify(payloadLines));
      if (processOwnerProof) {
        formData.append("processOwnerProof", processOwnerProof);
      }

      const res = await fetch(`/api/purchase-orders/${receivingPo.id}/receive`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        closeReceiveModal();
        await loadData();
      } else {
        const data = await res.json().catch(() => ({}));
        alert("Failed to receive PO: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      console.error(err);
      alert("Error receiving PO");
    } finally {
      setSubmittingReceive(false);
    }
  };

  // Helper to compute date bounds based on preset
  const getDateBounds = useCallback((preset: string, from?: string, to?: string) => {
    const today = new Date();
    const formatDate = (d: Date) => d.toISOString().split("T")[0];

    switch (preset) {
      case "today": {
        const d = formatDate(today);
        return { startDate: d, endDate: d, label: "Today" };
      }
      case "yesterday": {
        const y = new Date(today);
        y.setDate(y.getDate() - 1);
        const d = formatDate(y);
        return { startDate: d, endDate: d, label: "Yesterday" };
      }
      case "last_7_days": {
        const d = new Date(today);
        d.setDate(d.getDate() - 7);
        return { startDate: formatDate(d), endDate: formatDate(today), label: "Last 7 Days" };
      }
      case "last_15_days": {
        const d = new Date(today);
        d.setDate(d.getDate() - 15);
        return { startDate: formatDate(d), endDate: formatDate(today), label: "Last 15 Days" };
      }
      case "this_month": {
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        return { startDate: formatDate(firstDay), endDate: formatDate(today), label: "This Month" };
      }
      case "last_month": {
        const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
        return { startDate: formatDate(firstDay), endDate: formatDate(lastDay), label: "Last Month" };
      }
      case "last_3_months": {
        const d = new Date(today);
        d.setMonth(d.getMonth() - 3);
        return { startDate: formatDate(d), endDate: formatDate(today), label: "Last 3 Months" };
      }
      case "last_6_months": {
        const d = new Date(today);
        d.setMonth(d.getMonth() - 6);
        return { startDate: formatDate(d), endDate: formatDate(today), label: "Last 6 Months" };
      }
      case "last_1_year": {
        const d = new Date(today);
        d.setFullYear(d.getFullYear() - 1);
        return { startDate: formatDate(d), endDate: formatDate(today), label: "Last 1 Year" };
      }
      case "custom": {
        const start = from || formatDate(today);
        const end = to || formatDate(today);
        return { startDate: start, endDate: end, label: `${start} to ${end}` };
      }
      default: {
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        return { startDate: formatDate(firstDay), endDate: formatDate(today), label: "This Month" };
      }
    }
  }, []);

  const currentRangeBounds = React.useMemo(() => {
    return getDateBounds(rangePreset, customFrom, customTo);
  }, [getDateBounds, rangePreset, customFrom, customTo]);

  const queryTenant = React.useMemo(() => {
    if (!selected?.organizationId) return "";
    return `&organizationId=${selected.organizationId}${selected.locationId && selected.locationId !== "ALL" ? `&locationId=${selected.locationId}` : ""}`;
  }, [selected?.organizationId, selected?.locationId]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const bounds = getDateBounds(rangePreset, customFrom, customTo);
      const res = await fetchPurchaseDashboardData({
        startDate: bounds.startDate,
        endDate: bounds.endDate,
        trendRange,
        organizationId: selected?.organizationId,
        locationId: selected?.locationId,
      });
      if (res.success && res.data) {
        setPendingTasks(res.data.pendingTasks);
        setKpiData(res.data.kpiData);
        setPurchases(res.data.recentPurchases);
        setPendingDeliveries(res.data.pendingDeliveries);
        setTopVendors(res.data.topVendors);
        setTopItems(res.data.topItems);
        setLowStockItems(res.data.lowStockItems);
        setMonthlyTrends(res.data.monthlyTrends);
        setCategoryBreakdown(res.data.categoryBreakdown);
        setTotalCategorySpend(res.data.totalCategorySpend);
        setSpotAuditList(res.data.spotAudits || []);

        // Check if navigated with view=audit or #shift-end-audit
        const params = new URLSearchParams(window.location.search);
        const view = params.get("view");
        if (view === "audit" || window.location.hash === "#shift-end-audit") {
          setTimeout(() => {
            const el = document.getElementById("shift-end-audit");
            if (el) {
              el.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          }, 150);
        }

        // Check if navigated with receivePoId
        const receivePoId = params.get("receivePoId");
        if (receivePoId && res.data.recentPurchases) {
          const targetPo = res.data.recentPurchases.find((p: RecentPurchaseItem) => p.id === receivePoId);
          if (targetPo) {
            openReceiveModal(targetPo);
          } else {
            // Load by minimal stub so receive-details can still fetch it
            openReceiveModal({
              id: receivePoId,
              poNumber: "Purchase Order",
              vendorName: "Vendor",
              amount: 0,
              date: new Date().toISOString(),
              status: "SENT",
              rawStatus: "sent_to_vendor",
              itemsCount: 0,
            });
          }
        }
      } else {
        setError(res.error || "Failed to load purchasing dashboard data");
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected network error occurred");
    } finally {
      setLoading(false);
    }
  }, [getDateBounds, rangePreset, customFrom, customTo, trendRange, selected?.organizationId, selected?.locationId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(val);
  };

  const getStatusCapsule = (status: string) => {
    const s = status.toUpperCase();
    if (s === "COMPLETED") {
      return (
        <span style={{
          padding: "3px 10px",
          borderRadius: "99px",
          backgroundColor: "#dcfce7",
          color: "#16a34a",
          fontSize: "11px",
          fontWeight: 600,
          display: "inline-block"
        }}>
          Completed
        </span>
      );
    }
    if (s === "AUDITED") {
      return (
        <span style={{
          padding: "3px 10px",
          borderRadius: "99px",
          backgroundColor: "#f3e8ff",
          color: "#7e22ce",
          fontSize: "11px",
          fontWeight: 600,
          display: "inline-block"
        }}>
          Audited
        </span>
      );
    }
    if (s === "AWAITING AUDIT") {
      return (
        <span style={{
          padding: "3px 10px",
          borderRadius: "99px",
          backgroundColor: "#fef3c7",
          color: "#b45309",
          fontSize: "11px",
          fontWeight: 600,
          display: "inline-block"
        }}>
          Awaiting Audit
        </span>
      );
    }
    if (s === "RECEIVED") {
      return (
        <span style={{
          padding: "3px 10px",
          borderRadius: "99px",
          backgroundColor: "#e0e7ff",
          color: "#4338ca",
          fontSize: "11px",
          fontWeight: 600,
          display: "inline-block"
        }}>
          Received
        </span>
      );
    }
    if (s === "DELAYED" || s === "OVERDUE") {
      return (
        <span style={{
          padding: "3px 10px",
          borderRadius: "99px",
          backgroundColor: "#fee2e2",
          color: "#dc2626",
          fontSize: "11px",
          fontWeight: 600,
          display: "inline-block"
        }}>
          Delayed
        </span>
      );
    }
    if (s === "IN TRANSIT") {
      return (
        <span style={{
          padding: "3px 10px",
          borderRadius: "99px",
          backgroundColor: "#fef3c7",
          color: "#d97706",
          fontSize: "11px",
          fontWeight: 600,
          display: "inline-block"
        }}>
          In Transit
        </span>
      );
    }
    if (s === "AWAITING") {
      return (
        <span style={{
          padding: "3px 10px",
          borderRadius: "99px",
          backgroundColor: "#fef3c7",
          color: "#d97706",
          fontSize: "11px",
          fontWeight: 600,
          display: "inline-block"
        }}>
          Awaiting
        </span>
      );
    }
    if (s === "PARTIALLY RECEIVED") {
      return (
        <span style={{
          padding: "3px 10px",
          borderRadius: "99px",
          backgroundColor: "#ffedd5",
          color: "#ea580c",
          fontSize: "11px",
          fontWeight: 600,
          display: "inline-block"
        }}>
          Partially Received
        </span>
      );
    }
    if (s === "REJECTED" || s === "CANCELLED") {
      return (
        <span style={{
          padding: "3px 10px",
          borderRadius: "99px",
          backgroundColor: "#fee2e2",
          color: "#dc2626",
          fontSize: "11px",
          fontWeight: 600,
          display: "inline-block"
        }}>
          {s === "CANCELLED" ? "Cancelled" : "Rejected"}
        </span>
      );
    }
    if (s === "SENT") {
      return (
        <span style={{
          padding: "3px 10px",
          borderRadius: "99px",
          backgroundColor: "#e0f2fe",
          color: "#0284c7",
          fontSize: "11px",
          fontWeight: 600,
          display: "inline-block"
        }}>
          Sent
        </span>
      );
    }
    if (s === "CYCLE STARTED" || s === "ASSESSMENT PENDING") {
      const isPending = s === "ASSESSMENT PENDING";
      return (
        <span style={{
          padding: "3px 10px",
          borderRadius: "99px",
          backgroundColor: isPending ? "#fef3c7" : "#eff6ff",
          color: isPending ? "#b45309" : "#1d4ed8",
          border: `1px solid ${isPending ? "#fde68a" : "#bfdbfe"}`,
          fontSize: "11px",
          fontWeight: 700,
          display: "inline-flex",
          alignItems: "center",
          gap: "5px"
        }}>
          <span style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            backgroundColor: isPending ? "#d97706" : "#2563eb",
            display: "inline-block"
          }} />
          {isPending ? "Assessment Pending" : "Cycle Started"}
        </span>
      );
    }
    if (s === "PENDING APPROVAL") {
      return (
        <span style={{
          padding: "3px 10px",
          borderRadius: "99px",
          backgroundColor: "#fef3c7",
          color: "#b45309",
          fontSize: "11px",
          fontWeight: 600,
          display: "inline-block"
        }}>
          Pending Approval
        </span>
      );
    }
    if (s === "APPROVED") {
      return (
        <span style={{
          padding: "3px 10px",
          borderRadius: "99px",
          backgroundColor: "#f0fdf4",
          color: "#15803d",
          fontSize: "11px",
          fontWeight: 600,
          display: "inline-block"
        }}>
          Approved
        </span>
      );
    }
    return (
      <span style={{
        padding: "3px 10px",
        borderRadius: "99px",
        backgroundColor: "#f1f5f9",
        color: "#64748b",
        fontSize: "11px",
        fontWeight: 600,
        display: "inline-block"
      }}>
        {status}
      </span>
    );
  };

  // Compute Conic Gradient from live Category Breakdown
  const conicGradientString = React.useMemo(() => {
    if (!categoryBreakdown || categoryBreakdown.length === 0) {
      return "conic-gradient(#22c55e 0% 100%)";
    }
    let currentPct = 0;
    const parts = categoryBreakdown.map((cat) => {
      const start = currentPct;
      const end = currentPct + (cat.percentage || 0);
      currentPct = end;
      return `${cat.color} ${start}% ${end}%`;
    });
    // Ensure 100% completion
    if (currentPct < 100 && parts.length > 0) {
      const last = categoryBreakdown[categoryBreakdown.length - 1];
      parts[parts.length - 1] = `${last.color} ${currentPct - (last.percentage || 0)}% 100%`;
    }
    return `conic-gradient(${parts.join(", ")})`;
  }, [categoryBreakdown]);

  // Compute dynamic scale and coords for SVG Monthly Trend
  const maxTrendSpend = React.useMemo(() => {
    const maxVal = Math.max(...monthlyTrends.map(m => m.total), 10000);
    return Math.ceil(maxVal / 10000) * 10000;
  }, [monthlyTrends]);

  const handleSendWhatsApp = async (po: RecentPurchaseItem) => {
    let lines: any[] | null = null;
    try {
      if (po.publicToken) {
        const poRes = await fetch(`/api/public/po?token=${po.publicToken}`);
        if (poRes.ok) {
          const poData = await poRes.json();
          if (poData.lines && poData.lines.length > 0) {
            lines = poData.lines;
          }
        }
      }
    } catch (err) {
      console.error("Error fetching PO lines for WhatsApp message:", err);
    }

    const { whatsappUrl } = buildPoWhatsappMessage({
      poNumber: po.poNumber,
      totalAmount: po.amount,
      publicToken: po.publicToken || po.id,
      lines: lines,
      vendorPhone: po.vendorPhone,
      poWhatsappPreference: po.poWhatsappPreference,
      whatsappPoTemplate: po.whatsappPoTemplate
    });

    try {
      await fetch(`/api/purchase-orders/${po.id}/mark-sent`, { method: "POST" });
    } catch (e) {
      console.error("Failed to mark PO as sent:", e);
    }

    window.open(whatsappUrl, "_blank");
    loadData();
  };

  return (
    <>
      {/* 1. Scoped Style Block */}
      <style>{`
        .dashboard-root {
          background-color: #f8fafc;
          min-height: 100vh;
          padding: 18px 24px 32px 24px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          box-sizing: border-box;
          width: 100%;
        }
        .premium-card {
          background-color: #ffffff;
          border: 1px solid #edf2f7;
          border-radius: 12px;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px 0 rgba(0, 0, 0, 0.02);
          padding: 16px 20px;
          box-sizing: border-box;
        }
        .kpi-card-clickable {
          cursor: pointer;
          text-decoration: none !important;
          color: inherit;
          display: flex;
          transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease;
          position: relative;
        }
        .kpi-card-clickable,
        .kpi-card-clickable:hover,
        .kpi-card-clickable:focus,
        .kpi-card-clickable:active,
        .kpi-card-clickable * {
          text-decoration: none !important;
        }
        .kpi-card-clickable:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px -2px rgba(0, 0, 0, 0.08), 0 2px 4px -1px rgba(0, 0, 0, 0.04);
          border-color: #cbd5e1;
        }
        .kpi-card-clickable:active {
          transform: translateY(0);
        }
        .dashboard-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 14px;
          margin-bottom: 20px;
          width: 100%;
        }
        .analytics-grid {
          display: grid;
          grid-template-columns: 63% 37%;
          gap: 14px;
          margin-bottom: 20px;
          width: 100%;
        }
        .tables-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 14px;
          margin-bottom: 20px;
          width: 100%;
        }
        .performance-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          margin-bottom: 20px;
          width: 100%;
        }
        .kpi-value {
          font-size: 24px;
          font-weight: 700;
          color: #0f172a;
          margin: 4px 0 2px 0;
          line-height: 1.2;
          letter-spacing: -0.01em;
        }
        .kpi-label {
          font-size: 12px;
          font-weight: 500;
          color: #64748b;
          text-transform: none;
        }
        .table-header {
          background-color: #f8fafc;
          padding: 10px 14px;
          font-size: 11px;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          text-align: left;
          border-bottom: 1px solid #e2e8f0;
          white-space: nowrap;
        }
        .table-cell {
          padding: 10px 14px;
          border-bottom: 1px solid #f1f5f9;
          color: #1e293b;
          font-size: 13px;
          vertical-align: middle;
        }
        .mobile-only-feed {
          display: none;
        }
        .desktop-only-feed {
          display: block;
        }

        /* Strict Mobile Collapse */
        @media (max-width: 768px) {
          .dashboard-root { padding: 12px; }
          .dashboard-header { flex-direction: column; align-items: stretch; }
          .kpi-grid { grid-template-columns: 1fr 1fr; }
          .kpi-grid > div:last-child { grid-column: span 2; }
          .analytics-grid { display: none !important; }
          .tables-grid { grid-template-columns: 1fr; }
          .desktop-only-feed { display: none !important; }
          .mobile-only-feed { display: flex !important; flex-direction: column; gap: 12px; }
          .performance-grid { grid-template-columns: 1fr; }
          .performance-grid > div:nth-child(1),
          .performance-grid > div:nth-child(2) { display: none !important; }
        }
      `}</style>

      {/* 2. Main Dashboard Root */}
      <div className="dashboard-root">
        {/* Header */}
        <header className="dashboard-header">
          <div>
            <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#1e293b", margin: "0 0 4px 0", letterSpacing: "-0.01em" }}>
              Purchase Dashboard
            </h1>
            <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>
              Overview of your restaurant purchases, receipts and supplier performance
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            {/* Date Range Selector Dropdown */}
            <div style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => setIsDateMenuOpen((prev) => !prev)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  backgroundColor: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "7px",
                  padding: "7px 14px",
                  fontSize: "12px",
                  fontWeight: 500,
                  color: "#334155",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                  cursor: "pointer"
                }}
              >
                <Calendar size={14} style={{ color: "#64748b" }} />
                <span>{currentRangeBounds.label}</span>
                <ChevronDown size={13} style={{ color: "#94a3b8" }} />
              </button>

              {isDateMenuOpen && (
                <div style={{
                  position: "absolute",
                  top: "100%",
                  right: 0,
                  marginTop: "6px",
                  backgroundColor: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                  width: "240px",
                  zIndex: 50,
                  padding: "8px"
                }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", padding: "4px 8px 8px 8px" }}>
                    Select Range
                  </div>
                  {[
                    { key: "today", label: "Today" },
                    { key: "yesterday", label: "Yesterday" },
                    { key: "last_7_days", label: "Last 7 Days" },
                    { key: "last_15_days", label: "Last 15 Days" },
                    { key: "this_month", label: "This Month" },
                    { key: "last_month", label: "Last Month" },
                    { key: "last_3_months", label: "Last 3 Months" },
                    { key: "last_6_months", label: "Last 6 Months" },
                    { key: "last_1_year", label: "Last 1 Year" },
                    { key: "custom", label: "Custom Range" },
                  ].map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => {
                        setRangePreset(option.key);
                        if (option.key !== "custom") {
                          setIsDateMenuOpen(false);
                        }
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        width: "100%",
                        padding: "6px 10px",
                        fontSize: "12px",
                        textAlign: "left",
                        borderRadius: "5px",
                        border: "none",
                        backgroundColor: rangePreset === option.key ? "#f1f5f9" : "transparent",
                        color: rangePreset === option.key ? "#0f172a" : "#475569",
                        fontWeight: rangePreset === option.key ? 600 : 400,
                        cursor: "pointer"
                      }}
                    >
                      <span>{option.label}</span>
                      {rangePreset === option.key && <span style={{ color: "#7c3a27", fontSize: "10px" }}>✓</span>}
                    </button>
                  ))}

                  {rangePreset === "custom" && (
                    <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px solid #f1f5f9", display: "flex", flexDirection: "column", gap: "6px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <span style={{ fontSize: "10px", color: "#64748b" }}>From:</span>
                        <input
                          type="date"
                          value={customFrom}
                          onChange={(e) => setCustomFrom(e.target.value)}
                          style={{ padding: "4px 6px", fontSize: "11px", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                        />
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <span style={{ fontSize: "10px", color: "#64748b" }}>To:</span>
                        <input
                          type="date"
                          value={customTo}
                          onChange={(e) => setCustomTo(e.target.value)}
                          style={{ padding: "4px 6px", fontSize: "11px", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsDateMenuOpen(false)}
                        style={{
                          marginTop: "4px",
                          backgroundColor: "#7c3a27",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: "4px",
                          padding: "5px",
                          fontSize: "11px",
                          fontWeight: 600,
                          cursor: "pointer"
                        }}
                      >
                        Apply Filter
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={loadData}
              title="Refresh Data"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "7px",
                padding: "7px 11px",
                cursor: "pointer",
                color: "#475569",
                boxShadow: "0 1px 2px rgba(0,0,0,0.03)"
              }}
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>

            {/* Quick Purchase Primary Button */}
            {(session?.isOwner || selected?.permissions?.includes("purchasing.create_po:create")) && (
              <button
                type="button"
                onClick={() => {
                  if (!selected?.organizationId || !selected?.locationId || selected.locationId === "ALL") {
                    alert("Please select an active branch context first.");
                    return;
                  }
                  setIsQuickPurchaseOpen(true);
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  backgroundColor: "#7c3a27",
                  color: "#ffffff",
                  padding: "7px 16px",
                  fontSize: "13px",
                  fontWeight: 600,
                  borderRadius: "7px",
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 1px 3px rgba(124, 58, 39, 0.25)"
                }}
              >
                <Zap size={14} />
                <span>Quick Purchase ⚡</span>
              </button>
            )}
          </div>
        </header>

        {/* Error Banner */}
        {error && (
          <div style={{
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "10px",
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "16px",
            color: "#991b1b"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <AlertCircle size={17} />
              <span style={{ fontSize: "13px", fontWeight: 600 }}>{error}</span>
            </div>
            <button type="button" onClick={loadData} style={{ background: "none", border: "none", color: "#991b1b", fontWeight: 700, cursor: "pointer", fontSize: "12px" }}>
              Retry
            </button>
          </div>
        )}

        {/* Pending Tasks Banner */}
        {!loading && pendingTasks.length > 0 && (
          <ActionRequiredBanner
            tasks={pendingTasks as any}
            onTaskResolved={() => loadData()}
          />
        )}

        {/* 1. KPI Row (5-column Grid - 100% Real Live DB Data - Clickable to Filtered Reports) */}
        <div className="kpi-grid">
          {/* Total Purchase Value */}
          <Link
            href={`/purchasing/reports?type=all&from=${currentRangeBounds.startDate}&to=${currentRangeBounds.endDate}${queryTenant}`}
            className="premium-card kpi-card-clickable"
            style={{ display: "flex", alignItems: "center", gap: "12px", textDecoration: "none" }}
            title="Click to view all purchase records justifying this spend"
          >
            <div style={{ width: "38px", height: "38px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, backgroundColor: "#eff6ff", color: "#3b82f6" }}>
              <FileText size={19} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="kpi-label">Total Purchase Value</div>
              <div className="kpi-value">
                {formatCurrency(kpiData.totalMonthlySpend)}
              </div>
              <div style={{ fontSize: "11px", fontWeight: 600, color: kpiData.spendVsLastMonthPercent >= 0 ? "#16a34a" : "#dc2626", display: "flex", alignItems: "center", gap: "3px" }}>
                <span style={{ fontSize: "9px" }}>{kpiData.spendVsLastMonthPercent >= 0 ? "▲" : "▼"}</span>
                <span>{Math.abs(kpiData.spendVsLastMonthPercent)}%</span>
                <span style={{ color: "#94a3b8", fontWeight: 400 }}>vs previous month</span>
              </div>
            </div>
          </Link>

          {/* Purchase Orders */}
          <Link
            href={`/purchasing/reports?type=all_orders&from=${currentRangeBounds.startDate}&to=${currentRangeBounds.endDate}${queryTenant}`}
            className="premium-card kpi-card-clickable"
            style={{ display: "flex", alignItems: "center", gap: "12px", textDecoration: "none" }}
            title={`Click to view all ${kpiData.totalOrdersCount} purchase orders`}
          >
            <div style={{ width: "38px", height: "38px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, backgroundColor: "#e0f2fe", color: "#0284c7" }}>
              <ShoppingCart size={19} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="kpi-label">Purchase Orders</div>
              <div className="kpi-value">{kpiData.totalOrdersCount}</div>
              <div style={{ fontSize: "11px", fontWeight: 600, color: "#16a34a", display: "flex", alignItems: "center", gap: "3px" }}>
                <span style={{ fontSize: "9px" }}>▲</span>
                <span>{kpiData.ordersThisMonthCount} this month</span>
              </div>
            </div>
          </Link>

          {/* Goods Received */}
          <Link
            href={`/purchasing/reports?type=goods_received&from=${currentRangeBounds.startDate}&to=${currentRangeBounds.endDate}${queryTenant}`}
            className="premium-card kpi-card-clickable"
            style={{ display: "flex", alignItems: "center", gap: "12px", textDecoration: "none" }}
            title={`Click to view all ${kpiData.goodsReceivedCount} received orders`}
          >
            <div style={{ width: "38px", height: "38px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, backgroundColor: "#dcfce7", color: "#16a34a" }}>
              <Truck size={19} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="kpi-label">Goods Received</div>
              <div className="kpi-value">{kpiData.goodsReceivedCount}</div>
              <div style={{ fontSize: "11px", fontWeight: 600, color: "#16a34a", display: "flex", alignItems: "center", gap: "3px" }}>
                <span style={{ fontSize: "9px" }}>▲</span>
                <span>{kpiData.goodsReceivedCount} this month</span>
              </div>
            </div>
          </Link>

          {/* Pending Receipts */}
          <Link
            href={`/purchasing/reports?type=pending_receipts${queryTenant}`}
            className="premium-card kpi-card-clickable"
            style={{ display: "flex", alignItems: "center", gap: "12px", textDecoration: "none" }}
            title={`Click to view the ${kpiData.pendingReceiptsCount} pending receipt orders`}
          >
            <div style={{ width: "38px", height: "38px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, backgroundColor: "#fef3c7", color: "#d97706" }}>
              <Clock size={19} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="kpi-label">Pending Receipts</div>
              <div className="kpi-value">{kpiData.pendingReceiptsCount}</div>
              <div style={{ fontSize: "11px", fontWeight: 600, color: kpiData.overdueCount > 0 ? "#dc2626" : "#64748b", display: "flex", alignItems: "center", gap: "3px" }}>
                {kpiData.overdueCount > 0 ? (
                  <>
                    <span style={{ fontSize: "9px" }}>▲</span>
                    <span>{kpiData.overdueCount} awaiting delivery</span>
                  </>
                ) : (
                  <span>All shipments on schedule</span>
                )}
              </div>
            </div>
          </Link>

          {/* Pending Bills */}
          <Link
            href={`/purchasing/reports?type=pending_bills${queryTenant}`}
            className="premium-card kpi-card-clickable"
            style={{ display: "flex", alignItems: "center", gap: "12px", textDecoration: "none" }}
            title={`Click to view all ${kpiData.pendingBillsCount} pending invoices / bills`}
          >
            <div style={{ width: "38px", height: "38px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, backgroundColor: "#ffedd5", color: "#ea580c" }}>
              <Wallet size={19} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="kpi-label">Pending Bills</div>
              <div className="kpi-value">{formatCurrency(kpiData.pendingBillsAmount)}</div>
              <div style={{ fontSize: "11px", fontWeight: 500, color: "#d97706" }}>
                <span>{kpiData.pendingBillsCount} invoices</span>
              </div>
            </div>
          </Link>
        </div>

        {/* 2. Analytics Row (63% / 37% Grid - Connected to Live Aggregations) */}
        <div className="analytics-grid">
          {/* Monthly Trend */}
          <div className="premium-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <h2 style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", margin: 0 }}>Monthly Purchase Trend</h2>
              <div style={{ display: "inline-flex", backgroundColor: "#f1f5f9", borderRadius: "6px", padding: "2px", gap: "2px" }}>
                {(["3M", "6M", "12M"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setTrendRange(r)}
                    style={{
                      border: "none",
                      background: trendRange === r ? "#451a03" : "transparent",
                      color: trendRange === r ? "#ffffff" : "#64748b",
                      padding: "4px 10px",
                      fontSize: "11px",
                      fontWeight: 600,
                      borderRadius: "4px",
                      cursor: "pointer"
                    }}
                  >
                    {r === "3M" ? "3 Months" : r === "6M" ? "6 Months" : "12 Months"}
                  </button>
                ))}
              </div>
            </div>

            {/* High-Fidelity SVG Stacked Chart with Live Trend Data */}
            <div style={{ position: "relative", width: "100%", height: "230px" }}>
              <svg viewBox="0 0 540 210" style={{ width: "100%", height: "100%", overflow: "visible" }}>
                {/* Horizontal Grid lines */}
                <g stroke="#f1f5f9" strokeWidth="1">
                  <line x1="72" y1="20" x2="520" y2="20" />
                  <line x1="72" y1="55" x2="520" y2="55" />
                  <line x1="72" y1="90" x2="520" y2="90" />
                  <line x1="72" y1="125" x2="520" y2="125" />
                  <line x1="72" y1="160" x2="520" y2="160" />
                </g>

                {/* Y-Axis Labels based on max trend spend */}
                <g fill="#94a3b8" fontSize="10" textAnchor="end">
                  <text x="64" y="24">{formatCurrency(maxTrendSpend)}</text>
                  <text x="64" y="59">{formatCurrency(Math.round(maxTrendSpend * 0.75))}</text>
                  <text x="64" y="94">{formatCurrency(Math.round(maxTrendSpend * 0.50))}</text>
                  <text x="64" y="129">{formatCurrency(Math.round(maxTrendSpend * 0.25))}</text>
                  <text x="64" y="164">₹ 0</text>
                </g>

                {/* Live Stacked Bars */}
                {monthlyTrends.map((col, idx) => {
                  const count = monthlyTrends.length || 1;
                  const availableWidth = 440;
                  const step = availableWidth / count;
                  const barWidth = Math.min(28, Math.max(16, Math.floor(step * 0.55)));
                  const xPos = 82 + (idx + 0.5) * step;
                  const baseY = 160;
                  const scale = 140 / (maxTrendSpend || 1);

                  const hGreen = Math.max(2, Math.round(col.vegetables * scale));
                  const hBrown = Math.max(2, Math.round(col.meat * scale));
                  const hYellow = Math.max(2, Math.round(col.dry * scale));
                  const hBlue = Math.max(2, Math.round(col.others * scale));

                  const yGreen = baseY - hGreen;
                  const yBrown = yGreen - hBrown;
                  const yYellow = yBrown - hYellow;
                  const yBlue = yYellow - hBlue;

                  return (
                    <g key={idx}>
                      <rect x={xPos - barWidth / 2} y={yGreen} width={barWidth} height={hGreen} fill="#22c55e" />
                      <rect x={xPos - barWidth / 2} y={yBrown} width={barWidth} height={hBrown} fill="#9a3412" />
                      <rect x={xPos - barWidth / 2} y={yYellow} width={barWidth} height={hYellow} fill="#f59e0b" />
                      <rect x={xPos - barWidth / 2} y={yBlue} width={barWidth} height={hBlue} rx="3" fill="#38bdf8" />
                      <text x={xPos} y="178" fill="#64748b" fontSize={count > 6 ? "9" : "11"} textAnchor="middle">{col.month}</text>
                    </g>
                  );
                })}

                {/* Overlaid Total Trend Line */}
                {monthlyTrends.length > 1 && (
                  <>
                    <polyline
                      fill="none"
                      stroke="#3b1d11"
                      strokeWidth="2.5"
                      strokeLinejoin="round"
                      points={monthlyTrends.map((col, idx) => {
                        const count = monthlyTrends.length || 1;
                        const availableWidth = 440;
                        const step = availableWidth / count;
                        const xPos = 82 + (idx + 0.5) * step;
                        const scale = 140 / (maxTrendSpend || 1);
                        const yPos = 160 - Math.round(col.total * scale);
                        return `${xPos},${Math.max(20, yPos)}`;
                      }).join(" ")}
                    />
                    {monthlyTrends.map((col, idx) => {
                      const count = monthlyTrends.length || 1;
                      const availableWidth = 440;
                      const step = availableWidth / count;
                      const xPos = 82 + (idx + 0.5) * step;
                      const scale = 140 / (maxTrendSpend || 1);
                      const yPos = Math.max(20, 160 - Math.round(col.total * scale));
                      return (
                        <circle key={idx} cx={xPos} cy={yPos} r="3.5" fill="#3b1d11" stroke="#ffffff" strokeWidth="1.5" />
                      );
                    })}
                  </>
                )}
              </svg>
            </div>

            {/* Bottom Legend */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "16px", marginTop: "8px", fontSize: "11px", color: "#64748b" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "2px", backgroundColor: "#22c55e" }} />
                <span>Vegetables & Fruits</span>
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "2px", backgroundColor: "#9a3412" }} />
                <span>Non-Veg & Seafood</span>
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "2px", backgroundColor: "#f59e0b" }} />
                <span>Dry Items & Groceries</span>
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "2px", backgroundColor: "#38bdf8" }} />
                <span>Others</span>
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                <span style={{ width: "12px", height: "2px", backgroundColor: "#3b1d11", display: "inline-block", position: "relative" }}>
                  <span style={{ width: "4px", height: "4px", borderRadius: "50%", backgroundColor: "#3b1d11", position: "absolute", top: "-1px", left: "4px" }} />
                </span>
                <span>Total</span>
              </span>
            </div>
          </div>

          {/* Category Donut - Connected to Live DB Category Breakdown */}
          <div className="premium-card">
            <h2 style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", margin: "0 0 14px 0" }}>Purchase by Category</h2>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              {/* Donut Chart */}
              <div style={{
                width: "148px",
                height: "148px",
                borderRadius: "50%",
                background: conicGradientString,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0
              }}>
                <div style={{ width: "94px", height: "94px", borderRadius: "50%", backgroundColor: "#ffffff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#0f172a" }}>
                    {formatCurrency(totalCategorySpend)}
                  </span>
                  <span style={{ fontSize: "8px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.03em" }}>TOTAL PURCHASE</span>
                </div>
              </div>

              {/* Dynamic Category Breakdown Table */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", width: "100%", fontSize: "11px" }}>
                {categoryBreakdown.map((cat, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "4px" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <span style={{ width: "7px", height: "7px", borderRadius: "50%", backgroundColor: cat.color, flexShrink: 0 }} />
                      <span style={{ color: "#334155" }}>{cat.name}</span>
                    </span>
                    <span style={{ display: "inline-flex", gap: "8px", flexShrink: 0 }}>
                      <span style={{ color: "#94a3b8", width: "26px", textAlign: "right" }}>{cat.percentage}%</span>
                      <span style={{ fontWeight: 600, color: "#1e293b", minWidth: "55px", textAlign: "right" }}>
                        {formatCurrency(cat.value)}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Shift-End Spot Purchase Audit Queue */}
        {selected?.organizationId && selected?.locationId && (
          <div id="shift-end-audit" style={{ marginBottom: "20px", scrollMarginTop: "80px" }}>
            <ShiftEndAuditQueue
              purchases={spotAuditList}
              organizationId={selected.organizationId}
              locationId={selected.locationId}
              currentUserId={session?.user?.id || ""}
              onAuditComplete={() => loadData()}
            />
          </div>
        )}

        {/* 3. Operational Tables Row (2-column Grid - Live DB Data) */}
        <div className="tables-grid">
          {/* Recent Purchase Orders */}
          <div className="premium-card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <h2 style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", margin: 0 }}>Recent Purchase Orders</h2>
              <Link href={`/purchasing/reports?type=all_orders&from=${currentRangeBounds.startDate}&to=${currentRangeBounds.endDate}${queryTenant}`} style={{ fontSize: "11px", fontWeight: 600, color: "#2563eb", textDecoration: "none" }}>
                View All
              </Link>
            </div>

            {/* Desktop Table */}
            <div className="desktop-only-feed" style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "auto" }}>
                <thead>
                  <tr>
                    <th className="table-header" style={{ whiteSpace: "nowrap" }}>PO No.</th>
                    <th className="table-header" style={{ whiteSpace: "nowrap" }}>Date</th>
                    <th className="table-header" style={{ whiteSpace: "nowrap" }}>Vendor</th>
                    <th className="table-header" style={{ whiteSpace: "nowrap" }}>Status</th>
                    <th className="table-header" style={{ textAlign: "right", whiteSpace: "nowrap" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", padding: "20px", color: "#64748b", fontSize: "13px" }}>
                        No purchase orders recorded yet.
                      </td>
                    </tr>
                  ) : (
                    purchases.map((po) => (
                      <tr key={po.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        {/* PO No. - Single line, click opens preview modal */}
                        <td className="table-cell" style={{ fontFamily: "monospace", fontWeight: 600, whiteSpace: "nowrap" }}>
                          {po.publicToken ? (
                            <button
                              type="button"
                              onClick={() => setPreviewToken(po.publicToken!)}
                              title="Click to preview PO document"
                              style={{
                                color: "#2563eb",
                                background: "none",
                                border: "none",
                                padding: 0,
                                cursor: "pointer",
                                fontSize: "inherit",
                                fontFamily: "inherit",
                                fontWeight: 600,
                                textDecoration: "underline",
                                textAlign: "left",
                                whiteSpace: "nowrap"
                              }}
                            >
                              {po.poNumber}
                            </button>
                          ) : (
                            <span style={{ color: "#475569", whiteSpace: "nowrap" }}>{po.poNumber}</span>
                          )}
                        </td>

                        {/* Date - Single line */}
                        <td className="table-cell" style={{ color: "#64748b", whiteSpace: "nowrap" }}>
                          {po.date}
                        </td>

                        {/* Vendor Name - Single line with ellipsis if long */}
                        <td className="table-cell" style={{ fontWeight: 600, color: "#1e293b", whiteSpace: "nowrap", maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis" }} title={po.vendorName}>
                          {po.vendorName}
                        </td>

                        {/* Status Capsule */}
                        <td className="table-cell" style={{ whiteSpace: "nowrap" }}>
                          {getStatusCapsule(po.status)}
                        </td>

                        {/* Actions */}
                        <td className="table-cell" style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "flex-end", gap: "6px" }}>
                            {/* Ongoing Routine Task: Direct Assessment Action Button */}
                            {po.isRoutineTask && po.actionUrl && (
                              <Link
                                href={po.actionUrl}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  backgroundColor: "#7c3a27",
                                  color: "#ffffff",
                                  textDecoration: "none",
                                  borderRadius: "4px",
                                  padding: "3px 9px",
                                  fontSize: "11px",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  boxShadow: "0 1px 2px rgba(124, 58, 39, 0.25)"
                                }}
                                title="Open scheduled stock assessment to create PO"
                              >
                                <Zap size={12} />
                                <span>Assess Stock</span>
                              </Link>
                            )}

                            {/* Review & Approve Button - For pending_approval POs */}
                            {!po.isRoutineTask && (po.rawStatus === "pending_approval" || po.rawStatus === "pending_review") && (
                              <button
                                type="button"
                                onClick={() => openApprovalModal(po.id, po.poNumber, po.publicToken)}
                                title="Review and Approve PO"
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  backgroundColor: "#059669",
                                  color: "#ffffff",
                                  border: "none",
                                  borderRadius: "4px",
                                  padding: "3px 9px",
                                  fontSize: "11px",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  boxShadow: "0 1px 2px rgba(5, 150, 105, 0.25)"
                                }}
                              >
                                <CheckCircle2 size={12} />
                                <span>Review</span>
                              </button>
                            )}

                            {/* WhatsApp Action Button - For approved or sent POs */}
                            {!po.isRoutineTask && po.rawStatus !== "pending_approval" && po.rawStatus !== "pending_review" && (
                              <button
                                type="button"
                                onClick={() => handleSendWhatsApp(po)}
                                title={po.isSentToVendor ? "Already sent to vendor (Click to re-send)" : (po.vendorPhone ? `Send WhatsApp to ${po.vendorPhone}` : "Share PO on WhatsApp")}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  backgroundColor: po.isSentToVendor ? "#94a3b8" : "#25D366",
                                  color: "#ffffff",
                                  border: "none",
                                  borderRadius: "4px",
                                  padding: "3px 8px",
                                  fontSize: "11px",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  opacity: po.isSentToVendor ? 0.85 : 1,
                                  boxShadow: po.isSentToVendor ? "none" : "0 1px 2px rgba(37, 211, 102, 0.25)"
                                }}
                              >
                                <MessageCircle size={12} />
                                <span>{po.isSentToVendor ? "Sent" : "WhatsApp"}</span>
                              </button>
                            )}

                            {/* Quick Receive Goods Action - Only when approved/sent/in transit and NOT already received */}
                            {!po.isRoutineTask && !po.receivedByUserId && !po.cashierBillAmount && po.rawStatus !== "received" && po.rawStatus !== "completed" && po.rawStatus !== "audited" && (po.rawStatus === "approved" || po.rawStatus === "sent_to_vendor" || po.rawStatus === "pending_receipt" || po.rawStatus === "in_transit" || po.rawStatus === "ordered") && (
                              <button
                                type="button"
                                onClick={() => openReceiveModal(po)}
                                title="Quick Receive Goods against this PO"
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "3px",
                                  backgroundColor: "#2563eb",
                                  color: "#ffffff",
                                  border: "none",
                                  borderRadius: "4px",
                                  padding: "3px 8px",
                                  fontSize: "11px",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  boxShadow: "0 1px 2px rgba(37, 99, 235, 0.25)"
                                }}
                              >
                                <PackageCheck size={12} />
                                <span>Receive</span>
                              </button>
                            )}

                            {/* Eye Icon Button linked to Activity Timeline Modal (PO or Task) */}
                            {po.isRoutineTask ? (
                              <button
                                type="button"
                                onClick={() => setTimelineTaskId(po.id)}
                                title="View Task Lifecycle & Audit Timeline"
                                style={{
                                  color: "#475569",
                                  padding: "4px",
                                  background: "#f1f5f9",
                                  border: "1px solid #cbd5e1",
                                  borderRadius: "4px",
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center"
                                }}
                              >
                                <Eye size={14} />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setTimelinePoId(po.id)}
                                title="View Activity & Audit Timeline"
                                style={{
                                  color: "#475569",
                                  padding: "4px",
                                  background: "#f1f5f9",
                                  border: "1px solid #cbd5e1",
                                  borderRadius: "4px",
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center"
                                }}
                              >
                                <Eye size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Fallback Cards */}
            <div className="mobile-only-feed">
              {purchases.map((po) => (
                <div key={po.id} style={{ border: "1px solid #e2e8f0", borderRadius: "10px", padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    {po.publicToken ? (
                      <button
                        type="button"
                        onClick={() => setPreviewToken(po.publicToken!)}
                        style={{
                          background: "none",
                          border: "none",
                          padding: 0,
                          cursor: "pointer",
                          fontFamily: "monospace",
                          fontSize: "12px",
                          fontWeight: 700,
                          color: "#2563eb",
                          textDecoration: "underline"
                        }}
                      >
                        {po.poNumber}
                      </button>
                    ) : (
                      <span style={{ fontFamily: "monospace", fontSize: "12px", fontWeight: 700, color: "#1e293b" }}>{po.poNumber}</span>
                    )}
                    <span style={{ fontSize: "11px", color: "#64748b" }}>{po.date}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "#334155" }}>{po.vendorName}</span>
                    <div>{getStatusCapsule(po.status)}</div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "6px", paddingTop: "4px", borderTop: "1px dashed #f1f5f9" }}>
                    {/* Routine Task Assess Button */}
                    {po.isRoutineTask && po.actionUrl && (
                      <Link
                        href={po.actionUrl}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "3px",
                          backgroundColor: "#7c3a27",
                          color: "#ffffff",
                          textDecoration: "none",
                          borderRadius: "4px",
                          padding: "3px 8px",
                          fontSize: "11px",
                          fontWeight: 600,
                          cursor: "pointer"
                        }}
                      >
                        <Zap size={11} />
                        <span>Assess Stock</span>
                      </Link>
                    )}

                    {/* Review & Approve Button - For pending_approval POs */}
                    {!po.isRoutineTask && (po.rawStatus === "pending_approval" || po.rawStatus === "pending_review") && (
                      <button
                        type="button"
                        onClick={() => openApprovalModal(po.id, po.poNumber, po.publicToken)}
                        title="Review and Approve PO"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "3px",
                          backgroundColor: "#059669",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: "4px",
                          padding: "3px 8px",
                          fontSize: "11px",
                          fontWeight: 600,
                          cursor: "pointer"
                        }}
                      >
                        <CheckCircle2 size={11} />
                        <span>Review</span>
                      </button>
                    )}

                    {/* WhatsApp Button */}
                    {!po.isRoutineTask && po.rawStatus !== "pending_approval" && po.rawStatus !== "pending_review" && (
                      <button
                        type="button"
                        onClick={() => handleSendWhatsApp(po)}
                        title={po.isSentToVendor ? "Already sent to vendor (Click to re-send)" : (po.vendorPhone ? `Send WhatsApp to ${po.vendorPhone}` : "Share PO on WhatsApp")}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "3px",
                          backgroundColor: po.isSentToVendor ? "#94a3b8" : "#25D366",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: "4px",
                          padding: "3px 7px",
                          fontSize: "11px",
                          fontWeight: 600,
                          cursor: "pointer",
                          opacity: po.isSentToVendor ? 0.85 : 1
                        }}
                      >
                        <MessageCircle size={11} />
                        <span>{po.isSentToVendor ? "Sent" : "WhatsApp"}</span>
                      </button>
                    )}

                    {/* Quick Receive Button - Only enabled when NOT already received */}
                    {!po.isRoutineTask && !po.receivedByUserId && !po.cashierBillAmount && po.rawStatus !== "received" && po.rawStatus !== "completed" && po.rawStatus !== "audited" && (po.rawStatus === "approved" || po.rawStatus === "sent_to_vendor" || po.rawStatus === "pending_receipt" || po.rawStatus === "in_transit" || po.rawStatus === "ordered") && (
                      <button
                        type="button"
                        onClick={() => openReceiveModal(po)}
                        title="Quick Receive into inventory"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "3px",
                          backgroundColor: "#2563eb",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: "4px",
                          padding: "3px 7px",
                          fontSize: "11px",
                          fontWeight: 600,
                          cursor: "pointer"
                        }}
                      >
                        <PackageCheck size={11} />
                        <span>Receive</span>
                      </button>
                    )}

                    {/* Cancel Button for Active POs */}
                    {!po.isRoutineTask && po.rawStatus !== "completed" && po.rawStatus !== "cancelled" && po.rawStatus !== "rejected" && (
                      <button
                        type="button"
                        onClick={async () => {
                          const confirmCancel = window.confirm(`Are you sure you want to cancel Purchase Order #${po.poNumber}?`);
                          if (!confirmCancel) return;
                          try {
                            const res = await fetch(`/api/purchase-orders/${po.id}/cancel`, {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ reason: "Cancelled by user from Purchasing Dashboard" })
                            });
                            if (res.ok) {
                              await loadData();
                            } else {
                              const d = await res.json().catch(() => ({}));
                              alert(d.error || "Failed to cancel PO");
                            }
                          } catch (e) {
                            console.error(e);
                            alert("Error cancelling PO");
                          }
                        }}
                        title="Cancel Purchase Order"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "3px",
                          backgroundColor: "#fef2f2",
                          color: "#dc2626",
                          border: "1px solid #fecaca",
                          borderRadius: "4px",
                          padding: "3px 7px",
                          fontSize: "11px",
                          fontWeight: 600,
                          cursor: "pointer"
                        }}
                      >
                        <X size={11} />
                        <span>Cancel</span>
                      </button>
                    )}

                    {/* Eye Icon Button linked to Activity Timeline */}
                    {po.isRoutineTask ? (
                      <button
                        type="button"
                        onClick={() => setTimelineTaskId(po.id)}
                        title="View Task Lifecycle & Audit Timeline"
                        style={{
                          color: "#475569",
                          padding: "4px",
                          background: "#f1f5f9",
                          border: "1px solid #cbd5e1",
                          borderRadius: "4px",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center"
                        }}
                      >
                        <Eye size={13} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setTimelinePoId(po.id)}
                        title="View PO Audit Timeline"
                        style={{
                          color: "#475569",
                          padding: "4px",
                          background: "#f1f5f9",
                          border: "1px solid #cbd5e1",
                          borderRadius: "4px",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center"
                        }}
                      >
                        <Eye size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pending Deliveries & Follow-ups - Connected to Live Actionable POs */}
          <div className="premium-card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <h2 style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", margin: 0 }}>Pending Deliveries & Follow-ups</h2>
              <Link href={`/purchasing/reports?type=pending_receipts${queryTenant}`} style={{ fontSize: "11px", fontWeight: 600, color: "#2563eb", textDecoration: "none" }}>
                View All
              </Link>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "auto" }}>
                <thead>
                  <tr>
                    <th className="table-header" style={{ whiteSpace: "nowrap" }}>PO No.</th>
                    <th className="table-header" style={{ whiteSpace: "nowrap" }}>Vendor</th>
                    <th className="table-header" style={{ whiteSpace: "nowrap" }}>Expected Date</th>
                    <th className="table-header" style={{ textAlign: "center", whiteSpace: "nowrap" }}>Days</th>
                    <th className="table-header" style={{ whiteSpace: "nowrap" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingDeliveries.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", padding: "20px", color: "#64748b", fontSize: "13px" }}>
                        No shipments pending delivery.
                      </td>
                    </tr>
                  ) : (
                    pendingDeliveries.map((del) => (
                      <tr key={del.id}>
                        <td className="table-cell" style={{ whiteSpace: "nowrap" }}>
                          <button
                            type="button"
                            onClick={() => setTimelinePoId(del.id)}
                            style={{
                              background: "none",
                              border: "none",
                              padding: 0,
                              cursor: "pointer",
                              color: "#2563eb",
                              fontFamily: "inherit",
                              fontWeight: 600,
                              textDecoration: "underline",
                              textAlign: "left"
                            }}
                            title="Click to view timeline"
                          >
                            {del.poNumber}
                          </button>
                        </td>
                        <td className="table-cell" style={{ fontWeight: 600, color: "#1e293b", whiteSpace: "nowrap", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis" }} title={del.vendorName}>
                          {del.vendorName}
                        </td>
                        <td className="table-cell" style={{ color: "#64748b", whiteSpace: "nowrap" }}>{del.expectedDate}</td>
                        <td className="table-cell" style={{ textAlign: "center", fontWeight: 700, color: del.days > 0 ? "#dc2626" : "#64748b", whiteSpace: "nowrap" }}>
                          {del.days}
                        </td>
                        <td className="table-cell" style={{ whiteSpace: "nowrap" }}>{getStatusCapsule(del.status)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 4. Performance Section (3-column Grid - Live DB Data) */}
        <div className="performance-grid">
          {/* Top 5 Vendors - Real DB Aggregation */}
          <div className="premium-card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
              <h2 style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", margin: 0 }}>Top 5 Vendors (Last 3 Months)</h2>
              <Link href={`/purchasing/vendors${queryTenant ? `?${queryTenant.slice(1)}` : ""}`} style={{ fontSize: "11px", fontWeight: 600, color: "#2563eb", textDecoration: "none" }}>
                View All
              </Link>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {topVendors.length === 0 ? (
                <div style={{ textAlign: "center", padding: "16px", color: "#64748b", fontSize: "12px" }}>
                  No vendor purchases recorded yet.
                </div>
              ) : (
                topVendors.map((v) => (
                  <div key={v.rank} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", fontSize: "12px" }}>
                    <span style={{
                      width: "20px",
                      height: "20px",
                      borderRadius: "50%",
                      backgroundColor: "#9a3412",
                      color: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: "11px",
                      flexShrink: 0
                    }}>
                      {v.rank}
                    </span>
                    <span style={{ fontWeight: 500, color: "#1e293b", flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {v.name}
                    </span>
                    <div style={{ width: "100px", height: "9px", backgroundColor: "#f1f5f9", borderRadius: "3px", overflow: "hidden", flexShrink: 0 }}>
                      <div style={{ width: `${v.pct}%`, height: "100%", backgroundColor: "#c2410c", borderRadius: "3px" }} />
                    </div>
                    <span style={{ fontWeight: 600, color: "#0f172a", fontFamily: "monospace", minWidth: "68px", textAlign: "right" }}>
                      {formatCurrency(v.totalSpent)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Top 5 Purchased Items - Real DB PO Lines Aggregation */}
          <div className="premium-card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
              <h2 style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", margin: 0 }}>Top 5 Purchased Items (By Value)</h2>
              <Link href={`/purchasing/items${queryTenant ? `?${queryTenant.slice(1)}` : ""}`} style={{ fontSize: "11px", fontWeight: 600, color: "#2563eb", textDecoration: "none" }}>
                View All
              </Link>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {topItems.length === 0 ? (
                <div style={{ textAlign: "center", padding: "16px", color: "#64748b", fontSize: "12px" }}>
                  No item purchase history found.
                </div>
              ) : (
                topItems.map((item) => (
                  <div key={item.rank} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", fontSize: "12px" }}>
                    <span style={{
                      width: "20px",
                      height: "20px",
                      borderRadius: "50%",
                      backgroundColor: "#9a3412",
                      color: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: "11px",
                      flexShrink: 0
                    }}>
                      {item.rank}
                    </span>
                    <span style={{ fontWeight: 500, color: "#1e293b", flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {item.name}
                    </span>
                    <div style={{ width: "100px", height: "9px", backgroundColor: "#f1f5f9", borderRadius: "3px", overflow: "hidden", flexShrink: 0 }}>
                      <div style={{ width: `${item.pct}%`, height: "100%", backgroundColor: "#c2410c", borderRadius: "3px" }} />
                    </div>
                    <span style={{ fontWeight: 600, color: "#0f172a", fontFamily: "monospace", minWidth: "68px", textAlign: "right" }}>
                      {formatCurrency(item.totalValue)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Low Stock Alerts - Real DB Items & Inventory Ledger Balance */}
          <div className="premium-card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
              <h2 style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", margin: 0, display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <span>Low Stock Alerts</span>
                <span style={{ color: "#dc2626", fontSize: "12px", fontWeight: 500 }}>
                  (Purchase Needed)
                </span>
              </h2>
              <Link href={`/inventory${queryTenant ? `?${queryTenant.slice(1)}` : ""}`} style={{ fontSize: "11px", fontWeight: 600, color: "#2563eb", textDecoration: "none" }}>
                View All
              </Link>
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th className="table-header">Item</th>
                  <th className="table-header">Current Stock</th>
                  <th className="table-header">Min Stock</th>
                  <th className="table-header" style={{ textAlign: "center" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {lowStockItems.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", padding: "16px", color: "#64748b", fontSize: "12px" }}>
                      All items are above minimum stock levels.
                    </td>
                  </tr>
                ) : (
                  lowStockItems.map((stock) => (
                    <tr key={stock.id}>
                      <td className="table-cell" style={{ fontWeight: 500 }}>{stock.name}</td>
                      <td className="table-cell" style={{ color: "#dc2626", fontWeight: 600 }}>{stock.currentStock}</td>
                      <td className="table-cell" style={{ color: "#64748b" }}>{stock.minStock}</td>
                      <td className="table-cell" style={{ textAlign: "center" }}>
                        {(session?.isOwner || selected?.permissions?.includes("purchasing.create_po:create")) ? (
                          <Link
                            href={`/purchasing/purchase-orders/create${queryTenant ? `?${queryTenant.slice(1)}` : ""}`}
                            style={{
                              backgroundColor: "#dc2626",
                              color: "#ffffff",
                              border: "none",
                              borderRadius: "6px",
                              padding: "4px 12px",
                              fontSize: "11px",
                              fontWeight: 600,
                              textDecoration: "none",
                              display: "inline-block",
                              boxShadow: "0 1px 2px rgba(220, 38, 38, 0.25)"
                            }}
                          >
                            Purchase
                          </Link>
                        ) : (
                          <span style={{ fontSize: "11px", color: "#94a3b8" }}>-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Review & Approve PO Modal */}
      {reviewingPo && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(15, 23, 42, 0.65)",
          backdropFilter: "blur(3px)",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px"
        }}>
          <div style={{
            backgroundColor: "#ffffff",
            width: "100%",
            maxWidth: "680px",
            maxHeight: "88vh",
            borderRadius: "12px",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
          }}>
            {/* Modal Header */}
            <div style={{
              padding: "16px 20px",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor: "#f8fafc"
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>
                  Review & Approve Purchase Order
                </h2>
                <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                  {reviewingPo.poNumber || `PO #${reviewingPo.id.slice(0, 8)}`} {reviewingPo.vendorName ? `• ${reviewingPo.vendorName}` : ""}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReviewingPo(null)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "6px",
                  borderRadius: "6px",
                  color: "#64748b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body: Items table */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
              {loadingLines ? (
                <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                  <RefreshCw size={24} style={{ animation: "spin 1s linear infinite", margin: "0 auto 10px auto", display: "block" }} />
                  <div style={{ fontSize: "13px", fontWeight: 600 }}>Loading PO line items...</div>
                </div>
              ) : reviewLines.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                  <AlertCircle size={28} style={{ margin: "0 auto 8px auto", color: "#f59e0b" }} />
                  <div style={{ fontSize: "14px", fontWeight: 600 }}>No items found in this purchase order.</div>
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: "12px", fontSize: "12px", color: "#64748b" }}>
                    Verify the ordered items and quantities before granting approval:
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid #e2e8f0", textAlign: "left", backgroundColor: "#f8fafc" }}>
                        <th style={{ padding: "8px 10px", fontWeight: 600, color: "#475569" }}>Item Name</th>
                        <th style={{ padding: "8px 10px", fontWeight: 600, color: "#475569", width: "120px" }}>Quantity</th>
                        <th style={{ padding: "8px 10px", fontWeight: 600, color: "#475569", textAlign: "right", width: "100px" }}>Unit Rate</th>
                        <th style={{ padding: "8px 10px", fontWeight: 600, color: "#475569", textAlign: "right", width: "100px" }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reviewLines.map((line, idx) => {
                        const lineTotal = (Number(line.editQuantity) || 0) * (Number(line.unitRate) || 0);
                        return (
                          <tr key={line.id || idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "10px", fontWeight: 500, color: "#0f172a" }}>
                              {line.itemName || "Item"}
                            </td>
                            <td style={{ padding: "10px", whiteSpace: "nowrap" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={line.editQuantity}
                                  onChange={(e) => {
                                    const next = [...reviewLines];
                                    next[idx].editQuantity = e.target.value;
                                    setReviewLines(next);
                                  }}
                                  style={{
                                    width: "70px",
                                    padding: "4px 8px",
                                    border: "1px solid #cbd5e1",
                                    borderRadius: "4px",
                                    fontSize: "13px",
                                    fontWeight: 600,
                                    textAlign: "right"
                                  }}
                                />
                                <span style={{ fontSize: "11px", color: "#64748b" }}>{line.unitOfMeasure || ""}</span>
                              </div>
                            </td>
                            <td style={{ padding: "10px", textAlign: "right", color: "#64748b" }}>
                              ₹{Number(line.unitRate || 0).toLocaleString("en-IN")}
                            </td>
                            <td style={{ padding: "10px", textAlign: "right", fontWeight: 600, color: "#0f172a" }}>
                              ₹{lineTotal.toLocaleString("en-IN")}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ borderTop: "2px solid #e2e8f0" }}>
                        <td colSpan={3} style={{ padding: "12px 10px", fontWeight: 700, textAlign: "right", color: "#0f172a" }}>
                          Total Amount:
                        </td>
                        <td style={{ padding: "12px 10px", fontWeight: 700, textAlign: "right", color: "#0f172a", fontSize: "14px" }}>
                          ₹{reviewLines.reduce((acc, l) => acc + ((Number(l.editQuantity) || 0) * (Number(l.unitRate) || 0)), 0).toLocaleString("en-IN")}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: "14px 20px",
              borderTop: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor: "#f8fafc"
            }}>
              <button
                type="button"
                onClick={() => setReviewingPo(null)}
                style={{
                  padding: "7px 14px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  backgroundColor: "#ffffff",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#475569",
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => handleApproveAction("reject")}
                  disabled={submittingApproval || loadingLines}
                  style={{
                    padding: "7px 16px",
                    border: "1px solid #fecaca",
                    borderRadius: "6px",
                    backgroundColor: "#fef2f2",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#dc2626",
                    cursor: submittingApproval || loadingLines ? "not-allowed" : "pointer"
                  }}
                >
                  {submittingApproval ? "Processing..." : "Reject PO"}
                </button>
                <button
                  type="button"
                  onClick={() => handleApproveAction("accept")}
                  disabled={submittingApproval || loadingLines || reviewLines.length === 0}
                  style={{
                    padding: "7px 20px",
                    border: "none",
                    borderRadius: "6px",
                    backgroundColor: "#16a34a",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#ffffff",
                    cursor: submittingApproval || loadingLines || reviewLines.length === 0 ? "not-allowed" : "pointer",
                    boxShadow: "0 1px 3px rgba(22, 163, 74, 0.3)"
                  }}
                >
                  {submittingApproval ? "Approving..." : "Approve PO"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* PO Preview Modal */}
      {previewToken && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(15, 23, 42, 0.65)",
          backdropFilter: "blur(3px)",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px"
        }}>
          <div style={{
            backgroundColor: "#ffffff",
            width: "92%",
            maxWidth: "920px",
            height: "90vh",
            borderRadius: "12px",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
          }}>
            <div style={{
              padding: "14px 20px",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor: "#f8fafc"
            }}>
              <h2 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>Purchase Order Preview</h2>
              <button
                type="button"
                onClick={() => setPreviewToken(null)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "#64748b" }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ flex: 1, backgroundColor: "#f1f5f9" }}>
              <iframe
                src={`/public/po/${previewToken}`}
                style={{ width: "100%", height: "100%", border: "none" }}
                title="PO Preview"
              />
            </div>
          </div>
        </div>
      )}

      {/* PO Timeline Modal */}
      {timelinePoId && (
        <POTimelineModal poId={timelinePoId} onClose={() => setTimelinePoId(null)} />
      )}

      {/* Task Timeline Modal */}
      {timelineTaskId && (
        <TaskTimelineModal taskId={timelineTaskId} onClose={() => setTimelineTaskId(null)} />
      )}

      {/* Quick Receive PO Modal */}
      {receivingPo && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(15, 23, 42, 0.65)",
          backdropFilter: "blur(3px)",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px"
        }}>
          <div style={{
            backgroundColor: "#ffffff",
            width: "100%",
            maxWidth: "760px",
            maxHeight: "90vh",
            borderRadius: "12px",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
          }}>
            {/* Modal Header */}
            <div style={{
              padding: "16px 20px",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor: "#f8fafc"
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>
                  Quick Receive: {receivingPo.poNumber}
                </h2>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "3px" }}>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>Vendor: {receivingPo.vendorName}</span>
                  {receiveLines.length > 0 && (
                    <span style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: "12px",
                      backgroundColor: receiveLines.every(l => l.acknowledged) ? "#dcfce7" : "#fef3c7",
                      color: receiveLines.every(l => l.acknowledged) ? "#15803d" : "#b45309"
                    }}>
                      {receiveLines.filter(l => l.acknowledged).length} / {receiveLines.length} Verified
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {receiveLines.length > 1 && (
                  <button
                    type="button"
                    onClick={handleReceiveSetAllOk}
                    style={{
                      padding: "5px 10px",
                      backgroundColor: "#16a34a",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontWeight: 700,
                      cursor: "pointer",
                      boxShadow: "0 1px 2px rgba(22, 163, 74, 0.25)"
                    }}
                  >
                    ✓ Mark All as OK
                  </button>
                )}
                <button
                  type="button"
                  onClick={closeReceiveModal}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "#64748b" }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
              {loadingReceiveLines ? (
                <div style={{ textAlign: "center", padding: "28px", color: "#64748b", fontSize: "13px" }}>
                  Loading PO line items...
                </div>
              ) : receiveLines.length === 0 ? (
                <div style={{ textAlign: "center", padding: "28px", color: "#64748b", fontSize: "13px" }}>
                  No item lines found for this purchase order.
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #e2e8f0", textAlign: "left", backgroundColor: "#f8fafc" }}>
                      <th style={{ padding: "10px 8px", color: "#475569", fontWeight: 600 }}>Item Name</th>
                      <th style={{ padding: "10px 8px", color: "#475569", fontWeight: 600, textAlign: "center", width: "85px" }}>Ordered</th>
                      <th style={{ padding: "10px 8px", color: "#475569", fontWeight: 600, textAlign: "center", width: "120px" }}>Received Qty</th>
                      <th style={{ padding: "10px 8px", color: "#475569", fontWeight: 600, textAlign: "center", width: "115px" }}>Status</th>
                      <th style={{ padding: "10px 8px", color: "#475569", fontWeight: 600, textAlign: "center", width: "165px" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receiveLines.map((line: any, idx: number) => {
                      const isAck = line.acknowledged;
                      const action = line.actionTaken;

                      return (
                        <tr 
                          key={idx} 
                          style={{ 
                            borderBottom: "1px solid #f1f5f9",
                            backgroundColor: !isAck ? "#ffffff" : action === "OK" ? "#f0fdf4" : action === "ZERO" ? "#fef2f2" : "#fffbeb",
                            transition: "background-color 0.15s ease"
                          }}
                        >
                          <td style={{ padding: "10px 8px", color: "#1e293b", fontWeight: 600 }}>
                            {line.itemName}
                          </td>
                          <td style={{ padding: "10px 8px", textAlign: "center", fontWeight: 600, color: "#334155" }}>
                            {line.orderedQuantity} {line.unitOfMeasure || ""}
                          </td>
                          <td style={{ padding: "10px 8px", textAlign: "center" }}>
                            <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={line.receivedQuantity !== undefined && line.receivedQuantity !== null ? line.receivedQuantity : ""}
                                onChange={(e) => handleReceiveQtyChange(idx, e.target.value)}
                                style={{
                                  width: "75px",
                                  padding: "5px 6px",
                                  border: line.isZero ? "1px solid #f87171" : isAck ? "1px solid #86efac" : "1px solid #cbd5e1",
                                  borderRadius: "5px",
                                  fontSize: "12px",
                                  fontWeight: 700,
                                  textAlign: "center",
                                  backgroundColor: line.isZero ? "#fee2e2" : "#ffffff",
                                  color: line.isZero ? "#b91c1c" : "#0f172a"
                                }}
                              />
                              <span style={{ fontSize: "11px", color: "#64748b" }}>{line.unitOfMeasure || ""}</span>
                            </div>
                          </td>
                          <td style={{ padding: "10px 8px", textAlign: "center" }}>
                            {!isAck ? (
                              <span style={{
                                padding: "3px 8px",
                                borderRadius: "4px",
                                backgroundColor: "#f1f5f9",
                                color: "#64748b",
                                fontSize: "10px",
                                fontWeight: 600
                              }}>
                                Pending
                              </span>
                            ) : action === "OK" ? (
                              <span style={{
                                padding: "3px 8px",
                                borderRadius: "4px",
                                backgroundColor: "#dcfce7",
                                color: "#16a34a",
                                fontSize: "10px",
                                fontWeight: 700
                              }}>
                                ✓ OK ({line.receivedQuantity})
                              </span>
                            ) : action === "ZERO" ? (
                              <span style={{
                                padding: "3px 8px",
                                borderRadius: "4px",
                                backgroundColor: "#fee2e2",
                                color: "#dc2626",
                                fontSize: "10px",
                                fontWeight: 700
                              }}>
                                ✕ Not Recv (0)
                              </span>
                            ) : (
                              <span style={{
                                padding: "3px 8px",
                                borderRadius: "4px",
                                backgroundColor: "#fef3c7",
                                color: "#b45309",
                                fontSize: "10px",
                                fontWeight: 700
                              }}>
                                ✎ Edited ({line.receivedQuantity})
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "10px 8px", textAlign: "center" }}>
                            <div style={{ display: "inline-flex", gap: "5px" }}>
                              <button
                                type="button"
                                onClick={() => handleReceiveSetOk(idx)}
                                style={{
                                  padding: "5px 10px",
                                  backgroundColor: action === "OK" ? "#16a34a" : "#dcfce7",
                                  color: action === "OK" ? "#ffffff" : "#16a34a",
                                  border: action === "OK" ? "1px solid #15803d" : "1px solid #bbf7d0",
                                  borderRadius: "5px",
                                  cursor: "pointer",
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  transition: "all 0.15s ease"
                                }}
                              >
                                All OK
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReceiveSetZero(idx)}
                                style={{
                                  padding: "5px 8px",
                                  backgroundColor: action === "ZERO" ? "#dc2626" : "#fee2e2",
                                  color: action === "ZERO" ? "#ffffff" : "#dc2626",
                                  border: action === "ZERO" ? "1px solid #b91c1c" : "1px solid #fecaca",
                                  borderRadius: "5px",
                                  cursor: "pointer",
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  transition: "all 0.15s ease"
                                }}
                              >
                                Not Received
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px dashed #e2e8f0" }}>
                <label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "12px", color: "#334155" }}>
                  Proof of Delivery / Delivery Challan (Optional)
                </label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setProcessOwnerProof(e.target.files?.[0] || null)}
                  style={{
                    fontSize: "12px",
                    width: "100%",
                    padding: "8px",
                    border: "1px dashed #cbd5e1",
                    borderRadius: "6px",
                    backgroundColor: "#f8fafc"
                  }}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: "14px 20px",
              borderTop: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "10px",
              backgroundColor: "#f8fafc"
            }}>
              <div>
                {receiveLines.length > 0 && !receiveLines.every(l => l.acknowledged) && (
                  <span style={{ fontSize: "11px", color: "#e11d48", fontWeight: 600 }}>
                    * Verify all items before submitting
                  </span>
                )}
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  onClick={async () => {
                    if (!receivingPo) return;
                    const confirmCancel = window.confirm(`Are you sure you want to cancel Purchase Order #${receivingPo.poNumber || receivingPo.id.slice(0, 8)}?`);
                    if (!confirmCancel) return;
                    setSubmittingReceive(true);
                    try {
                      const res = await fetch(`/api/purchase-orders/${receivingPo.id}/cancel`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ reason: "Cancelled at Goods Receipt stage (Not Received)" })
                      });
                      if (res.ok) {
                        closeReceiveModal();
                        await loadData();
                      } else {
                        const d = await res.json().catch(() => ({}));
                        alert(d.error || "Failed to cancel PO");
                      }
                    } catch (e) {
                      console.error(e);
                      alert("Error cancelling PO");
                    } finally {
                      setSubmittingReceive(false);
                    }
                  }}
                  disabled={submittingReceive}
                  style={{
                    padding: "7px 14px",
                    border: "1px solid #fecaca",
                    borderRadius: "6px",
                    backgroundColor: "#fef2f2",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#dc2626",
                    cursor: submittingReceive ? "not-allowed" : "pointer"
                  }}
                >
                  Cancel Order
                </button>
                <button
                  type="button"
                  onClick={closeReceiveModal}
                  style={{
                    padding: "7px 14px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    backgroundColor: "#ffffff",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#475569",
                    cursor: "pointer"
                  }}
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleSubmitQuickReceive}
                  disabled={submittingReceive || loadingReceiveLines || receiveLines.length === 0 || !receiveLines.every(l => l.acknowledged)}
                  style={{
                    padding: "7px 18px",
                    border: "none",
                    borderRadius: "6px",
                    backgroundColor: submittingReceive || loadingReceiveLines || receiveLines.length === 0 || !receiveLines.every(l => l.acknowledged) ? "#94a3b8" : (receiveLines.length > 0 && receiveLines.every(l => Number(l.receivedQuantity || 0) === 0) ? "#dc2626" : "#2563eb"),
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: submittingReceive || loadingReceiveLines || receiveLines.length === 0 || !receiveLines.every(l => l.acknowledged) ? "not-allowed" : "pointer",
                    boxShadow: receiveLines.every(l => l.acknowledged) ? "0 1px 3px rgba(37, 99, 235, 0.3)" : "none"
                  }}
                >
                  {submittingReceive 
                    ? "Submitting..." 
                    : (receiveLines.length > 0 && receiveLines.every(l => Number(l.receivedQuantity || 0) === 0) 
                        ? "Mark All Not Received (Cancel)" 
                        : "Submit to Cashier")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Purchase Modal */}
      {isQuickPurchaseOpen && selected?.organizationId && selected?.locationId && (
        <QuickPurchaseModal
          isOpen={isQuickPurchaseOpen}
          onClose={() => setIsQuickPurchaseOpen(false)}
          organizationId={selected.organizationId}
          locationId={selected.locationId}
          currentUserId={session?.user?.id || ""}
          onSuccess={() => loadData()}
        />
      )}
    </>
  );
}
