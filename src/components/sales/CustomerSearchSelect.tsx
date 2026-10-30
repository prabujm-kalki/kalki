"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, UserPlus, Check, X, Phone, Building2, ChevronDown, Loader2 } from "lucide-react";
import { fetchCustomers } from "@/app/sales/actions";

export interface CustomerItem {
  id: string;
  name: string;
  phone?: string | null;
  taxId?: string | null;
  address?: string | null;
  email?: string | null;
}

interface CustomerSearchSelectProps {
  organizationId: string;
  selectedCustomerId: string;
  onSelectCustomer: (customer: CustomerItem | null) => void;
  onAddNewCustomerClick?: () => void;
  required?: boolean;
}

export function CustomerSearchSelect({
  organizationId,
  selectedCustomerId,
  onSelectCustomer,
  onAddNewCustomerClick,
  required = false,
}: CustomerSearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerItem | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Initial fetch of recent/top customers
  useEffect(() => {
    if (!organizationId) return;
    loadCustomers("");
  }, [organizationId]);

  // Sync selectedCustomer when selectedCustomerId changes externally
  useEffect(() => {
    if (!selectedCustomerId) {
      setSelectedCustomer(null);
      return;
    }
    const found = customers.find((c) => c.id === selectedCustomerId);
    if (found) {
      setSelectedCustomer(found);
    }
  }, [selectedCustomerId, customers]);

  // Debounced search when searchTerm changes
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      loadCustomers(searchTerm);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm, isOpen]);

  const loadCustomers = async (search: string) => {
    if (!organizationId) return;
    setLoading(true);
    try {
      const data = await fetchCustomers(organizationId, search, 30);
      setCustomers(data || []);
      if (selectedCustomerId && !selectedCustomer) {
        const found = (data || []).find((c) => c.id === selectedCustomerId);
        if (found) setSelectedCustomer(found);
      }
    } catch (err) {
      console.error("Failed to search customers:", err);
    } finally {
      setLoading(false);
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (customer: CustomerItem) => {
    setSelectedCustomer(customer);
    onSelectCustomer(customer);
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCustomer(null);
    onSelectCustomer(null);
    setSearchTerm("");
  };

  const handleToggle = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  };

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
      {/* Dropdown Display Button / Field */}
      <div
        onClick={handleToggle}
        style={{
          width: "100%",
          minHeight: "38px",
          padding: "6px 10px",
          borderRadius: "6px",
          border: isOpen ? "1.5px solid #2563eb" : "1px solid #cbd5e1",
          backgroundColor: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          userSelect: "none",
          transition: "border-color 0.15s ease",
          boxShadow: isOpen ? "0 0 0 2px rgba(37, 99, 235, 0.1)" : "none",
        }}
      >
        {selectedCustomer ? (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
            <div
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                backgroundColor: "#e0e7ff",
                color: "#3730a3",
                fontSize: "11px",
                fontWeight: "700",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {selectedCustomer.name.charAt(0).toUpperCase()}
            </div>
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2, overflow: "hidden" }}>
              <span style={{ fontSize: "13px", fontWeight: "600", color: "#0f172a", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                {selectedCustomer.name}
              </span>
              {selectedCustomer.phone && (
                <span style={{ fontSize: "11px", color: "#64748b", fontFamily: "monospace" }}>
                  {selectedCustomer.phone} {selectedCustomer.taxId ? `• GST: ${selectedCustomer.taxId}` : ""}
                </span>
              )}
            </div>
          </div>
        ) : (
          <span style={{ fontSize: "13px", color: "#94a3b8" }}>
            Search or select customer (Name, Phone, GSTIN)...
          </span>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {selectedCustomer && (
            <button
              type="button"
              onClick={handleClear}
              title="Clear selection"
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "2px",
                color: "#94a3b8",
                display: "flex",
                alignItems: "center",
              }}
            >
              <X size={14} />
            </button>
          )}
          <ChevronDown size={15} style={{ color: "#64748b", transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s ease" }} />
        </div>
      </div>

      {/* Popover Menu with Live Search and Results */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            backgroundColor: "#ffffff",
            borderRadius: "8px",
            border: "1px solid #cbd5e1",
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
            zIndex: 1000,
            overflow: "hidden",
            animation: "fadeIn 0.1s ease-out",
          }}
        >
          {/* Search Box Input */}
          <div style={{ padding: "8px", borderBottom: "1px solid #f1f5f9", position: "relative", backgroundColor: "#f8fafc" }}>
            <Search size={14} style={{ position: "absolute", left: "18px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Type customer name, 10-digit mobile, or GSTIN..."
              style={{
                width: "100%",
                padding: "7px 10px 7px 32px",
                borderRadius: "5px",
                border: "1px solid #cbd5e1",
                fontSize: "12.5px",
                backgroundColor: "#ffffff",
                outline: "none",
              }}
            />
          </div>

          {/* Customer Result List */}
          <div style={{ maxHeight: "240px", overflowY: "auto" }}>
            {loading ? (
              <div style={{ padding: "16px", textAlign: "center", color: "#64748b", fontSize: "12.5px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                <span>Searching customer database...</span>
              </div>
            ) : customers.length === 0 ? (
              <div style={{ padding: "20px 14px", textAlign: "center" }}>
                <p style={{ margin: "0 0 8px 0", fontSize: "13px", color: "#64748b" }}>
                  No customers found matching "<strong>{searchTerm}</strong>"
                </p>
                {onAddNewCustomerClick && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onAddNewCustomerClick();
                    }}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "6px 12px",
                      borderRadius: "5px",
                      backgroundColor: "#2563eb",
                      color: "#ffffff",
                      border: "none",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    <UserPlus size={13} />
                    Add New Customer "{searchTerm}"
                  </button>
                )}
              </div>
            ) : (
              customers.map((c) => {
                const isSelected = selectedCustomer?.id === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => handleSelect(c)}
                    style={{
                      padding: "9px 12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      cursor: "pointer",
                      borderBottom: "1px solid #f8fafc",
                      backgroundColor: isSelected ? "#f0fdf4" : "transparent",
                      transition: "background-color 0.1s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = "#f8fafc";
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px", overflow: "hidden" }}>
                      <span style={{ fontSize: "13px", fontWeight: "600", color: "#0f172a" }}>
                        {c.name}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "11px", color: "#64748b" }}>
                        {c.phone && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", fontFamily: "monospace" }}>
                            <Phone size={10} /> {c.phone}
                          </span>
                        )}
                        {c.taxId && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}>
                            <Building2 size={10} /> GST: {c.taxId}
                          </span>
                        )}
                        {c.address && (
                          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "160px" }}>
                            {c.address}
                          </span>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <Check size={16} style={{ color: "#16a34a", flexShrink: 0 }} />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Popover Footer with + Add Customer Shortcut */}
          {onAddNewCustomerClick && (
            <div
              onClick={() => {
                setIsOpen(false);
                onAddNewCustomerClick();
              }}
              style={{
                padding: "8px 12px",
                backgroundColor: "#f8fafc",
                borderTop: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                color: "#2563eb",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f1f5f9")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#f8fafc")}
            >
              <UserPlus size={14} />
              <span>+ Create & Add New Customer</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

