"use client";

import { useEffect, useState } from "react";
import { Users, ShieldCheck, Phone, ArrowRight, Loader2, MapPin } from "lucide-react";
import Link from "next/link";
import { apiGet } from "@/lib/api";
import { useSessionView } from "@/components/AppShell";

type User = {
  id: string;
  name: string | null;
  image?: string | null;
  phone?: string | null;
  photoUrl?: string | null;
  employeeCode?: string | null;
  locationId?: string | null;
  locationName?: string | null;
};

export default function UsersSettingsPage() {
  const { selected } = useSessionView();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const query = selected ? `?organizationId=${selected.organizationId}&locationId=${selected.locationId}` : "";

  const loadUsers = () => {
    if (!selected?.organizationId) return;
    setLoading(true);
    apiGet<User[]>(`/api/settings/users?organizationId=${selected.organizationId}`)
      .then((data) => {
        setUsers(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setUsers([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (selected?.organizationId) {
      loadUsers();
    }
  }, [selected?.organizationId]);

  return (
    <div style={{ paddingBottom: "2.5rem" }}>
      {/* Kalki Standard Header */}
      <div className="kalki-page-header">
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              backgroundColor: "var(--kalki-primary, #7c3a27)",
              padding: "12px",
              borderRadius: "8px",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Users size={28} strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="kalki-page-title">Enterprise User Management</h1>
            <p className="kalki-page-description">
              Assign corporate-wide or multi-branch location scopes and functional security roles.
            </p>
          </div>
        </div>
      </div>

      {/* Kalki Standard Card Container */}
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "10px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
          overflow: "hidden",
        }}
      >
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
            <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "#1e293b" }}>
              Organization Users ({users.length})
            </span>
            <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "#64748b" }}>
              Active users and personnel assigned to <strong>{selected?.organizationName || "this organization"}</strong>.
            </p>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#64748b", display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem" }}>
            <Loader2 size={18} className="animate-spin" />
            <span>Loading user directory...</span>
          </div>
        ) : users.length === 0 ? (
          <div style={{ padding: "3.5rem 2rem", textAlign: "center", color: "#64748b" }}>
            <div style={{ width: "42px", height: "42px", borderRadius: "50%", backgroundColor: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 0.75rem auto", color: "#94a3b8" }}>
              <Users size={22} />
            </div>
            <div style={{ fontWeight: 600, color: "#334155", marginBottom: "4px" }}>No organization users found</div>
            <div style={{ fontSize: "0.82rem", color: "#64748b" }}>
              No staff or accounts have been assigned to this organization yet.
            </div>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left", color: "#475569" }}>
                <th style={{ padding: "0.75rem 1.25rem", fontWeight: 600 }}>User Profile</th>
                <th style={{ padding: "0.75rem 1.25rem", fontWeight: 600 }}>Contact / Mobile</th>
                <th style={{ padding: "0.75rem 1.25rem", fontWeight: 600 }}>Branch Location</th>
                <th style={{ padding: "0.75rem 1.25rem", fontWeight: 600, textAlign: "right" }}>Access Governance</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, idx) => {
                const isOwner = user.name?.toLowerCase().includes("owner") || user.employeeCode?.includes("OWNER");
                const profileImg = user.photoUrl || user.image;

                return (
                  <tr
                    key={user.id}
                    style={{
                      borderBottom: idx === users.length - 1 ? "none" : "1px solid #f1f5f9",
                      transition: "background-color 0.1s ease",
                    }}
                  >
                    <td style={{ padding: "0.85rem 1.25rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        {profileImg ? (
                          <img
                            src={profileImg}
                            alt={user.name || "User"}
                            style={{
                              width: "36px",
                              height: "36px",
                              borderRadius: "50%",
                              objectFit: "cover",
                              border: "1px solid #e2e8f0",
                              flexShrink: 0,
                            }}
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: "36px",
                              height: "36px",
                              borderRadius: "50%",
                              backgroundColor: isOwner ? "#fef3c7" : "#eff6ff",
                              color: isOwner ? "#b45309" : "#1d4ed8",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 700,
                              fontSize: "0.85rem",
                              flexShrink: 0,
                            }}
                          >
                            {(user.name || "U").charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: 600, color: "#1e293b", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            <span>{user.name || "Unnamed User"}</span>
                            {isOwner && (
                              <span
                                style={{
                                  fontSize: "0.65rem",
                                  fontWeight: 700,
                                  backgroundColor: "#fef3c7",
                                  color: "#b45309",
                                  padding: "1px 6px",
                                  borderRadius: "4px",
                                }}
                              >
                                System Owner
                              </span>
                            )}
                          </div>
                          {user.employeeCode && (
                            <span style={{ fontSize: "0.75rem", color: "#64748b", fontFamily: "monospace" }}>
                              {user.employeeCode}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: "0.85rem 1.25rem", color: "#475569" }}>
                      {user.phone ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                          <Phone size={14} color="#64748b" />
                          <span style={{ fontWeight: 500, fontFamily: "inherit" }}>{user.phone}</span>
                        </div>
                      ) : (
                        <span style={{ color: "#94a3b8", fontSize: "0.82rem" }}>—</span>
                      )}
                    </td>

                    <td style={{ padding: "0.85rem 1.25rem", color: "#475569" }}>
                      {user.locationName ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                          <MapPin size={14} color="#059669" />
                          <span style={{ fontWeight: 500, color: "#065f46" }}>{user.locationName}</span>
                        </div>
                      ) : (
                        <span style={{ color: "#64748b", fontSize: "0.8rem", fontStyle: "italic" }}>All Branches / HQ</span>
                      )}
                    </td>

                    <td style={{ padding: "0.85rem 1.25rem", textAlign: "right" }}>
                      <Link
                        href={`/settings/users/${user.id}${query}`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.35rem",
                          padding: "0.4rem 0.85rem",
                          borderRadius: "6px",
                          backgroundColor: "#eff6ff",
                          color: "#1d4ed8",
                          border: "1px solid #bfdbfe",
                          fontSize: "0.82rem",
                          fontWeight: 600,
                          textDecoration: "none",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <ShieldCheck size={14} />
                        <span>Manage Access & Scope</span>
                        <ArrowRight size={13} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
