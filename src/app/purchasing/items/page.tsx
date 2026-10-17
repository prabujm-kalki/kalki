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
  currentPrice: string;
  isActive: boolean;
};

export default function ItemsPage() {
  const { selected } = useSessionView();
  const query = selected ? `?organizationId=${selected.organizationId}&locationId=${selected.locationId}` : '';
  const [itemsList, setItemsList] = useState<ItemView[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
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

  const filteredItems = useMemo(() => {
    return itemsList.filter((item) => {
      const matchesSearch = item.nameEn.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "ALL"
          ? true
          : statusFilter === "ACTIVE"
          ? item.isActive
          : !item.isActive;
      return matchesSearch && matchesStatus;
    });
  }, [itemsList, searchQuery, statusFilter]);

  const activeCount = useMemo(() => itemsList.filter((i) => i.isActive).length, [itemsList]);

  return (
    <div className="kalki-main-content">
      {/* Page Header */}
      <div className="kalki-page-header" style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <h1 className="kalki-page-title" style={{ fontSize: "22px", margin: 0 }}>
                Item Master
              </h1>
              <span style={{ fontSize: "12px", color: "var(--kalki-text-secondary)", backgroundColor: "#f1f5f9", padding: "2px 8px", borderRadius: "999px", fontWeight: 600 }}>
                {itemsList.length} Items ({activeCount} Active)
              </span>
            </div>
            <p className="kalki-page-description" style={{ marginTop: "4px" }}>
              Manage products, procurement pricing, units of measure, and supplier assignments.
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
        <div style={{ position: "relative", minWidth: "260px", flex: 1, maxWidth: "400px" }}>
          <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search items by name..."
            className="kalki-input"
            style={{ paddingLeft: "36px", height: "38px", fontSize: "13px" }}
          />
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
            All ({itemsList.length})
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
              {searchQuery || statusFilter !== "ALL" ? "No items match your search criteria." : "You haven't added any items yet."}
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
                  <th style={{ width: "40%" }}>Item Name</th>
                  <th style={{ width: "15%" }}>Unit of Measure</th>
                  <th style={{ width: "20%" }}>Current Price</th>
                  <th style={{ width: "15%" }}>Status</th>
                  <th style={{ width: "10%", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.id} style={{ transition: "background-color 0.15s ease" }}>
                    <td>
                      <span style={{ fontWeight: 600, color: "var(--kalki-text-primary)", fontSize: "14px" }}>
                        {item.nameEn}
                      </span>
                    </td>
                    <td>
                      <span 
                        style={{ 
                          padding: "3px 8px", 
                          backgroundColor: "#f1f5f9", 
                          borderRadius: "4px", 
                          fontSize: "12px", 
                          fontWeight: 500,
                          color: "var(--kalki-text-secondary)"
                        }}
                      >
                        {item.unit}
                      </span>
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

