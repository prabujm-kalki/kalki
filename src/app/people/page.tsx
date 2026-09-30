"use client";

import React, { useState, Suspense, useEffect } from "react";
import { AppShell, useSessionView } from "@/components/AppShell";
import { StatusMessage } from "@/components/StatusMessage";
import { KalkiPageHeader } from "@/components/ui/KalkiPageHeader";
import { User, Users, Landmark } from "lucide-react";
import { PeopleDashboard } from "@/components/people/PeopleDashboard";
import { EmployeeProfile } from "@/components/people/EmployeeProfile";
import { EmployeeCompensationTab } from "@/components/payroll/EmployeeCompensationTab";
import { MyAdvances } from "@/components/people/MyAdvances";
import { apiGet } from "@/lib/api";

type PeopleTab = "profile" | "directory" | "compensation" | "advances";

function CompensationDashboard() {
  const { selected } = useSessionView();
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    apiGet<{ employees: any[] }>(`/api/employees?organizationId=${selected.organizationId}&locationId=${selected.locationId}`)
      .then(res => setEmployees(res.employees || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selected]);

  if (!selected) return null;

  if (selectedEmployeeId) {
    const emp = employees.find(e => e.id === selectedEmployeeId);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div>
          <button className="kalki-button kalki-button--ghost kalki-button--sm" onClick={() => setSelectedEmployeeId(null)}>
            &larr; Back to Employee List
          </button>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <h1 className="kalki-page-title">{emp?.person?.displayName}</h1>
            <p className="kalki-page-description">{emp?.employeeCode} &middot; {emp?.jobTitle || "No job title"}</p>
          </div>
        </div>
        <EmployeeCompensationTab employeeId={selectedEmployeeId} organizationId={selected.organizationId} />
      </div>
    );
  }

  return (
    <div className="kalki-section">
      <div className="kalki-section-header">
        <h2 className="kalki-section-title">Select Employee</h2>
      </div>
      <div className="kalki-section-content" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: "16px" }}><StatusMessage tone="loading">Loading employees...</StatusMessage></div>
        ) : (
          <div className="kalki-table-container">
            <table className="kalki-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>ID</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => (
                  <tr key={emp.id}>
                    <td><strong>{emp.person?.displayName}</strong></td>
                    <td>{emp.employeeCode}</td>
                    <td>{emp.departmentName || "-"}</td>
                    <td>
                      <span className={`kalki-badge kalki-badge--${emp.status === 'ACTIVE' ? 'success' : emp.status === 'DRAFT' ? 'warning' : 'danger'}`}>
                        {emp.status}
                      </span>
                    </td>
                    <td>
                      <button className="kalki-button kalki-button--secondary kalki-button--sm" onClick={() => setSelectedEmployeeId(emp.id)}>
                        View Compensation
                      </button>
                    </td>
                  </tr>
                ))}
                {employees.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: "16px" }}>No employees found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function PeopleTabs() {
  const { session, selected } = useSessionView();
  const [activeTab, setActiveTab] = useState<PeopleTab>(
    (session?.isOwner || selected?.permissions?.includes("employee.directory:read")) 
      ? "directory" 
      : "profile"
  );
  const [myEmployeeId, setMyEmployeeId] = useState<string | null>(null);

  useEffect(() => {
    if (selected?.organizationId && selected?.locationId) {
      apiGet<{employeeId: string | null}>(`/api/employees/me?organizationId=${selected.organizationId}&locationId=${selected.locationId}`)
        .then(res => {
          if (res.employeeId) {
            setMyEmployeeId(res.employeeId);
          }
        })
        .catch(console.error);
    }
  }, [selected]);

  return (
    <div className="kalki-page">
      <KalkiPageHeader 
        title="People & Profiles" 
        description="Manage your profile, employee directory, and compensation details."
      />

      <div className="kalki-dashboard-grid" style={{ padding: '0 2rem' }}>
        <div className="kalki-module-nav" style={{ overflowX: 'auto', display: 'flex', gap: '8px' }}>
          <button
            className={`kalki-module-link ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
            style={{ background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            <User size={18} /> My Profile
          </button>
          {(session?.isOwner || selected?.permissions?.includes("employee.my_advances:read")) && (
            <button
              className={`kalki-module-link ${activeTab === 'advances' ? 'active' : ''}`}
              onClick={() => setActiveTab('advances')}
              style={{ background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              <Landmark size={18} /> My Advances
            </button>
          )}
          {(session?.isOwner || selected?.permissions?.includes("employee.directory:read")) && (
            <button
              className={`kalki-module-link ${activeTab === 'directory' ? 'active' : ''}`}
              onClick={() => setActiveTab('directory')}
              style={{ background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              <Users size={18} /> Directory
            </button>
          )}
          {session?.isOwner && (
            <button
              className={`kalki-module-link ${activeTab === 'compensation' ? 'active' : ''}`}
              onClick={() => setActiveTab('compensation')}
              style={{ background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              <Landmark size={18} /> Compensation & Payroll Details
            </button>
          )}
        </div>

        <div className="kalki-tab-content" style={{ marginTop: '1rem' }}>
          {activeTab === 'profile' ? (
            myEmployeeId ? <EmployeeProfile employeeId={myEmployeeId} /> : <StatusMessage tone="empty">No employee profile linked to your account.</StatusMessage>
          ) : activeTab === 'advances' ? (
            myEmployeeId ? <MyAdvances employeeId={myEmployeeId} /> : <StatusMessage tone="empty">No employee profile linked to your account.</StatusMessage>
          ) : activeTab === 'directory' ? (
            <PeopleDashboard />
          ) : activeTab === 'compensation' ? (
            <CompensationDashboard />
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function PeoplePage() {
  return (
    <Suspense fallback={<main className="app-main"><StatusMessage tone="loading">Loading people…</StatusMessage></main>}>
      <AppShell>
        <PeopleTabs />
      </AppShell>
    </Suspense>
  );
}
