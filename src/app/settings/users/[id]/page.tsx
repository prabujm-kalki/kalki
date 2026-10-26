"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, Shield, MapPin, CheckCircle2, Building, Store, CheckSquare, Square } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSessionView } from "@/components/AppShell";

type Role = {
  id: string;
  name: string;
  code: string;
};

type LocationItem = {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
};

export default function UserRoleAssignmentPage() {
  const params = useParams();
  const userId = params.id as string;
  const { selected } = useSessionView();

  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [assignedRoles, setAssignedRoles] = useState<Role[]>([]);
  
  const [allLocations, setAllLocations] = useState<LocationItem[]>([]);
  const [assignedLocationIds, setAssignedLocationIds] = useState<string[]>([]);
  
  const [activeTab, setActiveTab] = useState<"roles" | "locations">("locations");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !selected?.organizationId) return;
    
    setLoading(true);
    const orgQuery = `?organizationId=${selected.organizationId}`;
    Promise.all([
      fetch(`/api/settings/roles${orgQuery}`).then((r) => r.json()),
      fetch(`/api/settings/users/${userId}/roles${orgQuery}`).then((r) => r.json()),
      fetch(`/api/settings/users/${userId}/locations${orgQuery}`).then((r) => r.json()),
    ])
      .then(([rolesData, assignedData, locsData]) => {
        setAvailableRoles(Array.isArray(rolesData) ? rolesData : []);
        setAssignedRoles(Array.isArray(assignedData) ? assignedData : []);
        setAllLocations(locsData.locations || []);
        setAssignedLocationIds(locsData.assignedLocationIds || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [userId, selected?.organizationId]);

  const hasRole = (roleId: string) => {
    return assignedRoles.some((r) => r.id === roleId);
  };

  const toggleRole = async (roleId: string, enabled: boolean) => {
    const role = availableRoles.find((r) => r.id === roleId);
    if (!role) return;

    if (enabled) {
      setAssignedRoles((prev) => [...prev, role]);
    } else {
      setAssignedRoles((prev) => prev.filter((r) => r.id !== roleId));
    }

    try {
      const orgQuery = selected?.organizationId ? `?organizationId=${selected.organizationId}` : "";
      const res = await fetch(`/api/settings/users/${userId}/roles${orgQuery}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId, enabled, organizationId: selected?.organizationId }),
      });
      if (!res.ok) throw new Error("Failed to update user role");
    } catch (err) {
      console.error(err);
      alert("Error saving role assignment. Reverting.");
      window.location.reload();
    }
  };

  const isLocationAssigned = (locId: string) => {
    return assignedLocationIds.includes(locId);
  };

  const isAllLocationsAssigned = allLocations.length > 0 && allLocations.every((l) => assignedLocationIds.includes(l.id));

  const toggleLocation = async (locId: string, enabled: boolean) => {
    if (enabled) {
      setAssignedLocationIds((prev) => [...prev, locId]);
    } else {
      setAssignedLocationIds((prev) => prev.filter((id) => id !== locId));
    }

    try {
      const orgQuery = selected?.organizationId ? `?organizationId=${selected.organizationId}` : "";
      const res = await fetch(`/api/settings/users/${userId}/locations${orgQuery}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId: locId, enabled, organizationId: selected?.organizationId }),
      });
      if (!res.ok) throw new Error("Failed to update location scope");
    } catch (err) {
      console.error(err);
      alert("Error saving location assignment. Reverting.");
      window.location.reload();
    }
  };

  const toggleAllLocations = async (grantAll: boolean) => {
    if (grantAll) {
      setAssignedLocationIds(allLocations.map((l) => l.id));
    } else {
      setAssignedLocationIds([]);
    }

    try {
      const orgQuery = selected?.organizationId ? `?organizationId=${selected.organizationId}` : "";
      const res = await fetch(`/api/settings/users/${userId}/locations${orgQuery}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allLocations: grantAll, organizationId: selected?.organizationId }),
      });
      if (!res.ok) throw new Error("Failed to update location scopes");
    } catch (err) {
      console.error(err);
      alert("Error saving location scope. Reverting.");
      window.location.reload();
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", paddingBottom: "2rem" }}>
        {/* Header Bar */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid #e2e8f0",
            padding: "1rem 1.5rem",
            backgroundColor: "#ffffff",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <Link
              href={`/settings/users${selected ? `?organizationId=${selected.organizationId}&locationId=${selected.locationId}` : ""}`}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "32px",
                height: "32px",
                borderRadius: "6px",
                backgroundColor: "#f1f5f9",
                color: "#475569",
                textDecoration: "none",
              }}
            >
              <ChevronLeft size={18} />
            </Link>
            <div>
              <h1 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600, color: "#1e293b" }}>
                User Access & Scope Management
              </h1>
              <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "#64748b" }}>
                Configure branch location operating scope (single, regional multi-branch, or enterprise-wide) and application roles.
              </p>
            </div>
          </div>
        </header>

        {/* Tab Controls */}
        <div style={{ padding: "1.25rem 1.5rem 0", maxWidth: "800px" }}>
          <div style={{ display: "flex", gap: "0.5rem", borderBottom: "1px solid #e2e8f0", paddingBottom: "2px" }}>
            <button
              type="button"
              onClick={() => setActiveTab("locations")}
              style={{
                padding: "0.6rem 1.1rem",
                background: activeTab === "locations" ? "#eff6ff" : "none",
                border: "none",
                borderRadius: "8px 8px 0 0",
                borderBottom: activeTab === "locations" ? "2px solid #2563eb" : "2px solid transparent",
                color: activeTab === "locations" ? "#2563eb" : "#64748b",
                fontWeight: activeTab === "locations" ? 600 : 500,
                fontSize: "0.9rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.45rem",
              }}
            >
              <MapPin size={16} />
              <span>Branch Location Scope</span>
              <span
                style={{
                  fontSize: "0.75rem",
                  backgroundColor: activeTab === "locations" ? "#dbeafe" : "#f1f5f9",
                  color: activeTab === "locations" ? "#1e40af" : "#64748b",
                  padding: "1px 6px",
                  borderRadius: "10px",
                  fontWeight: 700,
                }}
              >
                {assignedLocationIds.length} / {allLocations.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("roles")}
              style={{
                padding: "0.6rem 1.1rem",
                background: activeTab === "roles" ? "#eff6ff" : "none",
                border: "none",
                borderRadius: "8px 8px 0 0",
                borderBottom: activeTab === "roles" ? "2px solid #2563eb" : "2px solid transparent",
                color: activeTab === "roles" ? "#2563eb" : "#64748b",
                fontWeight: activeTab === "roles" ? 600 : 500,
                fontSize: "0.9rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.45rem",
              }}
            >
              <Shield size={16} />
              <span>Application Roles</span>
              <span
                style={{
                  fontSize: "0.75rem",
                  backgroundColor: activeTab === "roles" ? "#dbeafe" : "#f1f5f9",
                  color: activeTab === "roles" ? "#1e40af" : "#64748b",
                  padding: "1px 6px",
                  borderRadius: "10px",
                  fontWeight: 700,
                }}
              >
                {assignedRoles.length}
              </span>
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <main style={{ padding: "1.25rem 1.5rem", maxWidth: "800px" }}>
          {loading ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>Loading user access details...</div>
          ) : activeTab === "locations" ? (
            /* Locations Tab */
            <div
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                backgroundColor: "#ffffff",
                boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                overflow: "hidden",
              }}
            >
              {/* Scope Quick Select Header */}
              <div
                style={{
                  padding: "1rem 1.25rem",
                  backgroundColor: "#f8fafc",
                  borderBottom: "1px solid #e2e8f0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 600, color: "#1e293b" }}>
                    Operating Location Access
                  </h3>
                  <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "#64748b" }}>
                    Check each branch this user is authorized to operate in. Users with multiple branches (e.g. Regional Managers, Directors) can switch between assigned locations.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => toggleAllLocations(!isAllLocationsAssigned)}
                  style={{
                    border: "1px solid #cbd5e1",
                    background: isAllLocationsAssigned ? "#eff6ff" : "#ffffff",
                    color: isAllLocationsAssigned ? "#1d4ed8" : "#334155",
                    padding: "0.4rem 0.75rem",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                  }}
                >
                  {isAllLocationsAssigned ? <CheckSquare size={15} color="#2563eb" /> : <Square size={15} />}
                  <span>{isAllLocationsAssigned ? "All Branches (Corporate)" : "Grant All Branches"}</span>
                </button>
              </div>

              {allLocations.length === 0 ? (
                <div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>
                  No locations exist in this organization. Create locations under Organization Management first.
                </div>
              ) : (
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {allLocations.map((loc, idx) => {
                    const isAssigned = isLocationAssigned(loc.id);
                    const isHQ = loc.code === "HQ";

                    return (
                      <li
                        key={loc.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "1rem 1.25rem",
                          borderBottom: idx === allLocations.length - 1 ? "none" : "1px solid #f1f5f9",
                          backgroundColor: isAssigned ? "#fcfdfd" : "#ffffff",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          <div
                            style={{
                              width: "36px",
                              height: "36px",
                              borderRadius: "6px",
                              backgroundColor: isHQ ? "#fef3c7" : "#f1f5f9",
                              color: isHQ ? "#b45309" : "#475569",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {isHQ ? <Building size={18} /> : <Store size={18} />}
                          </div>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                              <span style={{ fontWeight: 600, fontSize: "0.92rem", color: "#1e293b" }}>{loc.name}</span>
                              <span
                                style={{
                                  fontSize: "0.7rem",
                                  fontFamily: "monospace",
                                  backgroundColor: "#e2e8f0",
                                  color: "#334155",
                                  padding: "1px 5px",
                                  borderRadius: "4px",
                                  fontWeight: 600,
                                }}
                              >
                                {loc.code}
                              </span>
                              {isHQ && (
                                <span
                                  style={{
                                    fontSize: "0.68rem",
                                    backgroundColor: "#fef3c7",
                                    color: "#92400e",
                                    padding: "1px 6px",
                                    borderRadius: "4px",
                                    fontWeight: 700,
                                  }}
                                >
                                  Corporate HQ
                                </span>
                              )}
                            </div>
                            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                              {isAssigned ? "Authorized for this branch" : "No branch access"}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleLocation(loc.id, !isAssigned)}
                          style={{
                            border: "none",
                            borderRadius: "20px",
                            padding: "0.35rem 0.85rem",
                            cursor: "pointer",
                            fontSize: "0.8rem",
                            fontWeight: 600,
                            display: "flex",
                            alignItems: "center",
                            gap: "0.35rem",
                            backgroundColor: isAssigned ? "#dcfce7" : "#f1f5f9",
                            color: isAssigned ? "#15803d" : "#64748b",
                            transition: "all 0.15s ease",
                          }}
                        >
                          {isAssigned && <CheckCircle2 size={13} color="#15803d" />}
                          <span>{isAssigned ? "Assigned" : "Assign"}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ) : (
            /* Roles Tab */
            <div
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                backgroundColor: "#ffffff",
                boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "1rem 1.25rem",
                  backgroundColor: "#f8fafc",
                  borderBottom: "1px solid #e2e8f0",
                }}
              >
                <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 600, color: "#1e293b" }}>
                  Assigned Application Roles
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "#64748b" }}>
                  Assign role definitions to grant functional permissions (e.g. Executive Director, Regional Manager, Store Manager, Cashier).
                </p>
              </div>

              {availableRoles.length === 0 ? (
                <div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>
                  No application roles exist in the system. Create roles first.
                </div>
              ) : (
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {availableRoles.map((role, idx) => {
                    const assigned = hasRole(role.id);
                    return (
                      <li
                        key={role.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "1rem 1.25rem",
                          borderBottom: idx === availableRoles.length - 1 ? "none" : "1px solid #f1f5f9",
                        }}
                      >
                        <div>
                          <p style={{ margin: 0, fontWeight: 600, fontSize: "0.92rem", color: "#1e293b" }}>{role.name}</p>
                          <span style={{ fontSize: "0.75rem", fontFamily: "monospace", color: "#64748b" }}>{role.code}</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleRole(role.id, !assigned)}
                          style={{
                            border: "none",
                            borderRadius: "20px",
                            padding: "0.35rem 0.85rem",
                            cursor: "pointer",
                            fontSize: "0.8rem",
                            fontWeight: 600,
                            display: "flex",
                            alignItems: "center",
                            gap: "0.35rem",
                            backgroundColor: assigned ? "#dbeafe" : "#f1f5f9",
                            color: assigned ? "#1e40af" : "#64748b",
                            transition: "all 0.15s ease",
                          }}
                        >
                          {assigned && <CheckCircle2 size={13} color="#1e40af" />}
                          <span>{assigned ? "Granted" : "Grant"}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </main>
      </div>
  );
}
