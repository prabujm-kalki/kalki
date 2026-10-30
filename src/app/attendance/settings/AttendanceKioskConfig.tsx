"use client";

import { useState } from "react";
import { Camera, ShieldCheck, ShieldAlert, Save, CheckCircle2 } from "lucide-react";
import { updateAttendanceSettings } from "@/domains/attendance/actions";
import { useToast } from "@/components/ui/Toast";

interface AttendanceKioskConfigProps {
  organizationId: string;
  locationId: string;
  initialRequireWallMarker: boolean;
}

export function AttendanceKioskConfig({
  organizationId,
  locationId,
  initialRequireWallMarker,
}: AttendanceKioskConfigProps) {
  const [requireWallMarker, setRequireWallMarker] = useState(initialRequireWallMarker);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const { addToast } = useToast();

  const handleSave = async () => {
    setIsSaving(true);
    setSavedSuccess(false);
    try {
      const res = await updateAttendanceSettings(organizationId, locationId, {
        requireWallMarker,
      });
      if (res.success) {
        setSavedSuccess(true);
        addToast({
          type: "success",
          message: `Selfie punch wall marker requirement is now ${requireWallMarker ? "Enabled" : "Disabled"}.`,
        });
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
      addToast({
        type: "error",
        message: err instanceof Error ? err.message : "An unexpected error occurred.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="card"
      style={{
        background: "#ffffff",
        border: "1px solid var(--kalki-border, #e2e8f0)",
        borderRadius: "12px",
        padding: "1.75rem",
        marginBottom: "2rem",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "8px",
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#16a34a",
            }}
          >
            <Camera size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0, color: "#0f172a" }}>
              Selfie Punch & Kiosk Configuration
            </h2>
            <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.875rem", color: "#64748b" }}>
              Configure anti-spoofing and marker validation rules for this branch location.
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.55rem 1.15rem",
            borderRadius: "6px",
            background: savedSuccess ? "#16a34a" : "#0f172a",
            color: "#ffffff",
            border: "none",
            fontSize: "0.875rem",
            fontWeight: 600,
            cursor: isSaving ? "not-allowed" : "pointer",
            transition: "background 0.2s ease",
            opacity: isSaving ? 0.7 : 1,
          }}
        >
          {savedSuccess ? (
            <>
              <CheckCircle2 size={16} /> Saved!
            </>
          ) : (
            <>
              <Save size={16} /> {isSaving ? "Saving..." : "Save Kiosk Settings"}
            </>
          )}
        </button>
      </div>

      <div
        style={{
          borderTop: "1px solid #f1f5f9",
          paddingTop: "1.25rem",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "1.5rem",
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: "1 1 350px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
            <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "#1e293b" }}>
              Physical Wall Marker (ArUco Reference) Verification
            </span>
            {requireWallMarker ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.25rem",
                  fontSize: "0.75rem",
                  padding: "0.15rem 0.5rem",
                  borderRadius: "9999px",
                  background: "#dcfce7",
                  color: "#15803d",
                  fontWeight: 600,
                }}
              >
                <ShieldCheck size={12} /> Active
              </span>
            ) : (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.25rem",
                  fontSize: "0.75rem",
                  padding: "0.15rem 0.5rem",
                  borderRadius: "9999px",
                  background: "#f1f5f9",
                  color: "#64748b",
                  fontWeight: 600,
                }}
              >
                <ShieldAlert size={12} /> Disabled
              </span>
            )}
          </div>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b", lineHeight: 1.5 }}>
            When enabled, employees must stand in front of the printed branch wall marker to punch in or out.
            When disabled, employees can punch immediately with facial recognition alone (legacy version).
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <label
            style={{
              position: "relative",
              display: "inline-block",
              width: "48px",
              height: "26px",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={requireWallMarker}
              onChange={(e) => setRequireWallMarker(e.target.checked)}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: requireWallMarker ? "#16a34a" : "#cbd5e1",
                borderRadius: "34px",
                transition: ".3s",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  content: '""',
                  height: "20px",
                  width: "20px",
                  left: requireWallMarker ? "24px" : "3px",
                  bottom: "3px",
                  backgroundColor: "white",
                  borderRadius: "50%",
                  transition: ".3s",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                }}
              />
            </span>
          </label>
          <span style={{ fontSize: "0.875rem", fontWeight: 600, color: requireWallMarker ? "#16a34a" : "#64748b" }}>
            {requireWallMarker ? "Enabled" : "Disabled"}
          </span>
        </div>
      </div>
    </div>
  );
}
