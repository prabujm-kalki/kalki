"use client";

import { useEffect, useState, useRef } from "react";
import { 
  Building2, Plus, Edit2, CheckCircle2, XCircle, MapPin, 
  Loader2, Upload, Image as ImageIcon, ChevronRight, Store, 
  Pencil, Power, ChevronDown, ChevronUp 
} from "lucide-react";
import { KalkiButton } from "@/components/ui/KalkiButton";
import { KalkiInput } from "@/components/ui/KalkiInput";
import { useToast } from "@/components/ui/Toast";

interface LocationInfo {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  isActive: boolean;
}

interface OrganizationInfo {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  logoUrl?: string | null;
  createdAt: string;
  locations?: LocationInfo[];
  locationsCount?: number;
}

export function OrganizationManagementSection() {
  const { addToast } = useToast();
  const [organizations, setOrganizations] = useState<OrganizationInfo[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Organization modal states
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [editingOrg, setEditingOrg] = useState<OrganizationInfo | null>(null);
  const [orgName, setOrgName] = useState("");
  const [orgCode, setOrgCode] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [defaultLocName, setDefaultLocName] = useState("");
  const [defaultLocCode, setDefaultLocCode] = useState("");
  const [submittingOrg, setSubmittingOrg] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [orgFormError, setOrgFormError] = useState<string | null>(null);

  // Expanded organizations for locations management
  const [expandedOrgId, setExpandedOrgId] = useState<string | null>(null);

  // Location modal states
  const [showLocModal, setShowLocModal] = useState(false);
  const [activeOrgForLocation, setActiveOrgForLocation] = useState<OrganizationInfo | null>(null);
  const [editingLocation, setEditingLocation] = useState<LocationInfo | null>(null);
  const [locName, setLocName] = useState("");
  const [locCode, setLocCode] = useState("");
  const [locIsActive, setLocIsActive] = useState(true);
  const [submittingLoc, setSubmittingLoc] = useState(false);
  const [locFormError, setLocFormError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  async function loadOrganizations() {
    try {
      setLoading(true);
      const res = await fetch("/api/organizations", { cache: "no-store" });
      if (!res.ok) {
        throw new Error("Failed to load organizations");
      }
      const data = await res.json();
      const orgList: OrganizationInfo[] = data.organizations || [];
      setOrganizations(orgList);
      
      // Auto-expand first organization if none expanded
      if (!expandedOrgId && orgList.length > 0) {
        setExpandedOrgId(orgList[0].id);
      }
    } catch (e: any) {
      console.error(e);
      addToast({ type: "error", message: e.message || "Failed to load organizations" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrganizations();
  }, []);

  function openCreateOrgModal() {
    setOrgName("");
    setOrgCode("");
    setLogoUrl("");
    setDefaultLocName("");
    setDefaultLocCode("");
    setOrgFormError(null);
    setEditingOrg(null);
    setShowOrgModal(true);
  }

  function openEditOrgModal(org: OrganizationInfo) {
    setEditingOrg(org);
    setOrgName(org.name);
    setOrgCode(org.code);
    setLogoUrl(org.logoUrl || "");
    setDefaultLocName("");
    setDefaultLocCode("");
    setOrgFormError(null);
    setShowOrgModal(true);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setOrgFormError("Please select a valid image file (PNG, JPG, SVG, WebP).");
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      setOrgFormError("Logo file size must be less than 3MB.");
      return;
    }

    setUploadingLogo(true);
    setOrgFormError(null);

    try {
      const formData = new FormData();
      formData.append("logo", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload logo image");

      if (data.urls?.logo) {
        setLogoUrl(data.urls.logo);
        addToast({ type: "success", message: "Logo image uploaded successfully." });
      }
    } catch (err: any) {
      console.error(err);
      setOrgFormError(err.message || "Failed to upload logo.");
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleSaveOrg(e: React.FormEvent) {
    e.preventDefault();
    setOrgFormError(null);

    if (!orgName.trim()) {
      setOrgFormError("Organization name is required.");
      return;
    }

    setSubmittingOrg(true);
    try {
      if (editingOrg) {
        const res = await fetch(`/api/organizations/${editingOrg.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: orgName.trim(),
            code: orgCode.trim(),
            logoUrl: logoUrl.trim() || null,
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Failed to update organization");

        addToast({ type: "success", message: `Organization "${orgName.trim()}" updated successfully.` });
      } else {
        const res = await fetch("/api/organizations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: orgName.trim(),
            code: orgCode.trim(),
            logoUrl: logoUrl.trim() || null,
            defaultLocationName: defaultLocName.trim() || undefined,
            defaultLocationCode: defaultLocCode.trim() || undefined,
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Failed to create organization");

        addToast({ type: "success", message: `Organization "${orgName.trim()}" created successfully.` });
      }

      setShowOrgModal(false);
      await loadOrganizations();
      // Reload page so global AppShell header immediately includes the new organization in the dropdown
      window.location.reload();
    } catch (err: any) {
      setOrgFormError(err.message || "An error occurred while saving organization.");
    } finally {
      setSubmittingOrg(false);
    }
  }

  // --- Location Management Functions ---
  function openAddLocationModal(org: OrganizationInfo) {
    setActiveOrgForLocation(org);
    setEditingLocation(null);
    setLocName("");
    setLocCode("");
    setLocIsActive(true);
    setLocFormError(null);
    setShowLocModal(true);
  }

  function openEditLocationModal(org: OrganizationInfo, loc: LocationInfo) {
    setActiveOrgForLocation(org);
    setEditingLocation(loc);
    setLocName(loc.name);
    setLocCode(loc.code);
    setLocIsActive(loc.isActive);
    setLocFormError(null);
    setShowLocModal(true);
  }

  async function handleSaveLocation(e: React.FormEvent) {
    e.preventDefault();
    if (!activeOrgForLocation) return;
    setLocFormError(null);

    if (!locName.trim()) {
      setLocFormError("Location name is required.");
      return;
    }
    if (!locCode.trim()) {
      setLocFormError("Location code is required.");
      return;
    }

    setSubmittingLoc(true);
    try {
      if (editingLocation) {
        const res = await fetch(`/api/locations?id=${editingLocation.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: locName.trim(),
            code: locCode.trim().toUpperCase(),
            isActive: locIsActive,
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Failed to update location");

        addToast({ type: "success", message: `Location "${locName.trim()}" updated.` });
      } else {
        const res = await fetch("/api/locations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            organizationId: activeOrgForLocation.id,
            name: locName.trim(),
            code: locCode.trim().toUpperCase(),
            isActive: locIsActive,
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Failed to add location");

        addToast({ type: "success", message: `Location "${locName.trim()}" created.` });
      }

      setShowLocModal(false);
      loadOrganizations();
    } catch (err: any) {
      setLocFormError(err.message || "Failed to save location.");
    } finally {
      setSubmittingLoc(false);
    }
  }

  async function toggleLocationStatus(org: OrganizationInfo, loc: LocationInfo) {
    const actionLabel = loc.isActive ? "deactivate" : "activate";
    if (!confirm(`Are you sure you want to ${actionLabel} location "${loc.name}" (${loc.code})?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/locations?id=${loc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !loc.isActive }),
      });
      if (!res.ok) throw new Error(`Failed to ${actionLabel} location`);
      addToast({ type: "success", message: `Location "${loc.name}" is now ${!loc.isActive ? "Active" : "Inactive"}.` });
      loadOrganizations();
    } catch (err: any) {
      addToast({ type: "error", message: err.message || `Failed to ${actionLabel} location` });
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
            Manage company legal entities, brand logos, and branch locations. Only System Owners have authority over organizational structure.
          </p>
        </div>
        <KalkiButton
          variant="primary"
          size="sm"
          onClick={openCreateOrgModal}
          style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
        >
          <Plus size={15} />
          Create Organization
        </KalkiButton>
      </div>

      {loading ? (
        <div style={{ padding: "2rem", display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem", color: "#64748b" }}>
          <Loader2 size={18} className="animate-spin" />
          <span>Loading organizations and locations...</span>
        </div>
      ) : organizations.length === 0 ? (
        <div style={{ padding: "2rem", textAlign: "center", color: "#64748b", border: "1px dashed #cbd5e1", borderRadius: "8px" }}>
          No organizations configured yet.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {organizations.map((org) => {
            const isExpanded = expandedOrgId === org.id;

            return (
              <div
                key={org.id}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  backgroundColor: "#ffffff",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                  overflow: "hidden",
                }}
              >
                {/* Organization Header Bar */}
                <div
                  style={{
                    padding: "1rem 1.25rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    backgroundColor: isExpanded ? "#f8fafc" : "#ffffff",
                    borderBottom: isExpanded ? "1px solid #e2e8f0" : "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                    <div
                      style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "8px",
                        backgroundColor: org.logoUrl ? "#ffffff" : "#fef3c7",
                        border: "1px solid #e2e8f0",
                        color: "#b45309",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                        flexShrink: 0,
                      }}
                    >
                      {org.logoUrl ? (
                        <img
                          src={org.logoUrl}
                          alt={org.name}
                          style={{ width: "100%", height: "100%", objectFit: "contain", padding: "2px" }}
                          onError={(e) => { e.currentTarget.style.display = "none"; }}
                        />
                      ) : (
                        <Building2 size={24} />
                      )}
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 600, color: "#1e293b" }}>{org.name}</h4>
                        <span
                          style={{
                            fontSize: "0.7rem",
                            fontFamily: "monospace",
                            backgroundColor: "#e2e8f0",
                            color: "#334155",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            fontWeight: 600,
                          }}
                        >
                          {org.code}
                        </span>
                        {org.isActive ? (
                          <span style={{ fontSize: "0.7rem", color: "#16a34a", fontWeight: 600, display: "flex", alignItems: "center", gap: "2px" }}>
                            <CheckCircle2 size={12} /> Active
                          </span>
                        ) : (
                          <span style={{ fontSize: "0.7rem", color: "#dc2626", fontWeight: 600, display: "flex", alignItems: "center", gap: "2px" }}>
                            <XCircle size={12} /> Inactive
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: "0.78rem", color: "#64748b" }}>
                        {org.locationsCount ?? org.locations?.length ?? 0} Operating Branch Locations
                      </span>
                    </div>
                  </div>

                  {/* Actions on Organization Level */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <button
                      type="button"
                      onClick={() => openEditOrgModal(org)}
                      style={{
                        border: "1px solid #cbd5e1",
                        background: "#ffffff",
                        color: "#475569",
                        padding: "0.35rem 0.65rem",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "0.8rem",
                        fontWeight: 500,
                        display: "flex",
                        alignItems: "center",
                        gap: "0.3rem",
                      }}
                    >
                      <Edit2 size={13} />
                      <span>Edit Branding & Info</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setExpandedOrgId(isExpanded ? null : org.id)}
                      style={{
                        border: "1px solid #cbd5e1",
                        background: isExpanded ? "#e2e8f0" : "#ffffff",
                        color: "#1e293b",
                        padding: "0.35rem 0.75rem",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        gap: "0.35rem",
                      }}
                    >
                      <Store size={14} color="#2563eb" />
                      <span>{isExpanded ? "Hide Locations" : "Manage Locations"}</span>
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>
                </div>

                {/* Expanded Branch Locations Management Table */}
                {isExpanded && (
                  <div style={{ padding: "1.25rem", backgroundColor: "#fafaf9" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
                      <div>
                        <h5 style={{ margin: 0, fontSize: "0.88rem", fontWeight: 600, color: "#334155", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                          <Store size={15} color="#d4af37" />
                          Operating Branch Locations for {org.name}
                        </h5>
                        <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "#64748b" }}>
                          Physical stores, kitchen outlets, warehouses, and corporate facilities under this legal entity.
                        </p>
                      </div>

                      <KalkiButton
                        variant="primary"
                        size="sm"
                        onClick={() => openAddLocationModal(org)}
                        style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.8rem" }}
                      >
                        <Plus size={14} />
                        Add Location / Branch
                      </KalkiButton>
                    </div>

                    {(!org.locations || org.locations.length === 0) ? (
                      <div style={{ padding: "1.5rem", textAlign: "center", color: "#64748b", border: "1px dashed #cbd5e1", borderRadius: "6px", backgroundColor: "#ffffff" }}>
                        No locations configured for this organization. Click "Add Location / Branch" above to create one.
                      </div>
                    ) : (
                      <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden", backgroundColor: "#ffffff" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                          <thead>
                            <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left", color: "#475569" }}>
                              <th style={{ padding: "0.6rem 1rem", fontWeight: 600 }}>Location Name</th>
                              <th style={{ padding: "0.6rem 1rem", fontWeight: 600 }}>Branch Code</th>
                              <th style={{ padding: "0.6rem 1rem", fontWeight: 600 }}>Status</th>
                              <th style={{ padding: "0.6rem 1rem", fontWeight: 600, textAlign: "right" }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {org.locations.map((loc, idx) => (
                              <tr 
                                key={loc.id} 
                                style={{ 
                                  borderBottom: idx === org.locations!.length - 1 ? "none" : "1px solid #f1f5f9",
                                  backgroundColor: loc.isActive ? "transparent" : "#fafafa" 
                                }}
                              >
                                <td style={{ padding: "0.65rem 1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                  <MapPin size={15} color={loc.isActive ? "#d4af37" : "#94a3b8"} />
                                  <span style={{ fontWeight: 500, color: loc.isActive ? "#1e293b" : "#94a3b8" }}>
                                    {loc.name}
                                  </span>
                                </td>
                                <td style={{ padding: "0.65rem 1rem", fontFamily: "monospace", fontWeight: 600, color: "#475569" }}>
                                  {loc.code}
                                </td>
                                <td style={{ padding: "0.65rem 1rem" }}>
                                  {loc.isActive ? (
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#16a34a", fontSize: "0.78rem", fontWeight: 600 }}>
                                      <CheckCircle2 size={13} /> Active
                                    </span>
                                  ) : (
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#dc2626", fontSize: "0.78rem", fontWeight: 600 }}>
                                      <XCircle size={13} /> Inactive
                                    </span>
                                  )}
                                </td>
                                <td style={{ padding: "0.65rem 1rem", textAlign: "right" }}>
                                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.4rem" }}>
                                    <button
                                      type="button"
                                      onClick={() => openEditLocationModal(org, loc)}
                                      style={{
                                        border: "1px solid #e2e8f0",
                                        background: "#f8fafc",
                                        color: "#334155",
                                        padding: "0.3rem 0.55rem",
                                        borderRadius: "4px",
                                        cursor: "pointer",
                                        fontSize: "0.75rem",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "0.25rem",
                                      }}
                                    >
                                      <Pencil size={12} />
                                      <span>Edit</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => toggleLocationStatus(org, loc)}
                                      style={{
                                        border: "1px solid",
                                        borderColor: loc.isActive ? "#fecaca" : "#bbf7d0",
                                        background: loc.isActive ? "#fef2f2" : "#f0fdf4",
                                        color: loc.isActive ? "#dc2626" : "#16a34a",
                                        padding: "0.3rem 0.55rem",
                                        borderRadius: "4px",
                                        cursor: "pointer",
                                        fontSize: "0.75rem",
                                        fontWeight: 500,
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "0.25rem",
                                      }}
                                    >
                                      <Power size={12} />
                                      <span>{loc.isActive ? "Deactivate" : "Activate"}</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Organization Create / Edit Modal */}
      {showOrgModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            backdropFilter: "blur(2px)",
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "10px",
              width: "100%",
              maxWidth: "480px",
              padding: "1.5rem",
              boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600, color: "#1e293b" }}>
                {editingOrg ? "Edit Organization & Branding" : "Create New Organization"}
              </h3>
              <button
                type="button"
                onClick={() => setShowOrgModal(false)}
                style={{ background: "none", border: "none", fontSize: "1.25rem", color: "#64748b", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            {orgFormError && (
              <div
                style={{
                  padding: "0.6rem 0.8rem",
                  backgroundColor: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "6px",
                  color: "#b91c1c",
                  fontSize: "0.85rem",
                }}
              >
                {orgFormError}
              </div>
            )}

            <form onSubmit={handleSaveOrg} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <KalkiInput
                label="Organization Name"
                placeholder="e.g. Kalki Groups, Horizon Retail"
                value={orgName}
                onChange={(e) => {
                  setOrgName(e.target.value);
                  if (!editingOrg && !orgCode) {
                    setOrgCode(e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 10));
                  }
                }}
                required
              />

              <KalkiInput
                label="Organization Code"
                placeholder="e.g. KALKI, HORIZON"
                value={orgCode}
                onChange={(e) => setOrgCode(e.target.value.toUpperCase())}
                required
              />

              {/* Logo Upload Section */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <label className="kalki-label" style={{ margin: 0 }}>
                  Organization Logo (Appears on top-left of application)
                </label>
                
                <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                  <div
                    style={{
                      width: "56px",
                      height: "56px",
                      borderRadius: "8px",
                      border: "1px dashed #cbd5e1",
                      backgroundColor: "#f8fafc",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      flexShrink: 0,
                    }}
                  >
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt="Logo Preview"
                        style={{ width: "100%", height: "100%", objectFit: "contain", padding: "4px" }}
                      />
                    ) : (
                      <ImageIcon size={24} color="#94a3b8" />
                    )}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", flex: 1 }}>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        style={{ display: "none" }}
                        onChange={handleFileUpload}
                      />
                      <KalkiButton
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingLogo}
                        style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}
                      >
                        {uploadingLogo ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                        <span>{logoUrl ? "Change Logo" : "Upload Logo"}</span>
                      </KalkiButton>

                      {logoUrl && (
                        <button
                          type="button"
                          onClick={() => setLogoUrl("")}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#ef4444",
                            fontSize: "0.8rem",
                            cursor: "pointer",
                            textDecoration: "underline",
                          }}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <span style={{ fontSize: "0.72rem", color: "#64748b" }}>
                      Recommended: Transparent PNG or SVG.
                    </span>
                  </div>
                </div>
              </div>

              {!editingOrg && (
                <div
                  style={{
                    backgroundColor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "6px",
                    padding: "0.85rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem",
                  }}
                >
                  <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#475569" }}>
                    Initial Primary Location (Optional)
                  </span>
                  <KalkiInput
                    label="Location Name"
                    placeholder="e.g. Head Office, Central Branch"
                    value={defaultLocName}
                    onChange={(e) => {
                      setDefaultLocName(e.target.value);
                      if (!defaultLocCode) {
                        setDefaultLocCode(e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 6));
                      }
                    }}
                  />
                  <KalkiInput
                    label="Location Code"
                    placeholder="e.g. HQ, CBR"
                    value={defaultLocCode}
                    onChange={(e) => setDefaultLocCode(e.target.value.toUpperCase())}
                  />
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem" }}>
                <KalkiButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowOrgModal(false)}
                  disabled={submittingOrg || uploadingLogo}
                >
                  Cancel
                </KalkiButton>
                <KalkiButton
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={submittingOrg}
                  disabled={uploadingLogo}
                >
                  {editingOrg ? "Save Changes" : "Create Organization"}
                </KalkiButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Location / Branch Create / Edit Modal */}
      {showLocModal && activeOrgForLocation && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            backdropFilter: "blur(2px)",
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "10px",
              width: "100%",
              maxWidth: "440px",
              padding: "1.5rem",
              boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 600, color: "#1e293b" }}>
                  {editingLocation ? "Edit Branch Location" : "Add Branch Location"}
                </h3>
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                  Organization: {activeOrgForLocation.name} ({activeOrgForLocation.code})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowLocModal(false)}
                style={{ background: "none", border: "none", fontSize: "1.25rem", color: "#64748b", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            {locFormError && (
              <div
                style={{
                  padding: "0.6rem 0.8rem",
                  backgroundColor: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "6px",
                  color: "#b91c1c",
                  fontSize: "0.85rem",
                }}
              >
                {locFormError}
              </div>
            )}

            <form onSubmit={handleSaveLocation} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <KalkiInput
                label="Location Name"
                placeholder="e.g. Avalpoondurai Restaurant, Central Warehouse"
                value={locName}
                onChange={(e) => {
                  setLocName(e.target.value);
                  if (!editingLocation && !locCode) {
                    setLocCode(e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 6));
                  }
                }}
                required
              />

              <KalkiInput
                label="Branch / Location Code"
                placeholder="e.g. APR, AKP, WH1"
                value={locCode}
                onChange={(e) => setLocCode(e.target.value.toUpperCase())}
                required
              />

              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input
                  type="checkbox"
                  id="locIsActive"
                  checked={locIsActive}
                  onChange={(e) => setLocIsActive(e.target.checked)}
                  style={{ width: "16px", height: "16px", cursor: "pointer" }}
                />
                <label htmlFor="locIsActive" style={{ fontSize: "0.85rem", color: "#334155", cursor: "pointer" }}>
                  Location is actively operating
                </label>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem" }}>
                <KalkiButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowLocModal(false)}
                  disabled={submittingLoc}
                >
                  Cancel
                </KalkiButton>
                <KalkiButton
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={submittingLoc}
                >
                  {editingLocation ? "Save Changes" : "Create Location"}
                </KalkiButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
