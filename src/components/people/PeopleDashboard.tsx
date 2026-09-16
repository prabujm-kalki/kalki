"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSessionView } from "@/components/AppShell";
import { StatusMessage } from "@/components/StatusMessage";
import { apiGet } from "@/lib/api";
import { EmployeeForm } from "./EmployeeForm";
import { RoleDefinitionForm } from "./RoleDefinitionForm";

type EmployeeView = {
  id: string;
  employeeCode: string;
  jobTitle: string | null;
  category?: string | null;
  isActive: boolean;
  status: string;
  person: {
    id: string;
    firstName: string;
    lastName: string | null;
    displayName: string;
  };
};

type RoleDefinitionView = {
  id: string;
  name: string;
  identifier: string;
  purpose: string;
  isActive: boolean;
};

export function PeopleDashboard() {
  const { selected } = useSessionView();
  const [employees, setEmployees] = useState<{ requestKey: string; items: EmployeeView[] } | null>(null);
  const [roles, setRoles] = useState<{ requestKey: string; items: RoleDefinitionView[] } | null>(null);
  const [error, setError] = useState<{ requestKey: string; message: string } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    if (!selected) return;
    const query = new URLSearchParams({
      organizationId: selected.organizationId,
      locationId: selected.locationId,
    });
    const requestKey = `${selected.organizationId}:${selected.locationId}`;
    let cancelled = false;
    Promise.all([
      apiGet<{ employees: EmployeeView[] }>(`/api/employees?${query.toString()}`),
      apiGet<{ roles: RoleDefinitionView[] }>(`/api/role-definitions?${query.toString()}`)
    ]).then(([empPayload, rolePayload]) => {
      if (cancelled) return;
      setError(null);
      setEmployees({ requestKey, items: empPayload.employees });
      setRoles({ requestKey, items: rolePayload.roles });
    }).catch((caught) => {
      if (!cancelled) setError({ requestKey, message: caught instanceof Error ? caught.message : "Unable to load data" });
    });
    return () => {
      cancelled = true;
    };
  }, [selected, refreshKey]);

  const filteredEmployees = employees?.items.filter(emp => {
    if (statusFilter !== "ALL" && emp.status !== statusFilter) return false;
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      if (!emp.person.displayName.toLowerCase().includes(q) && !emp.employeeCode.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  }) || [];

  if (!selected) return <StatusMessage tone="empty">Select an organization location to view people.</StatusMessage>;
  const requestKey = `${selected.organizationId}:${selected.locationId}`;
  if (error?.requestKey === requestKey) return <StatusMessage tone="error">{error.message}</StatusMessage>;
  if (!employees || employees.requestKey !== requestKey) return <StatusMessage tone="loading">Loading people…</StatusMessage>;

  return (
    <div className="stack">
      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="muted">People & Roles</p>
            <h2>Employees</h2>
            <p>{selected.organizationName} · {selected.locationName}</p>
          </div>
          <div>
            <span className="muted" style={{ marginRight: "1rem" }}>{employees.items.length} total</span>
            {!showForm && <button type="button" className="action-button" onClick={() => setShowForm(true)}>Add Employee</button>}
          </div>
        </div>
        <p className="muted">Manage employees, their roles, and access across this location.</p>
      </section>

      {showForm && (
        <EmployeeForm
          organizationId={selected.organizationId}
          locationId={selected.locationId}
          onCancel={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false);
            setRefreshKey((k) => k + 1);
          }}
        />
      )}

      <div className="panel" style={{ padding: "1rem", marginBottom: "1rem" }}>
        <div className="row" style={{ gap: "1rem" }}>
          <input 
            type="text" 
            placeholder="Search by name or ID..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1, padding: "0.5rem", borderRadius: "0.25rem", border: "1px solid var(--border-color, #ccc)" }}
          />
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: "0.5rem", borderRadius: "0.25rem", border: "1px solid var(--border-color, #ccc)" }}
          >
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="EXITED">Exited</option>
          </select>
        </div>
      </div>

      {employees.items.length === 0 ? (
        <StatusMessage tone="empty">No employees are visible in this location scope.</StatusMessage>
      ) : filteredEmployees.length === 0 ? (
        <StatusMessage tone="empty">No employees match your search criteria.</StatusMessage>
      ) : (
        <div className="work-list">
          {filteredEmployees.map((emp) => (
            <Link 
              key={emp.id} 
              className="panel work-link" 
              style={{ display: "block", textDecoration: "none" }}
              href={`/people/${emp.id}?organizationId=${selected.organizationId}&locationId=${selected.locationId}`}
            >
              <div className="panel-header">
                <h3>
                  {emp.person.displayName}{" "}
                  <span style={{ 
                    fontSize: "0.85em", 
                    fontWeight: "600", 
                    padding: "0.2rem 0.6rem", 
                    borderRadius: "999px", 
                    background: emp.status === 'ACTIVE' ? '#dcfce7' : emp.status === 'DRAFT' ? '#fef9c3' : '#f1f5f9', 
                    color: emp.status === 'ACTIVE' ? '#166534' : emp.status === 'DRAFT' ? '#854d0e' : '#475569' 
                  }}>
                    {emp.status}
                  </span>
                </h3>
                <span className="muted" style={{ fontFamily: "monospace" }}>{emp.employeeCode}</span>
              </div>
              <p className="muted" style={{ marginTop: "0.5rem" }}>
                {emp.jobTitle ?? "No job title assigned"}
                {emp.category && <span> &middot; {emp.category}</span>}
              </p>
            </Link>
          ))}
        </div>
      )}

      <section className="panel" style={{ marginTop: "2rem" }}>
        <div className="panel-header">
          <div>
            <h2>Role Definitions</h2>
          </div>
          <div>
            <span className="muted" style={{ marginRight: "1rem" }}>{roles?.items.length ?? 0} roles</span>
            {!showRoleForm && <button type="button" className="action-button" onClick={() => setShowRoleForm(true)}>Add Role</button>}
          </div>
        </div>
      </section>

      {showRoleForm && (
        <RoleDefinitionForm
          organizationId={selected.organizationId}
          locationId={selected.locationId}
          onCancel={() => setShowRoleForm(false)}
          onSuccess={() => {
            setShowRoleForm(false);
            setRefreshKey((k) => k + 1);
          }}
        />
      )}

      {!roles || roles.items.length === 0 ? (
        <StatusMessage tone="empty">No roles defined yet.</StatusMessage>
      ) : (
        <div className="grid-2">
          {roles.items.map((role) => (
            <Link 
              key={role.id} 
              className="panel work-link" 
              style={{ display: "block", textDecoration: "none" }}
              href={`/people/roles/${role.id}?organizationId=${selected.organizationId}&locationId=${selected.locationId}`}
            >
              <div className="panel-header">
                <h3>{role.name} {role.isActive ? "" : "(Inactive)"}</h3>
                <span className="muted">{role.identifier}</span>
              </div>
              <p className="muted">{role.purpose}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
