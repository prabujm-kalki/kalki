"use client";

import React, { useState, useEffect } from "react";
import { KalkiModal } from "@/components/ui/KalkiModal";
import { apiGet, apiSend } from "@/lib/api";
import { ArrowRightLeft, Building2, Calendar, Clock, Briefcase, CheckCircle2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface LocationOption {
  id: string;
  name: string;
  code: string;
}

interface ShiftOption {
  id: string;
  name?: string;
  shift_name?: string;
  startTime: string;
  endTime: string;
}

interface RoleOption {
  id: string;
  name: string;
}

export interface EmployeeTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  currentLocationId: string;
  organizationId: string;
  onSuccess: () => void;
}

export function EmployeeTransferModal({
  isOpen,
  onClose,
  employeeId,
  employeeName,
  employeeCode,
  currentLocationId,
  organizationId,
  onSuccess,
}: EmployeeTransferModalProps) {
  const { addToast } = useToast();
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [targetLocationId, setTargetLocationId] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [shifts, setShifts] = useState<ShiftOption[]>([]);
  const [targetShiftId, setTargetShiftId] = useState("");
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [targetRoleId, setTargetRoleId] = useState("");
  const [syncUserAccess, setSyncUserAccess] = useState(true);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch available locations
  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setLoading(true);

    apiGet<{ locations: LocationOption[] }>(`/api/locations?organizationId=${organizationId}`)
      .then((res) => {
        const otherLocations = (res.locations || []).filter((l) => l.id !== currentLocationId);
        setLocations(otherLocations);
        if (otherLocations.length > 0) {
          setTargetLocationId(otherLocations[0].id);
        }
      })
      .catch((err) => {
        console.error("Failed to load locations:", err);
        setError("Failed to load restaurant locations.");
      })
      .finally(() => setLoading(false));
  }, [isOpen, organizationId, currentLocationId]);

  // Fetch shifts & roles when targetLocationId changes
  useEffect(() => {
    if (!targetLocationId || !organizationId) return;

    // Load shifts for target location
    import("@/domains/settings/shiftActions")
      .then((m) => m.getShifts(organizationId, targetLocationId))
      .then((shiftData) => {
        const list = (shiftData || []) as any[];
        setShifts(list);
        if (list.length > 0) {
          setTargetShiftId(list[0].id);
        } else {
          setTargetShiftId("");
        }
      })
      .catch((err) => console.error("Failed to load shifts:", err));

    // Load roles for target location
    apiGet<{ roles: RoleOption[] }>(`/api/role-definitions?organizationId=${organizationId}&locationId=${targetLocationId}`)
      .then((res) => {
        const roleList = res.roles || [];
        setRoles(roleList);
        if (roleList.length > 0) {
          setTargetRoleId(roleList[0].id);
        } else {
          setTargetRoleId("");
        }
      })
      .catch((err) => console.error("Failed to load roles:", err));
  }, [targetLocationId, organizationId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!targetLocationId) {
      setError("Please select a target branch location.");
      return;
    }
    if (!effectiveDate) {
      setError("Please select an effective transfer date.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await apiSend<{ success: boolean; toLocationName?: string }>(
        "/api/employees/transfer",
        "POST",
        {
          employeeId,
          targetLocationId,
          effectiveDate,
          targetShiftId: targetShiftId || undefined,
          targetRoleId: targetRoleId || undefined,
          syncUserAccess,
          notes: notes.trim() || undefined,
        }
      );

      if (res.success) {
        addToast({
          type: "success",
          message: `${employeeName} transferred to ${res.toLocationName || "new branch"} successfully.`,
        });
        onSuccess();
        onClose();
      } else {
        throw new Error("Transfer failed to complete.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to execute branch transfer.");
    } finally {
      setSubmitting(false);
    }
  }

  const selectedLoc = locations.find((l) => l.id === targetLocationId);

  return (
    <KalkiModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <ArrowRightLeft size={20} color="var(--kalki-primary)" />
          <span>Transfer Employee Branch</span>
        </div>
      }
      subtitle={`Initiate a formal branch movement for ${employeeName} (${employeeCode})`}
      maxWidth="600px"
    >
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {error && (
          <div
            style={{
              padding: "10px 14px",
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              border: "1px solid var(--kalki-danger, #ef4444)",
              borderRadius: "6px",
              color: "var(--kalki-danger, #ef4444)",
              fontSize: "0.875rem",
            }}
          >
            {error}
          </div>
        )}

        {/* Target Branch */}
        <div className="kalki-field">
          <label className="kalki-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Building2 size={16} /> Destination Branch / Location *
          </label>
          <select
            className="kalki-select"
            value={targetLocationId}
            onChange={(e) => setTargetLocationId(e.target.value)}
            disabled={loading || submitting}
            required
            style={{ width: "100%", padding: "8px 12px" }}
          >
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name} ({loc.code})
              </option>
            ))}
          </select>
          <span style={{ fontSize: "11px", color: "var(--kalki-text-secondary)", marginTop: "4px" }}>
            The employee&apos;s master location, attendance reporting, and payroll will route to this destination branch.
          </span>
        </div>

        {/* Effective Date */}
        <div className="kalki-field">
          <label className="kalki-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Calendar size={16} /> Effective Date *
          </label>
          <input
            type="date"
            className="kalki-input"
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
            disabled={submitting}
            required
            style={{ width: "100%", padding: "8px 12px" }}
          />
          <span style={{ fontSize: "11px", color: "var(--kalki-text-secondary)", marginTop: "4px" }}>
            Punches and work records on or after this date will be calculated under the new branch.
          </span>
        </div>

        {/* Target Default Shift */}
        <div className="kalki-field">
          <label className="kalki-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Clock size={16} /> Target Branch Default Shift
          </label>
          <select
            className="kalki-select"
            value={targetShiftId}
            onChange={(e) => setTargetShiftId(e.target.value)}
            disabled={submitting}
            style={{ width: "100%", padding: "8px 12px" }}
          >
            <option value="">-- No shift selected (keep unassigned) --</option>
            {shifts.map((s) => (
              <option key={s.id} value={s.id}>
                {s.shift_name || s.name} ({s.startTime} - {s.endTime})
              </option>
            ))}
          </select>
        </div>

        {/* Target Role (Optional) */}
        {roles.length > 0 && (
          <div className="kalki-field">
            <label className="kalki-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Briefcase size={16} /> Target Branch Role Assignment
            </label>
            <select
              className="kalki-select"
              value={targetRoleId}
              onChange={(e) => setTargetRoleId(e.target.value)}
              disabled={submitting}
              style={{ width: "100%", padding: "8px 12px" }}
            >
              <option value="">-- Keep current role or assign later --</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Sync User System Login Access Checkbox */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "10px",
            background: "var(--kalki-bg-secondary, #f8fafc)",
            padding: "12px",
            borderRadius: "6px",
            border: "1px solid var(--kalki-border, #e2e8f0)",
          }}
        >
          <input
            type="checkbox"
            id="syncUserAccess"
            checked={syncUserAccess}
            onChange={(e) => setSyncUserAccess(e.target.checked)}
            style={{ marginTop: "3px", cursor: "pointer" }}
          />
          <label htmlFor="syncUserAccess" style={{ cursor: "pointer", fontSize: "0.875rem" }}>
            <strong>Automatically grant system login access to {selectedLoc?.name || "destination branch"}</strong>
            <span style={{ display: "block", fontSize: "11px", color: "var(--kalki-text-secondary)", marginTop: "2px" }}>
              Ensures the employee can switch to and access this location when signing into Kalki BOS.
            </span>
          </label>
        </div>

        {/* Transfer Notes */}
        <div className="kalki-field">
          <label className="kalki-label">Transfer Reason / Remarks</label>
          <textarea
            className="kalki-input"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Branch operational realignment, temporary staff deployment, or permanent branch transfer."
            disabled={submitting}
            style={{ width: "100%", padding: "8px 12px", resize: "vertical" }}
          />
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "12px", borderTop: "1px solid var(--kalki-border)", paddingTop: "14px" }}>
          <button
            type="button"
            className="kalki-button kalki-button--secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="kalki-button kalki-button--primary"
            disabled={submitting || locations.length === 0}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            {submitting ? "Processing Transfer..." : "Confirm & Transfer Branch"}
          </button>
        </div>
      </form>
    </KalkiModal>
  );
}

