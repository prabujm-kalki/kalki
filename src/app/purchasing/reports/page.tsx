import { db } from "@/db";
import { purchaseOrders, vendors, supplierInvoices, spotPurchases, items, taskInstances, purchaseSchedules, businessRoles, locations } from "@/db/schema";
import { eq, and, gte, lte, desc, sql, inArray, isNotNull } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { 
  FileText, 
  Download, 
  Filter, 
  ArrowLeft, 
  ShoppingCart, 
  Truck, 
  Clock, 
  Wallet,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  PackageCheck,
  ClipboardCheck,
  Zap
} from "lucide-react";
import { getSessionContext } from "@/domains/session/service";

export default async function PurchaseReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");

  const context = await getSessionContext(session.user);
  const primaryScope = context.scopes[0];

  const resolvedParams = await searchParams;
  const filterType = typeof resolvedParams.type === "string" ? resolvedParams.type : "all";
  const statusFilter = typeof resolvedParams.status === "string" ? resolvedParams.status : "";
  const vendorFilter = typeof resolvedParams.vendor === "string" ? resolvedParams.vendor : "";
  const dateFrom = typeof resolvedParams.from === "string" ? resolvedParams.from : "";
  const dateTo = typeof resolvedParams.to === "string" ? resolvedParams.to : "";
  
  const organizationId = typeof resolvedParams.organizationId === "string" && resolvedParams.organizationId
    ? resolvedParams.organizationId 
    : (primaryScope?.organizationId || "");
  const locationId = typeof resolvedParams.locationId === "string" && resolvedParams.locationId
    ? resolvedParams.locationId 
    : (primaryScope?.locationId || "");
  
  const baseQueryStr = (organizationId && locationId) 
    ? `?organizationId=${organizationId}&locationId=${locationId}` 
    : "";

  const tenantParams = (organizationId && locationId)
    ? `&organizationId=${organizationId}&locationId=${locationId}`
    : organizationId
      ? `&organizationId=${organizationId}`
      : "";

  // Fetch all vendors for the dropdown
  const allVendors = organizationId
    ? await db.select({ id: vendors.id, name: vendors.name }).from(vendors).where(eq(vendors.organizationId, organizationId)).orderBy(vendors.name)
    : await db.select({ id: vendors.id, name: vendors.name }).from(vendors).orderBy(vendors.name);

  const formatCurrency = (val: string | number | null) => {
    if (!val) return "₹0";
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(val));
  };

  const getStatusCapsule = (status: string) => {
    const s = status.toUpperCase();
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
    if (s === "RECEIVED" || s === "COMPLETED" || s === "PAID") {
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
          {status.replace(/_/g, " ").toUpperCase()}
        </span>
      );
    }
    if (s === "DELAYED" || s === "OVERDUE" || s === "REJECTED") {
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
          {status.replace(/_/g, " ").toUpperCase()}
        </span>
      );
    }
    if (s === "IN TRANSIT" || s === "IN_TRANSIT" || s === "PENDING_RECEIPT" || s === "ORDERED" || s === "AWAITING") {
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
          {status.replace(/_/g, " ").toUpperCase()}
        </span>
      );
    }
    if (s === "APPROVED" || s === "SENT") {
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
          {status.replace(/_/g, " ").toUpperCase()}
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
        {status.replace(/_/g, " ").toUpperCase()}
      </span>
    );
  };

  // Determine view mode
  const isBillsView = filterType === "pending_bills";
  const isSpotView = filterType === "spot_purchases";
  const isRoutinesView = filterType === "routine_automations";

  // Data fetching based on view mode
  let pendingBillsData: any[] = [];
  let reportData: any[] = [];
  let spotPurchasesData: any[] = [];
  let routineTasksData: any[] = [];
  let totalSpend = 0;
  let totalBillsAmount = 0;
  let totalSpotAmount = 0;
  let totalRoutineRuns = 0;

  if (isRoutinesView) {
    const routineConditions: any[] = [
      isNotNull(sql`${taskInstances.contextData}->>'scheduleId'`)
    ];
    if (organizationId) {
      routineConditions.push(eq(taskInstances.organizationId, organizationId));
    }
    if (locationId && locationId !== "ALL") {
      routineConditions.push(sql`${taskInstances.contextData}->>'locationId' = ${locationId}`);
    }
    if (statusFilter) {
      routineConditions.push(eq(taskInstances.status, statusFilter as any));
    }
    if (vendorFilter) {
      routineConditions.push(sql`${taskInstances.contextData}->>'vendorId' = ${vendorFilter}`);
    }
    if (dateFrom) {
      routineConditions.push(gte(taskInstances.createdAt, new Date(dateFrom)));
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      routineConditions.push(lte(taskInstances.createdAt, toDate));
    }

    routineTasksData = await db
      .select({
        id: taskInstances.id,
        status: taskInstances.status,
        priority: taskInstances.priority,
        dueAt: taskInstances.dueAt,
        completedAt: taskInstances.completedAt,
        createdAt: taskInstances.createdAt,
        contextData: taskInstances.contextData,
        roleName: businessRoles.name,
      })
      .from(taskInstances)
      .leftJoin(businessRoles, eq(taskInstances.assignedRoleId, businessRoles.id))
      .where(and(...routineConditions))
      .orderBy(desc(taskInstances.createdAt));

    totalRoutineRuns = routineTasksData.length;
  } else if (isBillsView) {
    const billConditions: any[] = [];
    if (organizationId) {
      billConditions.push(eq(supplierInvoices.organizationId, organizationId));
    }
    if (locationId && locationId !== "ALL") {
      billConditions.push(eq(supplierInvoices.locationId, locationId));
    }
    billConditions.push(sql`${supplierInvoices.status} != 'PAID'`);

    if (vendorFilter) {
      billConditions.push(eq(supplierInvoices.vendorId, vendorFilter));
    }
    if (dateFrom) {
      billConditions.push(gte(supplierInvoices.invoiceDate, dateFrom));
    }
    if (dateTo) {
      billConditions.push(lte(supplierInvoices.invoiceDate, dateTo));
    }

    pendingBillsData = await db
      .select({
        id: supplierInvoices.id,
        invoiceNumber: supplierInvoices.invoiceNumber,
        invoiceDate: supplierInvoices.invoiceDate,
        dueDate: supplierInvoices.dueDate,
        totalAmount: supplierInvoices.totalAmount,
        status: supplierInvoices.status,
        vendorName: vendors.name,
        createdAt: supplierInvoices.createdAt,
      })
      .from(supplierInvoices)
      .leftJoin(vendors, eq(supplierInvoices.vendorId, vendors.id))
      .where(billConditions.length > 0 ? and(...billConditions) : undefined)
      .orderBy(desc(supplierInvoices.invoiceDate));

    totalBillsAmount = pendingBillsData.reduce((acc, curr) => acc + Number(curr.totalAmount || 0), 0);
  } else if (isSpotView) {
    const spotConditions: any[] = [];
    if (organizationId) spotConditions.push(eq(spotPurchases.organizationId, organizationId));
    if (locationId && locationId !== "ALL") spotConditions.push(eq(spotPurchases.locationId, locationId));

    if (statusFilter) {
      spotConditions.push(eq(spotPurchases.auditStatus, statusFilter as any));
    }
    if (vendorFilter) {
      const matchedVendor = allVendors.find(v => v.id === vendorFilter);
      if (matchedVendor) {
        spotConditions.push(eq(spotPurchases.vendorName, matchedVendor.name));
      }
    }

    if (dateFrom) {
      spotConditions.push(gte(spotPurchases.createdAt, new Date(dateFrom)));
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      spotConditions.push(lte(spotPurchases.createdAt, toDate));
    }

    spotPurchasesData = await db
      .select({
        id: spotPurchases.id,
        voucherNumber: spotPurchases.voucherNumber,
        vendorName: spotPurchases.vendorName,
        itemName: items.nameEn,
        quantity: spotPurchases.quantity,
        uom: spotPurchases.uom,
        unitPrice: spotPurchases.unitPrice,
        totalAmount: spotPurchases.totalAmount,
        paymentSource: spotPurchases.paymentSource,
        auditStatus: spotPurchases.auditStatus,
        receiptPhotoUrl: spotPurchases.receiptPhotoUrl,
        createdAt: spotPurchases.createdAt,
      })
      .from(spotPurchases)
      .leftJoin(items, eq(spotPurchases.itemId, items.id))
      .where(spotConditions.length > 0 ? and(...spotConditions) : undefined)
      .orderBy(desc(spotPurchases.createdAt));

    totalSpotAmount = spotPurchasesData.reduce((acc, curr) => acc + Number(curr.totalAmount || 0), 0);
  } else {
    // Base PO conditions
    const conditions: any[] = [];
    
    if (organizationId) conditions.push(eq(purchaseOrders.organizationId, organizationId));
    if (locationId && locationId !== "ALL") conditions.push(eq(purchaseOrders.locationId, locationId));
    
    // Status & Type Filtering
    if (statusFilter) {
      conditions.push(eq(purchaseOrders.status, statusFilter));
    } else if (filterType === "goods_received") {
      // Matches Goods Received metric on dashboard
      conditions.push(inArray(purchaseOrders.status, ["completed", "received", "audited"]));
    } else if (filterType === "pending_receipts") {
      // Matches Pending Receipts metric on dashboard
      conditions.push(inArray(purchaseOrders.status, ["pending_receipt", "ordered", "in_transit", "approved"]));
    }
    
    if (vendorFilter) {
      conditions.push(eq(purchaseOrders.vendorId, vendorFilter));
    }
    
    // Date Filtering (For pending_receipts, only filter if explicitly requested via form so dashboard count matches)
    if (dateFrom && (filterType !== "pending_receipts" || resolvedParams.from)) {
      conditions.push(gte(purchaseOrders.createdAt, new Date(dateFrom)));
    }
    
    if (dateTo && (filterType !== "pending_receipts" || resolvedParams.to)) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      conditions.push(lte(purchaseOrders.createdAt, toDate));
    }

    reportData = await db
      .select({
        id: purchaseOrders.id,
        poNumber: purchaseOrders.poNumber,
        status: purchaseOrders.status,
        vendorName: vendors.name,
        totalAmount: purchaseOrders.totalAmount,
        cashierBillAmount: purchaseOrders.cashierBillAmount,
        paymentMethod: purchaseOrders.paymentMethod,
        publicToken: purchaseOrders.publicToken,
        createdAt: purchaseOrders.createdAt,
      })
      .from(purchaseOrders)
      .leftJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(purchaseOrders.createdAt));

    // Also include spot purchases into Total Spend if viewing 'all'
    let spotSpendIncluded = 0;
    if (filterType === "all" && !vendorFilter && !statusFilter) {
      const spotConditions: any[] = [];
      if (organizationId) spotConditions.push(eq(spotPurchases.organizationId, organizationId));
      if (locationId && locationId !== "ALL") spotConditions.push(eq(spotPurchases.locationId, locationId));
      if (dateFrom) spotConditions.push(gte(spotPurchases.createdAt, new Date(dateFrom)));
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        spotConditions.push(lte(spotPurchases.createdAt, toDate));
      }
      const spotRows = await db
        .select({ totalAmount: spotPurchases.totalAmount })
        .from(spotPurchases)
        .where(spotConditions.length > 0 ? and(...spotConditions) : undefined);
      spotSpendIncluded = spotRows.reduce((sum, r) => sum + Number(r.totalAmount || 0), 0);
    }

    totalSpend = reportData.reduce((acc, curr) => acc + Number(curr.cashierBillAmount || curr.totalAmount || 0), 0) + spotSpendIncluded;
  }

  // Filter Titles & Badges
  let filterTitle = "All Purchases";
  let filterDescription = "Complete register of restaurant purchases and orders.";
  let filterColor = "#3b82f6";
  let filterIcon = FileText;

  if (filterType === "all_orders") {
    filterTitle = "Purchase Orders";
    filterDescription = "All purchase orders issued to suppliers in the selected period.";
    filterColor = "#0284c7";
    filterIcon = ShoppingCart;
  } else if (filterType === "goods_received") {
    filterTitle = "Goods Received";
    filterDescription = "Orders verified and received at store locations.";
    filterColor = "#16a34a";
    filterIcon = Truck;
  } else if (filterType === "pending_receipts") {
    filterTitle = "Pending Receipts";
    filterDescription = "Purchase orders currently awaiting delivery and receipt confirmation.";
    filterColor = "#d97706";
    filterIcon = Clock;
  } else if (filterType === "pending_bills") {
    filterTitle = "Pending Bills";
    filterDescription = "Supplier invoices and bills awaiting accounts clearance or payment.";
    filterColor = "#ea580c";
    filterIcon = Wallet;
  } else if (filterType === "spot_purchases") {
    filterTitle = "Spot & Quick Purchases";
    filterDescription = "Immediate counter and local market purchases paid via drawer or UPI.";
    filterColor = "#8b5cf6";
    filterIcon = Zap;
  } else if (filterType === "routine_automations") {
    filterTitle = "Routine Automations & Assessments";
    filterDescription = "Complete log of scheduled procurement cycles, assessment runs, and escalation outcomes.";
    filterColor = "#059669";
    filterIcon = CheckCircle2;
  }

  const ActiveIcon = filterIcon;
  const isFiltered = filterType !== "all" || statusFilter || vendorFilter || dateFrom || dateTo;

  return (
    <div style={{
      backgroundColor: "#f8fafc",
      minHeight: "100vh",
      padding: "20px 24px 40px 24px",
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      boxSizing: "border-box"
    }}>
      {/* Back link */}
      <div style={{ marginBottom: "14px" }}>
        <Link 
          href={`/purchasing/dashboard${baseQueryStr}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "13px",
            fontWeight: 600,
            color: "#64748b",
            textDecoration: "none",
            padding: "4px 8px",
            borderRadius: "6px",
            backgroundColor: "#ffffff",
            border: "1px solid #e2e8f0"
          }}
        >
          <ArrowLeft size={14} />
          <span>Back to Purchase Dashboard</span>
        </Link>
      </div>

      {/* Page Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              backgroundColor: `${filterColor}15`,
              color: filterColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <ActiveIcon size={20} />
            </div>
            <div>
              <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#0f172a", margin: "0 0 2px 0" }}>
                {filterTitle}
              </h1>
              <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>
                {filterDescription}
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button 
            type="button"
            onClick={undefined}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 14px",
              backgroundColor: "#ffffff",
              color: "#334155",
              border: "1px solid #cbd5e1",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "12px"
            }}
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
          
          {(context.isOwner || (primaryScope?.permissions || []).includes("purchasing.create_po:create")) && (
            <Link
              href={`/purchasing/purchase-orders/create${tenantParams ? `?${tenantParams.slice(1)}` : ""}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "7px 14px",
                backgroundColor: "#7c3a27",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                textDecoration: "none",
                fontWeight: 600,
                fontSize: "12px"
              }}
            >
              <span>+ Create Purchase Order</span>
            </Link>
          )}
        </div>
      </div>

      {/* KPI Filter Pills / Tabs */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
        {[
          { key: "all", label: "Total Spend", icon: FileText, color: "#3b82f6" },
          { key: "all_orders", label: "Purchase Orders", icon: ShoppingCart, color: "#0284c7" },
          { key: "goods_received", label: "Goods Received", icon: Truck, color: "#16a34a" },
          { key: "pending_receipts", label: "Pending Receipts", icon: Clock, color: "#d97706" },
          { key: "pending_bills", label: "Pending Bills", icon: Wallet, color: "#ea580c" },
          { key: "spot_purchases", label: "Spot & Quick Purchases", icon: Zap, color: "#8b5cf6" },
          { key: "routine_automations", label: "Routine Automations", icon: CheckCircle2, color: "#059669" },
        ].map((tab) => {
          const isActive = filterType === tab.key;
          const TabIcon = tab.icon;
          const dateQuery = (dateFrom && dateTo && tab.key !== "pending_receipts" && tab.key !== "pending_bills")
            ? `&from=${dateFrom}&to=${dateTo}`
            : "";
          return (
            <Link
              key={tab.key}
              href={`/purchasing/reports?type=${tab.key}${dateQuery}${tenantParams}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "7px",
                padding: "8px 14px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: isActive ? 700 : 500,
                textDecoration: "none",
                backgroundColor: isActive ? "#ffffff" : "#f1f5f9",
                color: isActive ? "#0f172a" : "#475569",
                border: isActive ? `2px solid ${tab.color}` : "1px solid #e2e8f0",
                boxShadow: isActive ? "0 2px 4px rgba(0,0,0,0.05)" : "none",
                transition: "all 0.15s ease"
              }}
            >
              <TabIcon size={14} style={{ color: isActive ? tab.color : "#64748b" }} />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Active Filter Notification Bar */}
      {isFiltered && (
        <div style={{
          backgroundColor: "#ffffff",
          border: "1px solid #e2e8f0",
          borderLeft: `4px solid ${filterColor}`,
          borderRadius: "8px",
          padding: "10px 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
          boxShadow: "0 1px 2px rgba(0,0,0,0.03)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>
              Active Filter: {filterTitle}
            </span>
            <span style={{
              fontSize: "11px",
              fontWeight: 700,
              backgroundColor: `${filterColor}15`,
              color: filterColor,
              padding: "2px 8px",
              borderRadius: "99px"
            }}>
              {isBillsView ? pendingBillsData.length : isSpotView ? spotPurchasesData.length : reportData.length} {(((isBillsView ? pendingBillsData.length : isSpotView ? spotPurchasesData.length : reportData.length) === 1) ? "Record" : "Records")}
            </span>
            {dateFrom && dateTo && (
              <span style={{ fontSize: "11px", color: "#64748b" }}>
                ({dateFrom} to {dateTo})
              </span>
            )}
          </div>

          <Link
            href={`/purchasing/reports${baseQueryStr}`}
            style={{
              fontSize: "12px",
              fontWeight: 600,
              color: "#64748b",
              textDecoration: "none",
              padding: "3px 8px",
              borderRadius: "4px",
              backgroundColor: "#f1f5f9"
            }}
          >
            Clear All Filters
          </Link>
        </div>
      )}

      {/* Filter Controls Card */}
      <div style={{
        backgroundColor: "#ffffff",
        border: "1px solid #edf2f7",
        borderRadius: "10px",
        padding: "14px 18px",
        marginBottom: "18px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
      }}>
        <form method="GET" action="/purchasing/reports" style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "flex-end" }}>
          {organizationId && <input type="hidden" name="organizationId" value={organizationId} />}
          {locationId && <input type="hidden" name="locationId" value={locationId} />}
          <input type="hidden" name="type" value={filterType} />          {!isBillsView && (
            <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
              <label style={{ fontSize: "11px", fontWeight: 600, color: "#475569" }}>Status</label>
              {isRoutinesView ? (
                <select 
                  name="status" 
                  defaultValue={statusFilter} 
                  style={{ padding: "6px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "12px", minWidth: "150px", backgroundColor: "#ffffff" }}
                >
                  <option value="">All Execution Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="audit_pending">Audit Pending (Escalated)</option>
                  <option value="completed">Completed / Audited</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              ) : isSpotView ? (
                <select 
                  name="status" 
                  defaultValue={statusFilter} 
                  style={{ padding: "6px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "12px", minWidth: "150px", backgroundColor: "#ffffff" }}
                >
                  <option value="">All Audit Statuses</option>
                  <option value="PENDING_AUDIT">Pending Audit</option>
                  <option value="AUDITED_CLEARED">Audited & Cleared</option>
                  <option value="FLAGGED_DISCREPANCY">Flagged Discrepancy</option>
                </select>
              ) : (
                <select 
                  name="status" 
                  defaultValue={statusFilter} 
                  style={{ padding: "6px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "12px", minWidth: "140px", backgroundColor: "#ffffff" }}
                >
                  <option value="">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="pending_approval">Pending Approval</option>
                  <option value="approved">Approved</option>
                  <option value="pending_receipt">Pending Receipt</option>
                  <option value="in_transit">In Transit</option>
                  <option value="received">Received</option>
                  <option value="audited">Audited</option>
                  <option value="completed">Completed</option>
                  <option value="rejected">Rejected</option>
                </select>
              )}
            </div>
          )}
          
          <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
            <label style={{ fontSize: "11px", fontWeight: 600, color: "#475569" }}>Vendor</label>
            <select 
              name="vendor" 
              defaultValue={vendorFilter} 
              style={{ padding: "6px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "12px", minWidth: "180px", backgroundColor: "#ffffff" }}
            >
              <option value="">All Vendors</option>
              {allVendors.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
            <label style={{ fontSize: "11px", fontWeight: 600, color: "#475569" }}>From Date</label>
            <input 
              type="date" 
              name="from" 
              defaultValue={dateFrom} 
              style={{ padding: "6px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "12px", backgroundColor: "#ffffff" }} 
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
            <label style={{ fontSize: "11px", fontWeight: 600, color: "#475569" }}>To Date</label>
            <input 
              type="date" 
              name="to" 
              defaultValue={dateTo} 
              style={{ padding: "6px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "12px", backgroundColor: "#ffffff" }} 
            />
          </div>

          <button 
            type="submit" 
            style={{ 
              display: "inline-flex", 
              alignItems: "center", 
              gap: "6px", 
              padding: "7px 14px", 
              cursor: "pointer", 
              border: "none", 
              borderRadius: "6px", 
              backgroundColor: "#0f172a", 
              color: "#ffffff", 
              fontSize: "12px", 
              fontWeight: 600, 
              height: "33px" 
            }}
          >
            <Filter size={13} />
            <span>Filter</span>
          </button>
        </form>
      </div>

      {/* Summary KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", marginBottom: "18px" }}>
        <div style={{
          backgroundColor: "#ffffff",
          border: "1px solid #edf2f7",
          borderRadius: "10px",
          padding: "16px 20px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
        }}>
          <div style={{ fontSize: "12px", fontWeight: 500, color: "#64748b" }}>
            {isRoutinesView ? "Total Routine Cycles" : isBillsView ? "Total Pending Invoices" : isSpotView ? "Total Spot Purchases" : "Matching Orders"}
          </div>
          <div style={{ fontSize: "24px", fontWeight: 700, color: "#0f172a", marginTop: "4px" }}>
            {isRoutinesView ? totalRoutineRuns : isBillsView ? pendingBillsData.length : isSpotView ? spotPurchasesData.length : reportData.length}
          </div>
        </div>

        <div style={{
          backgroundColor: "#ffffff",
          border: "1px solid #edf2f7",
          borderRadius: "10px",
          padding: "16px 20px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
        }}>
          <div style={{ fontSize: "12px", fontWeight: 500, color: "#64748b" }}>
            {isRoutinesView ? "Completed / Audited Cycles" : isBillsView ? "Total Unpaid Amount" : isSpotView ? "Total Spot Purchases Spend" : "Total Spend (Filtered)"}
          </div>
          <div style={{ fontSize: "24px", fontWeight: 700, color: filterColor, marginTop: "4px" }}>
            {isRoutinesView 
              ? `${routineTasksData.filter(r => r.status === "completed").length} Completed`
              : formatCurrency(isBillsView ? totalBillsAmount : isSpotView ? totalSpotAmount : totalSpend)}
          </div>
        </div>
      </div>

      {/* Main Data Table */}
      <div style={{
        backgroundColor: "#ffffff",
        border: "1px solid #edf2f7",
        borderRadius: "10px",
        overflow: "hidden",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
      }}>
        <div style={{ overflowX: "auto" }}>
          {isBillsView ? (
            /* Pending Bills / Invoices Table */
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
              <thead style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <tr>
                  <th style={{ padding: "10px 16px", fontWeight: 600, color: "#64748b", fontSize: "11px", textTransform: "uppercase" }}>Invoice No.</th>
                  <th style={{ padding: "10px 16px", fontWeight: 600, color: "#64748b", fontSize: "11px", textTransform: "uppercase" }}>Invoice Date</th>
                  <th style={{ padding: "10px 16px", fontWeight: 600, color: "#64748b", fontSize: "11px", textTransform: "uppercase" }}>Due Date</th>
                  <th style={{ padding: "10px 16px", fontWeight: 600, color: "#64748b", fontSize: "11px", textTransform: "uppercase" }}>Vendor</th>
                  <th style={{ padding: "10px 16px", fontWeight: 600, color: "#64748b", fontSize: "11px", textTransform: "uppercase" }}>Status</th>
                  <th style={{ padding: "10px 16px", fontWeight: 600, color: "#64748b", fontSize: "11px", textTransform: "uppercase", textAlign: "right" }}>Total Amount</th>
                  <th style={{ padding: "10px 16px", fontWeight: 600, color: "#64748b", fontSize: "11px", textTransform: "uppercase", textAlign: "center" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingBillsData.length > 0 ? (
                  pendingBillsData.map((inv) => (
                    <tr key={inv.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "12px 16px", fontFamily: "monospace", fontWeight: 600, color: "#0f172a" }}>
                        #{inv.invoiceNumber}
                      </td>
                      <td style={{ padding: "12px 16px", color: "#64748b" }}>
                        {inv.invoiceDate || "—"}
                      </td>
                      <td style={{ padding: "12px 16px", color: "#64748b" }}>
                        {inv.dueDate || "—"}
                      </td>
                      <td style={{ padding: "12px 16px", fontWeight: 600, color: "#1e293b" }}>
                        {inv.vendorName || "Direct Vendor"}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        {getStatusCapsule(inv.status)}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700, color: "#0f172a" }}>
                        {formatCurrency(inv.totalAmount)}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        <Link
                          href={`/finance/purchases-payables/bills${tenantParams ? `?${tenantParams.slice(1)}` : ""}`}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            backgroundColor: "#f1f5f9",
                            color: "#334155",
                            padding: "4px 8px",
                            borderRadius: "4px",
                            fontSize: "11px",
                            fontWeight: 600,
                            textDecoration: "none"
                          }}
                        >
                          <span>Review</span>
                          <ExternalLink size={11} />
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>
                      <Wallet size={40} style={{ opacity: 0.25, margin: "0 auto 10px auto", display: "block" }} />
                      <div style={{ fontSize: "14px", fontWeight: 600, color: "#334155" }}>No pending bills found</div>
                      <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px" }}>All vendor bills and invoices are fully settled.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : isSpotView ? (
            /* Spot & Quick Purchases Table */
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
              <thead style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <tr>
                  <th style={{ padding: "10px 16px", fontWeight: 600, color: "#64748b", fontSize: "11px", textTransform: "uppercase" }}>Voucher No.</th>
                  <th style={{ padding: "10px 16px", fontWeight: 600, color: "#64748b", fontSize: "11px", textTransform: "uppercase" }}>Date</th>
                  <th style={{ padding: "10px 16px", fontWeight: 600, color: "#64748b", fontSize: "11px", textTransform: "uppercase" }}>Vendor / Shop</th>
                  <th style={{ padding: "10px 16px", fontWeight: 600, color: "#64748b", fontSize: "11px", textTransform: "uppercase" }}>Item Purchased</th>
                  <th style={{ padding: "10px 16px", fontWeight: 600, color: "#64748b", fontSize: "11px", textTransform: "uppercase" }}>Payment Source</th>
                  <th style={{ padding: "10px 16px", fontWeight: 600, color: "#64748b", fontSize: "11px", textTransform: "uppercase" }}>Audit Status</th>
                  <th style={{ padding: "10px 16px", fontWeight: 600, color: "#64748b", fontSize: "11px", textTransform: "uppercase", textAlign: "right" }}>Amount</th>
                  <th style={{ padding: "10px 16px", fontWeight: 600, color: "#64748b", fontSize: "11px", textTransform: "uppercase", textAlign: "center" }}>Receipt</th>
                </tr>
              </thead>
              <tbody>
                {spotPurchasesData.length > 0 ? (
                  spotPurchasesData.map((sp) => (
                    <tr key={sp.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "12px 16px", fontFamily: "monospace", fontWeight: 700, color: "#7c3a27" }}>
                        #{sp.voucherNumber}
                      </td>
                      <td style={{ padding: "12px 16px", color: "#64748b" }}>
                        {new Date(sp.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric"
                        })}
                      </td>
                      <td style={{ padding: "12px 16px", fontWeight: 600, color: "#1e293b" }}>
                        {sp.vendorName}
                      </td>
                      <td style={{ padding: "12px 16px", color: "#334155" }}>
                        <strong>{sp.itemName || "Spot Item"}</strong> ({sp.quantity} {sp.uom})
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{
                          padding: "2px 8px",
                          borderRadius: "4px",
                          backgroundColor: "#f1f5f9",
                          color: "#475569",
                          fontSize: "11px",
                          fontWeight: 600
                        }}>
                          {sp.paymentSource || "PETTY_CASH"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{
                          padding: "3px 10px",
                          borderRadius: "99px",
                          backgroundColor: sp.auditStatus === "AUDITED_CLEARED" ? "#dcfce7" : sp.auditStatus === "FLAGGED_DISCREPANCY" ? "#fee2e2" : "#fef3c7",
                          color: sp.auditStatus === "AUDITED_CLEARED" ? "#16a34a" : sp.auditStatus === "FLAGGED_DISCREPANCY" ? "#dc2626" : "#d97706",
                          fontSize: "11px",
                          fontWeight: 700,
                          display: "inline-block"
                        }}>
                          {sp.auditStatus.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700, color: "#0f172a" }}>
                        {formatCurrency(sp.totalAmount)}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        {sp.receiptPhotoUrl ? (
                          <a
                            href={sp.receiptPhotoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              backgroundColor: "#f1f5f9",
                              color: "#2563eb",
                              padding: "4px 8px",
                              borderRadius: "4px",
                              fontSize: "11px",
                              fontWeight: 600,
                              textDecoration: "none"
                            }}
                          >
                            <span>View</span>
                            <ExternalLink size={11} />
                          </a>
                        ) : (
                          <span style={{ color: "#94a3b8", fontSize: "11px" }}>No photo</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>
                      <Zap size={40} style={{ opacity: 0.25, margin: "0 auto 10px auto", display: "block" }} />
                      <div style={{ fontSize: "14px", fontWeight: 600, color: "#334155" }}>No spot purchases found</div>
                      <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px" }}>No quick or spot purchases recorded for the selected criteria.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : isRoutinesView ? (
            /* Routine Automations & Assessment Cycles Table */
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
              <thead style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <tr>
                  <th style={{ padding: "10px 16px", fontWeight: 600, color: "#64748b", fontSize: "11px", textTransform: "uppercase" }}>Cycle / Vendor</th>
                  <th style={{ padding: "10px 16px", fontWeight: 600, color: "#64748b", fontSize: "11px", textTransform: "uppercase" }}>Scheduled Run Date</th>
                  <th style={{ padding: "10px 16px", fontWeight: 600, color: "#64748b", fontSize: "11px", textTransform: "uppercase" }}>Assigned Role</th>
                  <th style={{ padding: "10px 16px", fontWeight: 600, color: "#64748b", fontSize: "11px", textTransform: "uppercase" }}>Deadline / Due At</th>
                  <th style={{ padding: "10px 16px", fontWeight: 600, color: "#64748b", fontSize: "11px", textTransform: "uppercase" }}>Completed / Audited At</th>
                  <th style={{ padding: "10px 16px", fontWeight: 600, color: "#64748b", fontSize: "11px", textTransform: "uppercase" }}>Status</th>
                  <th style={{ padding: "10px 16px", fontWeight: 600, color: "#64748b", fontSize: "11px", textTransform: "uppercase", textAlign: "center" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {routineTasksData.length > 0 ? (
                  routineTasksData.map((rt) => {
                    const ctx = (rt.contextData as any) || {};
                    const vendorName = ctx.vendorName || "Routine Vendor";
                    const isAuditPending = rt.status === "audit_pending";
                    const isCompleted = rt.status === "completed";
                    const isMissed = rt.status === "pending" && rt.dueAt && new Date(rt.dueAt) < new Date();
                    const isInProgress = rt.status === "in_progress";

                    let statusBadge = (
                      <span style={{ padding: "3px 10px", borderRadius: "99px", backgroundColor: "#fef3c7", color: "#d97706", fontSize: "11px", fontWeight: 700, display: "inline-block" }}>
                        Pending
                      </span>
                    );

                    if (isCompleted) {
                      statusBadge = (
                        <span style={{ padding: "3px 10px", borderRadius: "99px", backgroundColor: "#dcfce7", color: "#16a34a", fontSize: "11px", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <CheckCircle2 size={12} /> {ctx.escalated ? "Audited & Cleared" : "Completed"}
                        </span>
                      );
                    } else if (isAuditPending) {
                      statusBadge = (
                        <span style={{ padding: "3px 10px", borderRadius: "99px", backgroundColor: "#ffedd5", color: "#c2410c", fontSize: "11px", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <AlertCircle size={12} /> Audit Pending ({ctx.escalationReason || "Escalated"})
                        </span>
                      );
                    } else if (isMissed) {
                      statusBadge = (
                        <span style={{ padding: "3px 10px", borderRadius: "99px", backgroundColor: "#fee2e2", color: "#dc2626", fontSize: "11px", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <AlertCircle size={12} /> Overdue / Missed
                        </span>
                      );
                    } else if (isInProgress) {
                      statusBadge = (
                        <span style={{ padding: "3px 10px", borderRadius: "99px", backgroundColor: "#eff6ff", color: "#2563eb", fontSize: "11px", fontWeight: 700, display: "inline-block" }}>
                          In Progress
                        </span>
                      );
                    }

                    return (
                      <tr key={rt.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "13px" }}>
                            {vendorName}
                          </div>
                          <div style={{ fontSize: "11px", color: "#64748b", fontFamily: "monospace", marginTop: "2px" }}>
                            {ctx.title || `Cycle #${rt.id.slice(0, 8)}`}
                          </div>
                        </td>
                        <td style={{ padding: "12px 16px", color: "#334155" }}>
                          {new Date(rt.createdAt).toLocaleString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </td>
                        <td style={{ padding: "12px 16px", color: "#475569", fontWeight: 600 }}>
                          {rt.roleName || "Head Chef / Kitchen"}
                        </td>
                        <td style={{ padding: "12px 16px", color: "#64748b" }}>
                          {rt.dueAt ? new Date(rt.dueAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"}
                        </td>
                        <td style={{ padding: "12px 16px", color: rt.completedAt ? "#16a34a" : "#94a3b8" }}>
                          {rt.completedAt ? new Date(rt.completedAt).toLocaleString("en-IN", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit"
                          }) : "—"}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          {statusBadge}
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "center" }}>
                          {ctx.actionUrl && (rt.status === "pending" || rt.status === "in_progress") ? (
                            <Link
                              href={ctx.actionUrl}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                backgroundColor: "#7c3a27",
                                color: "#ffffff",
                                padding: "4px 8px",
                                borderRadius: "4px",
                                fontSize: "11px",
                                fontWeight: 600,
                                textDecoration: "none"
                              }}
                            >
                              <span>Assess Stock</span>
                            </Link>
                          ) : (
                            <Link
                              href={`/purchasing/dashboard?taskId=${rt.id}${tenantParams}`}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                backgroundColor: "#f1f5f9",
                                color: "#475569",
                                padding: "4px 8px",
                                borderRadius: "4px",
                                fontSize: "11px",
                                fontWeight: 600,
                                textDecoration: "none"
                              }}
                            >
                              <span>Dashboard</span>
                              <ExternalLink size={11} />
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>
                      <CheckCircle2 size={40} style={{ opacity: 0.25, margin: "0 auto 10px auto", display: "block" }} />
                      <div style={{ fontSize: "14px", fontWeight: 600, color: "#334155" }}>No routine automation records found</div>
                      <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px" }}>No routine purchasing assessment tasks recorded for the selected filter.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            /* Purchase Orders Table */
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
              <thead style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <tr>
                  <th style={{ padding: "10px 16px", fontWeight: 600, color: "#64748b", fontSize: "11px", textTransform: "uppercase" }}>PO Number</th>
                  <th style={{ padding: "10px 16px", fontWeight: 600, color: "#64748b", fontSize: "11px", textTransform: "uppercase" }}>Date</th>
                  <th style={{ padding: "10px 16px", fontWeight: 600, color: "#64748b", fontSize: "11px", textTransform: "uppercase" }}>Vendor</th>
                  <th style={{ padding: "10px 16px", fontWeight: 600, color: "#64748b", fontSize: "11px", textTransform: "uppercase" }}>Status</th>
                  <th style={{ padding: "10px 16px", fontWeight: 600, color: "#64748b", fontSize: "11px", textTransform: "uppercase" }}>Method</th>
                  <th style={{ padding: "10px 16px", fontWeight: 600, color: "#64748b", fontSize: "11px", textTransform: "uppercase", textAlign: "right" }}>PO Amount</th>
                  <th style={{ padding: "10px 16px", fontWeight: 600, color: "#64748b", fontSize: "11px", textTransform: "uppercase", textAlign: "right" }}>Bill Amount</th>
                  <th style={{ padding: "10px 16px", fontWeight: 600, color: "#64748b", fontSize: "11px", textTransform: "uppercase", textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reportData.length > 0 ? (
                  reportData.map((po) => (
                    <tr key={po.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "12px 16px" }}>
                        <Link 
                          href={`/public/po/${po.publicToken || po.id}`} 
                          target="_blank" 
                          style={{ 
                            fontWeight: 600, 
                            color: "#2563eb", 
                            textDecoration: "none", 
                            display: "inline-flex", 
                            alignItems: "center", 
                            gap: "4px",
                            fontFamily: "monospace"
                          }}
                        >
                          #{po.poNumber || po.id.split('-')[0].toUpperCase()}
                          <ExternalLink size={12} />
                        </Link>
                      </td>
                      <td style={{ padding: "12px 16px", color: "#64748b" }}>
                        {new Date(po.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric"
                        })}
                      </td>
                      <td style={{ padding: "12px 16px", fontWeight: 600, color: "#1e293b" }}>
                        {po.vendorName || "Direct Vendor"}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        {getStatusCapsule(po.status)}
                      </td>
                      <td style={{ padding: "12px 16px", textTransform: "capitalize", color: "#64748b" }}>
                        {po.paymentMethod || "Credit"}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 600, color: "#0f172a" }}>
                        {formatCurrency(po.totalAmount)}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: po.cashierBillAmount ? 700 : 400, color: po.cashierBillAmount ? "#0f172a" : "#94a3b8" }}>
                        {po.cashierBillAmount ? formatCurrency(po.cashierBillAmount) : "—"}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "center", whiteSpace: "nowrap" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                          {(po.status === "draft" || po.status === "pending_approval" || po.status === "pending_review") && (
                            <Link
                              href={`/purchasing/review/${po.id}${tenantParams ? `?${tenantParams.slice(1)}` : ""}`}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "3px",
                                backgroundColor: "#ea580c",
                                color: "#ffffff",
                                borderRadius: "4px",
                                padding: "3px 8px",
                                fontSize: "11px",
                                fontWeight: 600,
                                textDecoration: "none"
                              }}
                            >
                              <ClipboardCheck size={12} />
                              <span>Review</span>
                            </Link>
                          )}
                          {(po.status === "approved" || po.status === "sent_to_vendor" || po.status === "pending_receipt" || po.status === "in_transit" || po.status === "ordered") && (
                            <Link
                              href={`/purchasing/receive/${po.id}${tenantParams ? `?${tenantParams.slice(1)}` : ""}`}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "3px",
                                backgroundColor: "#2563eb",
                                color: "#ffffff",
                                borderRadius: "4px",
                                padding: "3px 8px",
                                fontSize: "11px",
                                fontWeight: 600,
                                textDecoration: "none"
                              }}
                            >
                              <PackageCheck size={12} />
                              <span>Receive</span>
                            </Link>
                          )}
                          <Link
                            href={`/public/po/${po.publicToken || po.id}`}
                            target="_blank"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "3px",
                              backgroundColor: "#f1f5f9",
                              color: "#475569",
                              borderRadius: "4px",
                              padding: "3px 8px",
                              fontSize: "11px",
                              fontWeight: 600,
                              textDecoration: "none"
                            }}
                          >
                            <span>View</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>
                      <FileText size={40} style={{ opacity: 0.25, margin: "0 auto 10px auto", display: "block" }} />
                      <div style={{ fontSize: "14px", fontWeight: 600, color: "#334155" }}>No purchase orders found</div>
                      <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px" }}>No orders matched your selected filters.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
