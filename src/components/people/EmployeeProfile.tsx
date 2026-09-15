"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useSessionView } from "@/components/AppShell";
import { StatusMessage } from "@/components/StatusMessage";
import { apiGet, apiSend } from "@/lib/api";
import { EmployeeForm } from "./EmployeeForm";

type EmployeeView = {
  id: string;
  employeeCode: string;
  jobTitle: string | null;
  employmentStartDate: string;
  employmentEndDate: string | null;
  status: string;
  aadhaarDocumentUrl: string | null;
  photoUrl: string | null;
  applicationFormUrl: string | null;
  otherDocumentsUrl: string | null;
  biometricId: string | null;
  posId: string | null;
  isActive: boolean;
  person: {
    id: string;
    firstName: string;
    lastName: string | null;
    displayName: string;
    email: string | null;
    phone: string | null;
    dateOfBirth: string | null;
  };
};

type RoleAssignmentView = {
  id: string;
  role: {
    id: string;
    name: string;
    identifier: string;
  };
  isActive: boolean;
};

type RoleDefinitionView = {
  id: string;
  name: string;
  identifier: string;
  isActive: boolean;
};

export function EmployeeProfile({ employeeId }: { employeeId: string }) {
  const { selected } = useSessionView();
  const [employee, setEmployee] = useState<{ requestKey: string; data: EmployeeView } | null>(null);
  const [assignments, setAssignments] = useState<{ requestKey: string; items: RoleAssignmentView[] } | null>(null);
  const [availableRoles, setAvailableRoles] = useState<RoleDefinitionView[]>([]);
  const [error, setError] = useState<{ requestKey: string; message: string } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [selectedRole, setSelectedRole] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);

  async function deactivateEmployee() {
    if (!selected || !employee?.data) return;
    if (!confirm("Are you sure you want to deactivate this employee?")) return;
    setIsDeactivating(true);
    try {
      await apiSend(`/api/employees?id=${employee.data.id}`, "PATCH", {
        isActive: false
      });
      setRefreshKey(k => k + 1);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to deactivate");
    } finally {
      setIsDeactivating(false);
    }
  }

  useEffect(() => {
    if (!selected) return;
    const requestKey = `${selected.organizationId}:${selected.locationId}:${employeeId}`;
    let cancelled = false;

    Promise.all([
      apiGet<{ employee: EmployeeView }>(`/api/employees?id=${employeeId}`),
      apiGet<{ assignments: RoleAssignmentView[] }>(`/api/employee-role-assignments?organizationId=${selected.organizationId}&locationId=${selected.locationId}&employeeId=${employeeId}`),
      apiGet<{ roles: RoleDefinitionView[] }>(`/api/role-definitions?organizationId=${selected.organizationId}&locationId=${selected.locationId}`)
    ]).then(([empPayload, assignsPayload, rolesPayload]) => {
      if (cancelled) return;
      setError(null);
      setEmployee({ requestKey, data: empPayload.employee });
      setAssignments({ requestKey, items: assignsPayload.assignments });
      setAvailableRoles(rolesPayload.roles.filter(r => r.isActive));
    }).catch((caught) => {
      if (!cancelled) setError({ requestKey, message: caught instanceof Error ? caught.message : "Unable to load profile data" });
    });

    return () => {
      cancelled = true;
    };
  }, [selected, employeeId, refreshKey]);

  async function assignRole(event: FormEvent) {
    event.preventDefault();
    if (!selected || !selectedRole) return;
    setAssigning(true);
    setAssignError(null);
    try {
      await apiSend("/api/employee-role-assignments", "POST", {
        organizationId: selected.organizationId,
        locationId: selected.locationId,
        employeeId,
        roleId: selectedRole,
      });
      setSelectedRole("");
      setRefreshKey((k) => k + 1);
    } catch (caught) {
      setAssignError(caught instanceof Error ? caught.message : "Failed to assign role");
    } finally {
      setAssigning(false);
    }
  }

  if (!selected) return <StatusMessage tone="empty">Select an organization location to view profile.</StatusMessage>;
  const requestKey = `${selected.organizationId}:${selected.locationId}:${employeeId}`;
  if (error?.requestKey === requestKey) return <StatusMessage tone="error">{error.message}</StatusMessage>;
  if (!employee || employee.requestKey !== requestKey || !assignments) return <StatusMessage tone="loading">Loading profile…</StatusMessage>;

  const emp = employee.data;

  // Filter out roles that are already assigned
  const unassignedRoles = availableRoles.filter(
    (role) => !assignments.items.some((assign) => assign.role.id === role.id)
  );

  return (
    <div className="stack">
      <Link href={`/people?organizationId=${selected.organizationId}&locationId=${selected.locationId}`} className="nav-link" style={{ alignSelf: "flex-start" }}>
        ← Back to People
      </Link>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="muted">Employee Profile</p>
            <h2>{emp.person.displayName} {emp.isActive ? "" : "(Inactive)"}</h2>
            <p>{emp.employeeCode} · {emp.jobTitle ?? "No job title"}</p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className="secondary-button" onClick={() => setIsEditing(true)}>Edit</button>
            {emp.isActive && (
              <button className="secondary-button" style={{ color: "var(--danger)", borderColor: "var(--danger-light)" }} onClick={() => void deactivateEmployee()} disabled={isDeactivating}>
                Deactivate
              </button>
            )}
          </div>
        </div>
        {isEditing ? (
          <div style={{ marginTop: "1rem" }}>
            <EmployeeForm 
              organizationId={selected.organizationId}
              locationId={selected.locationId}
              initialData={emp}
              onCancel={() => setIsEditing(false)}
              onSuccess={() => {
                setIsEditing(false);
                setRefreshKey(k => k + 1);
              }}
            />
          </div>
        ) : (
          <div style={{ marginTop: "1rem" }}>
            {emp.person.email && <p><strong>Email:</strong> {emp.person.email}</p>}
            {emp.person.phone && <p><strong>Phone:</strong> {emp.person.phone}</p>}
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Role Assignments</h3>
          <span className="muted">{assignments.items.length} active roles</span>
        </div>
        
        {assignments.items.length === 0 ? (
          <p className="muted" style={{ marginTop: "1rem" }}>No roles assigned.</p>
        ) : (
          <div className="grid" style={{ gap: "1rem", marginTop: "1rem" }}>
            {assignments.items.map((assign) => (
              <div key={assign.id} style={{ padding: "0.75rem", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
                <strong>{assign.role.name}</strong>
                <p className="muted" style={{ fontSize: "0.875rem" }}>{assign.role.identifier}</p>
              </div>
            ))}
          </div>
        )}

        <hr style={{ margin: "1.5rem 0", borderColor: "var(--border)" }} />
        
        <h4>Assign a new role</h4>
        {assignError ? <StatusMessage tone="error">{assignError}</StatusMessage> : null}
        
        {availableRoles.length === 0 ? (
          <p className="muted" style={{ marginTop: "0.5rem" }}>No roles defined yet. Create a role first.</p>
        ) : unassignedRoles.length === 0 ? (
          <p className="muted" style={{ marginTop: "0.5rem" }}>All available active roles are already assigned to this employee.</p>
        ) : (
          <form onSubmit={(e) => void assignRole(e)} style={{ display: "flex", gap: "1rem", marginTop: "1rem", alignItems: "flex-end" }}>
            <label style={{ flex: 1 }}>
              Select Role
              <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} disabled={assigning}>
                <option value="" disabled>Choose a role...</option>
                {unassignedRoles.map((role) => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </select>
            </label>
            <button type="submit" className="action-button" disabled={!selectedRole || assigning}>
              {assigning ? "Assigning…" : "Assign Role"}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
