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
  const { session, selected } = useSessionView();
  const [employees, setEmployees] = useState<{ requestKey: string; items: EmployeeView[] } | null>(null);
  const [roles, setRoles] = useState<{ requestKey: string; items: RoleDefinitionView[] } | null>(null);
  const [proposals, setProposals] = useState<{ requestKey: string; items: any[] } | null>(null);
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
      apiGet<{ roles: RoleDefinitionView[] }>(`/api/role-definitions?${query.toString()}`),
      session.isOwner ? apiGet<{ data: any[] }>(`/api/employees/proposals?${query.toString()}`) : Promise.resolve({ data: [] })
    ]).then(([empPayload, rolePayload, proposalsPayload]) => {
      if (cancelled) return;
      setError(null);
      setEmployees({ requestKey, items: empPayload.employees });
      setRoles({ requestKey, items: rolePayload.roles });
      setProposals({ requestKey, items: proposalsPayload.data });
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', background: 'var(--kalki-surface)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--kalki-border)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--kalki-primary)' }}>People & Roles</span>
            <span style={{ color: 'var(--kalki-border)' }}>/</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--kalki-text-secondary)' }}>{selected.organizationName} &middot; {selected.locationName}</span>
          </div>
          <h2 style={{ margin: '0 0 0.25rem 0', fontSize: '1.25rem', color: 'var(--kalki-text)' }}>Employees</h2>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--kalki-text-secondary)' }}>Manage employees, their roles, and access across this location.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--kalki-text-secondary)' }}>
            {employees.items.length} total
          </span>
          {!showForm && (
            <button type="button" className="kalki-button kalki-button--primary kalki-button--sm" onClick={() => setShowForm(true)}>
              + Add Employee
            </button>
          )}
        </div>
      </div>

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

      {session.isOwner && proposals?.items && proposals.items.length > 0 && (
        <section className="panel" style={{ border: "2px solid var(--warning)", background: "var(--warning-light, #fffbeb)" }}>
          <div className="panel-header">
            <h3 style={{ color: "var(--warning-dark, #b45309)" }}>Pending Approvals ({proposals.items.length})</h3>
          </div>
          <div className="work-list" style={{ marginTop: "1rem" }}>
            {proposals.items.map(proposal => (
              <Link 
                key={proposal.id} 
                className="panel work-link" 
                style={{ display: "block", textDecoration: "none", background: "white" }}
                href={`/people/${proposal.employeeId}?organizationId=${selected.organizationId}&locationId=${selected.locationId}`}
              >
                <div className="panel-header">
                  <h4>{proposal.employee?.person?.displayName} <span className="muted">({proposal.employee?.employeeCode})</span></h4>
                  <span style={{ fontSize: "0.85em", fontWeight: "600", padding: "0.2rem 0.6rem", borderRadius: "999px", background: '#fef9c3', color: '#854d0e' }}>
                    PENDING
                  </span>
                </div>
                <p className="muted" style={{ marginTop: "0.5rem" }}>
                  <strong>Reason:</strong> {proposal.reason}
                </p>
              </Link>
            ))}
          </div>
        </section>
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
        <div className="panel" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left" }}>
                <th style={{ padding: "0.4rem 0.5rem" }}>Employee Code</th>
                <th style={{ padding: "0.4rem 0.5rem" }}>Name</th>
                <th style={{ padding: "0.4rem 0.5rem" }}>Job Title</th>
                <th style={{ padding: "0.4rem 0.5rem" }}>Category</th>
                <th style={{ padding: "0.4rem 0.5rem" }}>Status</th>
                <th style={{ padding: "0.4rem 0.5rem" }}></th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((emp) => (
                <tr key={emp.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "0.4rem 0.5rem", fontFamily: "monospace" }}>{emp.employeeCode}</td>
                  <td style={{ padding: "0.4rem 0.5rem", fontWeight: "500" }}>{emp.person.displayName}</td>
                  <td style={{ padding: "0.4rem 0.5rem" }}>{emp.jobTitle ?? "-"}</td>
                  <td style={{ padding: "0.4rem 0.5rem" }}>{emp.category ?? "-"}</td>
                  <td style={{ padding: "0.4rem 0.5rem" }}>
                    <span style={{ 
                      fontSize: "0.75em", 
                      fontWeight: "600", 
                      padding: "0.15rem 0.5rem", 
                      borderRadius: "999px", 
                      background: emp.status === 'ACTIVE' ? '#dcfce7' : emp.status === 'DRAFT' ? '#fef9c3' : '#f1f5f9', 
                      color: emp.status === 'ACTIVE' ? '#166534' : emp.status === 'DRAFT' ? '#854d0e' : '#475569' 
                    }}>
                      {emp.status}
                    </span>
                  </td>
                  <td style={{ padding: "0.4rem 0.5rem", textAlign: "right" }}>
                    <Link 
                      href={`/people/${emp.id}?organizationId=${selected.organizationId}&locationId=${selected.locationId}`}
                      style={{ color: "var(--primary)", textDecoration: "none" }}
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <section className="panel" style={{ marginTop: "2rem" }}>
        <div className="panel-header">
          <div>
            <h2>Role Definitions</h2>
          </div>
          <div>
            <span className="muted" style={{ marginRight: "1rem" }}>{roles?.items.length ?? 0} roles</span>
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
        <div className="panel" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left" }}>
                <th style={{ padding: "0.4rem 0.5rem" }}>Role Name</th>
                <th style={{ padding: "0.4rem 0.5rem" }}>Identifier</th>
                <th style={{ padding: "0.4rem 0.5rem" }}>Purpose</th>
                <th style={{ padding: "0.4rem 0.5rem" }}>Status</th>
                <th style={{ padding: "0.4rem 0.5rem" }}></th>
              </tr>
            </thead>
            <tbody>
              {roles.items.map((role) => (
                <tr key={role.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "0.4rem 0.5rem", fontWeight: "500" }}>{role.name}</td>
                  <td style={{ padding: "0.4rem 0.5rem", fontFamily: "monospace", fontSize: "0.9em" }}>{role.identifier}</td>
                  <td style={{ padding: "0.4rem 0.5rem" }}>{role.purpose}</td>
                  <td style={{ padding: "0.4rem 0.5rem" }}>
                    <span style={{ 
                      padding: "0.15rem 0.5rem", 
                      borderRadius: "1rem", 
                      fontSize: "0.75rem",
                      background: role.isActive ? '#dcfce7' : '#f1f5f9', 
                      color: role.isActive ? '#166534' : '#475569' 
                    }}>
                      {role.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td style={{ padding: "0.4rem 0.5rem", textAlign: "right" }}>
                    <Link 
                      href={`/people/roles/${role.id}?organizationId=${selected.organizationId}&locationId=${selected.locationId}`}
                      style={{ color: "var(--primary)", textDecoration: "none" }}
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
