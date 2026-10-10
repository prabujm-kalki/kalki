"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSessionView } from "@/components/AppShell";
import { StatusMessage } from "@/components/StatusMessage";
import { Search, Filter, LayoutGrid, Plus, Eye, Edit } from "lucide-react";
import "@/app/people/people.css";
import { apiGet } from "@/lib/api";
import { EmployeeForm } from "./EmployeeForm";

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
    phone?: string | null;
    email?: string | null;
  };
  photoUrl?: string | null;
};

export function PeopleDashboard() {
  const { session, selected } = useSessionView();
  const [employees, setEmployees] = useState<{ requestKey: string; items: EmployeeView[] } | null>(null);
  const [proposals, setProposals] = useState<{ requestKey: string; items: any[] } | null>(null);
  const [error, setError] = useState<{ requestKey: string; message: string } | null>(null);
  const [showForm, setShowForm] = useState(false);
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
      session.isOwner ? apiGet<{ data: any[] }>(`/api/employees/proposals?${query.toString()}`) : Promise.resolve({ data: [] })
    ]).then(([empPayload, proposalsPayload]) => {
      if (cancelled) return;
      setError(null);
      setEmployees({ requestKey, items: empPayload.employees });
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
                  <h4>{proposal.employeeDisplayName || 'Unknown Employee'} <span className="muted">({proposal.employeeCode})</span></h4>
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

      <div className="people-toolbar">
        <div className="people-toolbar-left">
          <Search size={18} className="people-search-icon" />
          <input 
            type="text" 
            placeholder="Search employees..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="people-search-input"
          />
        </div>
        <div className="people-toolbar-right">
          <button type="button" className="people-btn-outline">
            <Filter size={16} /> Filter
          </button>
          <button type="button" className="people-btn-outline">
            <LayoutGrid size={16} /> Group By
          </button>
          {!showForm && (
            <button 
              type="button" 
              className="kalki-button kalki-button--primary kalki-button--sm" 
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.5rem 1rem' }} 
              onClick={() => setShowForm(true)}
            >
              <Plus size={16} /> Add Employee
            </button>
          )}
        </div>
      </div>

      {employees.items.length === 0 ? (
        <StatusMessage tone="empty">No employees are visible in this location scope.</StatusMessage>
      ) : filteredEmployees.length === 0 ? (
        <StatusMessage tone="empty">No employees match your search criteria.</StatusMessage>
      ) : (
        <div className="people-table-container">
          <table className="people-table">
            <thead>
              <tr>
                <th style={{ width: '40px', paddingLeft: '1.5rem' }}>
                  <input type="checkbox" className="people-checkbox" />
                </th>
                <th>Employee</th>
                <th>Contact</th>
                <th>Job Position</th>
                <th>Status</th>
                <th style={{ textAlign: 'right', paddingRight: '1.5rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((emp) => (
                <tr key={emp.id}>
                  <td className="checkbox-col" style={{ paddingLeft: '1.5rem' }}>
                    <input type="checkbox" className="people-checkbox" />
                  </td>
                  <td className="employee-col" data-label="Employee">
                    <div className="employee-cell">
                      <div className="employee-avatar">
                        {emp.photoUrl ? <img src={emp.photoUrl} alt={emp.person.displayName} /> : emp.person.displayName.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="employee-details">
                        <div className="employee-name">{emp.person.displayName}</div>
                        <div className="employee-code">{emp.employeeCode}</div>
                      </div>
                    </div>
                  </td>
                  <td className="contact-col" data-label="Contact">
                    <div className="contact-cell">
                      <div className="contact-email">{emp.person.email || 'No email provided'}</div>
                      <div className="contact-phone">{emp.person.phone || 'No phone provided'}</div>
                    </div>
                  </td>
                  <td data-label="Job Position">
                    <div className="job-cell">
                      <div className="job-title">{emp.jobTitle || 'None'}</div>
                      <div className="job-department">{emp.category || 'N/A'}</div>
                    </div>
                  </td>
                  <td data-label="Status">
                    <div className={`status-indicator status-${emp.status.toLowerCase().replace('_', '-')}`}>
                      <span className="status-dot"></span>
                      {emp.status === 'NOTICE_PERIOD' ? 'Notice Period' : 
                       emp.status.charAt(0).toUpperCase() + emp.status.slice(1).toLowerCase()}
                    </div>
                  </td>
                  <td className="actions-col" data-label="Actions" style={{ paddingRight: '1.5rem' }}>
                    <div className="actions-cell">
                      <Link href={`/people/${emp.id}?organizationId=${selected.organizationId}&locationId=${selected.locationId}`}>
                        <button className="action-btn" title="View"><Eye size={16} /></button>
                      </Link>
                      <Link href={`/people/${emp.id}?edit=true&organizationId=${selected.organizationId}&locationId=${selected.locationId}`}>
                        <button className="action-btn" title="Edit"><Edit size={16} /></button>
                      </Link>
                    </div>
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
