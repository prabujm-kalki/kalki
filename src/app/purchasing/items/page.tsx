"use client";

import Link from "next/link";
import { Plus, Edit, Search, Package, CheckCircle2, XCircle } from "lucide-react";
import { useSessionView } from "@/components/AppShell";
import { useEffect, useState, useMemo } from "react";
import { apiGet } from "@/lib/api";
import { KalkiButton } from "@/components/ui/KalkiButton";

type ItemView = {
  id: string;
  nameEn: string;
  unit: string;
  prepUnit?: string | null;
  prepUnitConversion?: string | number | null;
  roundToWhole?: boolean;
  currentPrice: string;
  isActive: boolean;
  itemType?: 'RAW_MATERIAL' | 'EXPENSE' | 'MENU_ITEM';
  categoryId?: string | null;
  categoryName?: string | null;
  subcategoryName?: string | null;
};

export default function ItemsPage() {
  const { selected } = useSessionView();
  const query = selected ? `?organizationId=${selected.organizationId}&locationId=${selected.locationId}` : '';
  const [itemsList, setItemsList] = useState<ItemView[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "RAW_MATERIAL" | "MENU_ITEM" | "EXPENSE">("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  useEffect(() => {
    if (!selected) {
      setLoading(false);
      return;
    }
    const params = new URLSearchParams({
      organizationId: selected.organizationId,
      locationId: selected.locationId,
    });
    apiGet<{ items: ItemView[] }>(`/api/items?${params.toString()}`)
      .then(res => {
        setItemsList(res.items || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [selected]);

  // Extract unique category names for filter dropdown
  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    itemsList.forEach(item => {
      if (item.categoryName) set.add(item.categoryName);
    });
    return Array.from(set).sort();
  }, [itemsList]);

  // Counts by itemType
  const rawMaterialCount = useMemo(() => itemsList.filter(i => (i.itemType || 'RAW_MATERIAL') === 'RAW_MATERIAL').length, [itemsList]);
  const menuItemCount = useMemo(() => itemsList.filter(i => i.itemType === 'MENU_ITEM').length, [itemsList]);
  const expenseCount = useMemo(() => itemsList.filter(i => i.itemType === 'EXPENSE').length, [itemsList]);
  const activeCount = useMemo(() => itemsList.filter((i) => i.isActive).length, [itemsList]);

  const filteredItems = useMemo(() => {
    return itemsList.filter((item) => {
      const matchesSearch = item.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.categoryName && item.categoryName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesType =
        typeFilter === "ALL"
          ? true
          : (item.itemType || 'RAW_MATERIAL') === typeFilter;

      const matchesCategory =
        selectedCategory === "ALL"
          ? true
          : (item.categoryName || 'Uncategorized') === selectedCategory;

      const matchesStatus =
        statusFilter === "ALL"
          ? true
          : statusFilter === "ACTIVE"
          ? item.isActive
          : !item.isActive;

      return matchesSearch && matchesType && matchesCategory && matchesStatus;
    });
  }, [itemsList, searchQuery, typeFilter, selectedCategory, statusFilter]);

  return (
    <div className="kalki-main-content">
      {/* Page Header */}
      <div className="kalki-page-header" style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <h1 className="kalki-page-title" style={{ fontSize: "22px", margin: 0 }}>
                Item Master
              </h1>
              <span style={{ fontSize: "12px", color: "var(--kalki-text-secondary)", backgroundColor: "#f1f5f9", padding: "2px 8px", borderRadius: "999px", fontWeight: 600 }}>
                {itemsList.length} Total ({rawMaterialCount} Raw/Cost, {menuItemCount} Menu, {activeCount} Active)
              </span>
            </div>
            <p className="kalki-page-description" style={{ marginTop: "4px" }}>
              Manage products, raw materials, menu items, procurement pricing, units of measure, and supplier assignments.
            </p>
          </div>
          <div>
            <Link href={`/purchasing/items/create${query}`} style={{ textDecoration: "none" }}>
              <KalkiButton variant="primary" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <Plus size={16} /> Add New Item
              </KalkiButton>
            </Link>
          </div>
        </div>
      </div>

      {/* Item Type Tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => { setTypeFilter("ALL"); setSelectedCategory("ALL"); }}
          style={{
            padding: "8px 16px",
            borderRadius: "6px",
            border: "1px solid",
            borderColor: typeFilter === "ALL" ? "var(--kalki-primary)" : "var(--kalki-border)",
            backgroundColor: typeFilter === "ALL" ? "#eff6ff" : "#fff",
            color: typeFilter === "ALL" ? "var(--kalki-primary)" : "var(--kalki-text-secondary)",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer"
          }}
        >
          All Items ({itemsList.length})
        </button>
        <button
          type="button"
          onClick={() => { setTypeFilter("RAW_MATERIAL"); setSelectedCategory("ALL"); }}
          style={{
            padding: "8px 16px",
            borderRadius: "6px",
            border: "1px solid",
            borderColor: typeFilter === "RAW_MATERIAL" ? "var(--kalki-primary)" : "var(--kalki-border)",
            backgroundColor: typeFilter === "RAW_MATERIAL" ? "#eff6ff" : "#fff",
            color: typeFilter === "RAW_MATERIAL" ? "var(--kalki-primary)" : "var(--kalki-text-secondary)",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer"
          }}
        >
          Raw Materials & Packaging ({rawMaterialCount})
        </button>
        <button
          type="button"
          onClick={() => { setTypeFilter("MENU_ITEM"); setSelectedCategory("ALL"); }}
          style={{
            padding: "8px 16px",
            borderRadius: "6px",
            border: "1px solid",
            borderColor: typeFilter === "MENU_ITEM" ? "#8b5cf6" : "var(--kalki-border)",
            backgroundColor: typeFilter === "MENU_ITEM" ? "#f5f3ff" : "#fff",
            color: typeFilter === "MENU_ITEM" ? "#8b5cf6" : "var(--kalki-text-secondary)",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer"
          }}
        >
          Menu Items ({menuItemCount})
        </button>
        {expenseCount > 0 && (
          <button
            type="button"
            onClick={() => { setTypeFilter("EXPENSE"); setSelectedCategory("ALL"); }}
            style={{
              padding: "8px 16px",
              borderRadius: "6px",
              border: "1px solid",
              borderColor: typeFilter === "EXPENSE" ? "#d97706" : "var(--kalki-border)",
              backgroundColor: typeFilter === "EXPENSE" ? "#fffbeb" : "#fff",
              color: typeFilter === "EXPENSE" ? "#d97706" : "var(--kalki-text-secondary)",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Expenses ({expenseCount})
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div 
        style={{ 
          backgroundColor: "#fff", 
          border: "1px solid var(--kalki-border)", 
          borderRadius: "8px", 
          padding: "12px 16px", 
          marginBottom: "16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          flexWrap: "wrap"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: "260px", maxWidth: "600px", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: "220px" }}>
            <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search items by name or category..."
              className="kalki-input"
              style={{ paddingLeft: "36px", height: "38px", fontSize: "13px" }}
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="kalki-input"
            style={{ height: "38px", fontSize: "13px", minWidth: "160px", width: "auto" }}
          >
            <option value="ALL">All Categories</option>
            {categoryOptions.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button 
            type="button"
            onClick={() => setStatusFilter("ALL")}
            style={{
              padding: "6px 12px",
              borderRadius: "6px",
              border: "1px solid",
              borderColor: statusFilter === "ALL" ? "var(--kalki-primary)" : "var(--kalki-border)",
              backgroundColor: statusFilter === "ALL" ? "#eff6ff" : "#fff",
              color: statusFilter === "ALL" ? "var(--kalki-primary)" : "var(--kalki-text-secondary)",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            All Status ({itemsList.length})
          </button>
          <button 
            type="button"
            onClick={() => setStatusFilter("ACTIVE")}
            style={{
              padding: "6px 12px",
              borderRadius: "6px",
              border: "1px solid",
              borderColor: statusFilter === "ACTIVE" ? "#16a34a" : "var(--kalki-border)",
              backgroundColor: statusFilter === "ACTIVE" ? "#f0fdf4" : "#fff",
              color: statusFilter === "ACTIVE" ? "#16a34a" : "var(--kalki-text-secondary)",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Active ({activeCount})
          </button>
          <button 
            type="button"
            onClick={() => setStatusFilter("INACTIVE")}
            style={{
              padding: "6px 12px",
              borderRadius: "6px",
              border: "1px solid",
              borderColor: statusFilter === "INACTIVE" ? "#dc2626" : "var(--kalki-border)",
              backgroundColor: statusFilter === "INACTIVE" ? "#fef2f2" : "#fff",
              color: statusFilter === "INACTIVE" ? "#dc2626" : "var(--kalki-text-secondary)",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Inactive ({itemsList.length - activeCount})
          </button>
        </div>
      </div>

      {/* Items Table Card */}
      <div 
        style={{ 
          backgroundColor: "#fff", 
          border: "1px solid var(--kalki-border)", 
          borderRadius: "8px", 
          overflow: "hidden" 
        }}
      >
        {loading ? (
          <div style={{ textAlign: "center", padding: "48px 16px", color: "var(--kalki-text-secondary)", fontSize: "14px" }}>
            Loading item catalogue...
          </div>
        ) : filteredItems.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 16px", color: "var(--kalki-text-secondary)" }}>
            <Package size={36} style={{ color: "#cbd5e1", marginBottom: "8px" }} />
            <p style={{ margin: "0 0 12px 0", fontSize: "14px", fontWeight: 500 }}>
              {searchQuery || statusFilter !== "ALL" || typeFilter !== "ALL" || selectedCategory !== "ALL" ? "No items match your filter criteria." : "You haven't added any items yet."}
            </p>
            {!searchQuery && statusFilter === "ALL" && (
              <Link href={`/purchasing/items/create${query}`} style={{ textDecoration: "none" }}>
                <KalkiButton variant="secondary" size="sm">
                  Create your first item
                </KalkiButton>
              </Link>
            )}
          </div>
        ) : (
          <div className="kalki-table-container">
            <table className="kalki-table">
              <thead>
                <tr>
                  <th style={{ width: "32%" }}>Item Name</th>
                  <th style={{ width: "20%" }}>Category</th>
                  <th style={{ width: "13%" }}>Type</th>
                  <th style={{ width: "12%" }}>Unit of Measure</th>
                  <th style={{ width: "11%" }}>Current Price</th>
                  <th style={{ width: "8%" }}>Status</th>
                  <th style={{ width: "4%", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const isMenu = item.itemType === 'MENU_ITEM';
                  const isExpense = item.itemType === 'EXPENSE';
                  return (
                    <tr key={item.id} style={{ transition: "background-color 0.15s ease" }}>
                      <td>
                        <span style={{ fontWeight: 600, color: "var(--kalki-text-primary)", fontSize: "14px" }}>
                          {item.nameEn}
                        </span>
                      </td>
                      <td>
                        {item.categoryName ? (
                          <span 
                            style={{ 
                              padding: "3px 8px", 
                              backgroundColor: "#f1f5f9", 
                              borderRadius: "4px", 
                              fontSize: "12px", 
                              fontWeight: 600,
                              color: "var(--kalki-text-primary)",
                              display: "inline-block"
                            }}
                          >
                            {item.categoryName}
                          </span>
                        ) : (
                          <span style={{ color: "#94a3b8", fontSize: "12px", fontStyle: "italic" }}>
                            Uncategorized
                          </span>
                        )}
                      </td>
                      <td>
                        <span
                          style={{
                            padding: "2px 7px",
                            borderRadius: "4px",
                            fontSize: "11px",
                            fontWeight: 600,
                            letterSpacing: "0.3px",
                            backgroundColor: isMenu ? "#f5f3ff" : isExpense ? "#fffbeb" : "#f0fdf4",
                            color: isMenu ? "#7c3aed" : isExpense ? "#b45309" : "#15803d",
                            border: `1px solid ${isMenu ? "#ddd6fe" : isExpense ? "#fde68a" : "#bbf7d0"}`
                          }}
                        >
                          {isMenu ? "Menu Item" : isExpense ? "Expense" : "Raw Material"}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                          <span 
                            style={{ 
                              padding: "3px 8px", 
                              backgroundColor: "#f8fafc", 
                              border: "1px solid #e2e8f0",
                              borderRadius: "4px", 
                              fontSize: "12px", 
                              fontWeight: 500,
                              color: "var(--kalki-text-secondary)",
                              width: "fit-content"
                            }}
                          >
                            {item.unit}
                          </span>
                          {item.prepUnit && (
                            <span 
                              style={{ 
                                fontSize: "11px", 
                                color: "#0369a1", 
                                backgroundColor: "#f0f9ff", 
                                padding: "1px 6px", 
                                borderRadius: "4px", 
                                border: "1px solid #bae6fd",
                                width: "fit-content"
                              }}
                              title={`1 ${item.prepUnit} = ${item.prepUnitConversion} ${item.unit}`}
                            >
                              Prep: {item.prepUnit} ({item.prepUnitConversion} {item.unit})
                            </span>
                          )}
                          {item.roundToWhole && (
                            <span 
                              style={{ 
                                fontSize: "10px", 
                                color: "#7c3aed", 
                                backgroundColor: "#f5f3ff", 
                                padding: "1px 6px", 
                                borderRadius: "4px", 
                                border: "1px solid #ddd6fe",
                                width: "fit-content",
                                fontWeight: 600
                              }}
                              title={`Order quantity rounds up to full ${item.unit}`}
                            >
                              ⚡ Whole {item.unit}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: "var(--kalki-text-primary)", fontSize: "13px" }}>
                          ₹{item.currentPrice ? Number(item.currentPrice).toLocaleString("en-IN") : "0"}
                        </span>
                      </td>
                      <td>
                        <span 
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "2px 8px",
                            borderRadius: "999px",
                            fontSize: "11px",
                            fontWeight: 600,
                            backgroundColor: item.isActive ? "#dcfce7" : "#fee2e2",
                            color: item.isActive ? "#16a34a" : "#dc2626"
                          }}
                        >
                          {item.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <Link 
                          href={`/purchasing/items/${item.id}${query}`} 
                          className="kalki-button kalki-button--ghost"
                          style={{ padding: "6px 8px", display: "inline-flex", alignItems: "center", color: "var(--kalki-primary)" }}
                          title="Edit Item"
                        >
                          <Edit size={15} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

