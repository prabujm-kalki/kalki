"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useSessionView } from "@/components/AppShell";
import { StatusMessage } from "@/components/StatusMessage";
import { apiGet, apiSend } from "@/lib/api";
import { EmployeeForm } from "./EmployeeForm";
import { EmployeeSalaryForm } from "./EmployeeSalaryForm";

type EmployeeView = {
  id: string;
  userId: string | null;
  employeeCode: string;
  jobTitle: string | null;
  employmentStartDate: string;
  employmentEndDate: string | null;
  status: string;
  aadhaarDocumentUrl: string | null;
  photoUrl: string | null;

  biometricId: string | null;
  posId: string | null;
  category: string | null;
  gender: string | null;
  maritalStatus: string | null;
  residentialAddress: string | null;
  bloodGroup: string | null;
  reportingEmployeeId: string | null;
  departmentName?: string | null;
  familyContacts: any[];
  salaryInfo: any | null;
  history: any;
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

// Reusable Dense Info Grid Component
function InfoItem({ label, value, strong = false }: { label: string, value: React.ReactNode, strong?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginBottom: "16px" }}>
      <span style={{ fontSize: "12px", color: "var(--kalki-text-secondary)", fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: "14px", color: "var(--kalki-text-primary)", fontWeight: strong ? 600 : 400 }}>
        {value || <span style={{ color: "var(--kalki-text-secondary)", fontStyle: "italic" }}>Not provided</span>}
      </span>
    </div>
  );
}

export function EmployeeProfile({ employeeId }: { employeeId: string }) {
  const { session, selected } = useSessionView();
  const [employee, setEmployee] = useState<{ requestKey: string; data: EmployeeView } | null>(null);
  const [manager, setManager] = useState<EmployeeView | null>(null);
  const [assignments, setAssignments] = useState<{ requestKey: string; items: RoleAssignmentView[] } | null>(null);
  const [availableRoles, setAvailableRoles] = useState<RoleDefinitionView[]>([]);
  const [pendingProposal, setPendingProposal] = useState<any>(null);
  const [error, setError] = useState<{ requestKey: string; message: string } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [selectedRole, setSelectedRole] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [isEditingSalary, setIsEditingSalary] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [provisionError, setProvisionError] = useState<string | null>(null);
  const [provisionSuccess, setProvisionSuccess] = useState<string | null>(null);

  async function handleProvisionAccess() {
    if (!employee?.data) return;
    if (!confirm("Are you sure you want to provision system access for this employee?")) return;
    
    setIsProvisioning(true);
    setProvisionError(null);
    setProvisionSuccess(null);
    try {
      const { provisionEmployeeAccess } = await import("@/domains/employees/actions");
      await provisionEmployeeAccess(employee.data.id);
      setProvisionSuccess("Access provisioned successfully! The default password is 'Password@123!'");
      setRefreshKey(k => k + 1);
    } catch (err) {
      setProvisionError(err instanceof Error ? err.message : "Failed to provision access");
    } finally {
      setIsProvisioning(false);
    }
  }

  async function activateEmployee() {
    if (!selected || !employee?.data) return;
    if (!confirm("Are you sure you want to activate this employee? Ensure all required documents and details are complete.")) return;
    setIsActivating(true);
    try {
      await apiSend(`/api/employees/lifecycle?id=${employee.data.id}`, "POST", {
        status: "ACTIVE",
        onboardingDeclared: true,
      });
      setRefreshKey(k => k + 1);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to activate");
    } finally {
      setIsActivating(false);
    }
  }

  async function deactivateEmployee() {
    if (!selected || !employee?.data) return;
    const reason = prompt("Please provide a reason for deactivation:");
    if (!reason) return;
    setIsDeactivating(true);
    try {
      await apiSend(`/api/employees/lifecycle?id=${employee.data.id}`, "POST", {
        status: "INACTIVE",
        separationReason: reason,
      });
      setRefreshKey(k => k + 1);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to deactivate");
    } finally {
      setIsDeactivating(false);
    }
  }

  async function reactivateEmployee() {
    if (!selected || !employee?.data) return;
    if (!confirm("Are you sure you want to reactivate this employee?")) return;
    setIsActivating(true);
    try {
      await apiSend(`/api/employees/lifecycle?id=${employee.data.id}`, "POST", {
        status: "ACTIVE",
      });
      setRefreshKey(k => k + 1);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to reactivate");
    } finally {
      setIsActivating(false);
    }
  }

  async function exitEmployee() {
    if (!selected || !employee?.data) return;
    const reason = prompt("Please provide a reason for marking as exited:");
    if (!reason) return;
    setIsDeactivating(true);
    try {
      await apiSend(`/api/employees/lifecycle?id=${employee.data.id}`, "POST", {
        status: "EXITED",
        separationReason: reason,
      });
      setRefreshKey(k => k + 1);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to mark as exited");
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
      apiGet<{ roles: RoleDefinitionView[] }>(`/api/role-definitions?organizationId=${selected.organizationId}&locationId=${selected.locationId}`),
      apiGet<{ data: any[] }>(`/api/employees/proposals?employeeId=${employeeId}`)
    ]).then(async ([empPayload, assignsPayload, rolesPayload, proposalsPayload]) => {
      if (cancelled) return;
      setError(null);
      
      let mgr = null;
      if (empPayload.employee.reportingEmployeeId) {
        try {
          const m = await apiGet<{employee: EmployeeView}>(`/api/employees?id=${empPayload.employee.reportingEmployeeId}`);
          mgr = m.employee;
        } catch(e) {
          console.error("Failed to load manager details", e);
        }
      }
      
      if (cancelled) return;
      setManager(mgr);
      setEmployee({ requestKey, data: empPayload.employee });
      setAssignments({ requestKey, items: assignsPayload.assignments });
      setAvailableRoles(rolesPayload.roles.filter(r => r.isActive));
      setPendingProposal(proposalsPayload.data?.[0] || null);
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

  async function handleRemoveRole(assignmentId: string, roleName: string) {
    if (!selected) return;
    if (!confirm(`Are you sure you want to remove the role "${roleName}" from this employee?`)) return;
    setAssignError(null);
    try {
      const res = await fetch(`/api/employee-role-assignments?organizationId=${selected.organizationId}&locationId=${selected.locationId}&employeeId=${employeeId}&id=${assignmentId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to remove role");
      }
      setRefreshKey((k) => k + 1);
    } catch (caught) {
      setAssignError(caught instanceof Error ? caught.message : "Failed to remove role");
    }
  }

  async function handleResetPassword() {
    if (!selected) return;
    const newPassword = prompt("Enter new password (minimum 8 characters):");
    if (!newPassword) return;
    if (newPassword.length < 8) {
      alert("Password must be at least 8 characters long.");
      return;
    }
    if (!confirm("Are you sure you want to reset this employee's password? All their active sessions will be revoked.")) return;
    
    try {
      await apiSend(`/api/employees/${employeeId}/reset-password`, "POST", { newPassword });
      alert("Password reset successfully.");
    } catch (caught) {
      alert(caught instanceof Error ? caught.message : "Failed to reset password.");
    }
  }

  if (!selected) return <StatusMessage tone="empty">Select an organization location to view profile.</StatusMessage>;
  const requestKey = `${selected.organizationId}:${selected.locationId}:${employeeId}`;
  if (error?.requestKey === requestKey) return <StatusMessage tone="error">{error.message}</StatusMessage>;
  if (!employee || employee.requestKey !== requestKey || !assignments) return <StatusMessage tone="loading">Loading profile…</StatusMessage>;

  const emp = employee.data;

  const unassignedRoles = availableRoles.filter(
    (role) => !assignments.items.some((assign) => assign.role?.id === role.id)
  );

  const isProposalRequired = emp.status === "ACTIVE" && !session.isOwner;

  async function handleApproveProposal() {
    if (!pendingProposal) return;
    try {
      await apiSend(`/api/employees/proposals/${pendingProposal.id}/approve`, "POST", {});
      setRefreshKey(k => k + 1);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to approve proposal");
    }
  }

  async function handleRejectProposal() {
    if (!pendingProposal) return;
    const comment = prompt("Please provide a reason for rejection:");
    if (!comment) return;
    try {
      await apiSend(`/api/employees/proposals/${pendingProposal.id}/reject`, "POST", { reviewComment: comment });
      setRefreshKey(k => k + 1);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to reject proposal");
    }
  }

  if (isEditing) {
    return (
      <div style={{ padding: "0 0 40px 0" }}>
        <EmployeeForm 
          organizationId={selected.organizationId}
          locationId={selected.locationId}
          initialData={emp}
          isProposal={isProposalRequired}
          onCancel={() => setIsEditing(false)}
          onSuccess={() => {
            setIsEditing(false);
            setRefreshKey(k => k + 1);
          }}
        />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", paddingBottom: "60px" }}>
      <div className="kalki-page-header">
        <Link href={`/people?organizationId=${selected.organizationId}&locationId=${selected.locationId}`} className="kalki-breadcrumbs">
          &lt; Back to People
        </Link>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <h1 className="kalki-page-title">{emp.person.displayName}</h1>
            <p className="kalki-page-description">
              {emp.employeeCode} &middot; {emp.jobTitle ?? "No job title"}
            </p>
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <button className="kalki-button kalki-button--secondary" onClick={() => setIsEditing(true)} disabled={!!pendingProposal}>
              {isProposalRequired ? "Propose Change" : "Edit"}
            </button>
            {emp.status === "DRAFT" && (
              <button className="kalki-button kalki-button--secondary" style={{ color: "var(--kalki-success)", borderColor: "var(--kalki-success)" }} onClick={() => void activateEmployee()} disabled={isActivating}>
                Activate
              </button>
            )}
            {emp.status === "ACTIVE" && (
              <>
                {session.isOwner && emp.userId && (
                  <button className="kalki-button kalki-button--secondary" onClick={() => void handleResetPassword()}>
                    Reset Password
                  </button>
                )}
                <button className="kalki-button kalki-button--danger" onClick={() => void deactivateEmployee()} disabled={isDeactivating}>
                  Deactivate
                </button>
                <button className="kalki-button kalki-button--danger" onClick={() => void exitEmployee()} disabled={isDeactivating}>
                  Mark Exited
                </button>
              </>
            )}
            {emp.status === "INACTIVE" && (
              <>
                <button className="kalki-button kalki-button--secondary" style={{ color: "var(--kalki-success)", borderColor: "var(--kalki-success)" }} onClick={() => void reactivateEmployee()} disabled={isActivating}>
                  Reactivate
                </button>
                <button className="kalki-button kalki-button--danger" onClick={() => void exitEmployee()} disabled={isDeactivating}>
                  Mark Exited
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {pendingProposal && (
        <div className="kalki-section" style={{ border: "2px solid #f59e0b" }}>
          <div className="kalki-section-header" style={{ background: "#fef3c7", color: "#92400e" }}>
            <span className="kalki-section-title">Pending Change Request</span>
            {session.isOwner && (
              <div style={{ display: "flex", gap: "8px" }}>
                <button className="kalki-button kalki-button--danger" onClick={() => void handleRejectProposal()}>Reject</button>
                <button className="kalki-button kalki-button--primary" onClick={() => void handleApproveProposal()}>Approve</button>
              </div>
            )}
          </div>
          <div className="kalki-section-content">
            <p style={{ margin: "0 0 8px 0", fontSize: "14px", fontWeight: 500 }}>Reason: {pendingProposal.reason}</p>
            <p style={{ margin: "0 0 16px 0", fontSize: "13px", color: "var(--kalki-text-secondary)" }}>Review the proposed payload carefully. This employee cannot be edited again until this proposal is resolved.</p>
            <pre style={{ margin: 0, fontSize: "12px", background: "#f8fafc", padding: "12px", borderRadius: "4px", border: "1px solid var(--kalki-border)", overflowX: "auto" }}>
              {JSON.stringify(pendingProposal.proposedPayload, null, 2)}
            </pre>
          </div>
        </div>
      )}

      <div className="kalki-form-layout">
        <div className="kalki-form-main">
          
          <section className="kalki-section">
            <div className="kalki-section-header">
              <h2 className="kalki-section-title">Personal Information</h2>
            </div>
            <div className="kalki-section-content">
              <div className="kalki-grid-2-col">
                <InfoItem label="Date of Birth" value={emp.person.dateOfBirth ? `${new Date(emp.person.dateOfBirth).toLocaleDateString('en-GB').replace(/\//g, '-')} (${Math.floor((new Date().getTime() - new Date(emp.person.dateOfBirth).getTime()) / 31557600000)} yrs)` : null} />
                <InfoItem label="Gender" value={emp.gender} />
                <InfoItem label="Blood Group" value={emp.bloodGroup} />
                <InfoItem label="Marital Status" value={emp.maritalStatus} />
                <InfoItem label="Phone" value={emp.person.phone} />
                <InfoItem label="Email" value={emp.person.email} />
                
                <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginBottom: "16px" }}>
                  <span style={{ fontSize: "12px", color: "var(--kalki-text-secondary)", fontWeight: 500 }}>System Access</span>
                  <div style={{ marginTop: "2px" }}>
                    {emp.userId ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <div><span className="kalki-badge kalki-badge--success">Access Provisioned</span></div>
                        {provisionSuccess && <span style={{ fontSize: "12px", color: "var(--kalki-success)" }}>{provisionSuccess}</span>}
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <div>
                          <button 
                            className="kalki-button kalki-button--secondary kalki-button--sm" 
                            onClick={handleProvisionAccess} 
                            disabled={isProvisioning}
                            title="Generate System Login Credentials"
                          >
                            {isProvisioning ? "Provisioning..." : "Provision System Access"}
                          </button>
                        </div>
                        {provisionError && <span style={{ fontSize: "12px", color: "var(--kalki-danger)" }}>{provisionError}</span>}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <InfoItem label="Residential Address" value={emp.residentialAddress} />
                </div>
              </div>
            </div>
          </section>

          <section className="kalki-section">
            <div className="kalki-section-header">
              <h2 className="kalki-section-title">Employment Information</h2>
            </div>
            <div className="kalki-section-content">
              <div className="kalki-grid-2-col">
                <InfoItem label="Employee ID" value={emp.employeeCode} strong />
                <InfoItem 
                  label="Status" 
                  value={
                    <span className={`kalki-badge kalki-badge--${emp.status === 'ACTIVE' ? 'success' : emp.status === 'DRAFT' ? 'warning' : 'danger'}`}>
                      {emp.status}
                    </span>
                  } 
                />
                <InfoItem label="Category" value={emp.category} />
                <InfoItem label="Date of Joining" value={new Date(emp.employmentStartDate).toLocaleDateString('en-GB').replace(/\//g, '-')} />
                <InfoItem label="Department" value={emp.departmentName} />
                <InfoItem label="Job Title" value={emp.jobTitle} />
                <InfoItem 
                  label="Reporting To" 
                  value={manager ? (
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span>{manager.person.displayName}</span>
                      <span style={{ fontSize: "12px", color: "var(--kalki-text-secondary)" }}>
                        {manager.employeeCode} &middot; {manager.jobTitle ?? 'Employee'}
                      </span>
                    </div>
                  ) : null} 
                />
                <InfoItem label="Biometric ID" value={emp.biometricId} />
                <InfoItem label="POYS ID" value={emp.posId} />
              </div>
            </div>
          </section>

          <section className="kalki-section">
            <div className="kalki-section-header">
              <h2 className="kalki-section-title">Family & Emergency Contacts</h2>
            </div>
            <div className="kalki-section-content" style={{ padding: 0 }}>
              {emp.familyContacts?.length === 0 ? (
                <div style={{ padding: "20px", color: "var(--kalki-text-secondary)", fontSize: "14px", fontStyle: "italic" }}>
                  No family or emergency contacts recorded.
                </div>
              ) : (
                <div className="kalki-table-container">
                  <table className="kalki-table">
                    <thead>
                      <tr>
                        <th>Category</th>
                        <th>Name</th>
                        <th>Relationship</th>
                        <th>Mobile</th>
                      </tr>
                    </thead>
                    <tbody>
                      {emp.familyContacts?.map(contact => (
                        <tr key={contact.id}>
                          <td><span className="kalki-badge kalki-badge--default" style={{ fontSize: "10px" }}>{contact.category.replace('_', ' ')}</span></td>
                          <td>
                            {contact.category === 'PARENT' ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span>Father: {contact.fatherName}</span>
                                <span>Mother: {contact.motherName}</span>
                              </div>
                            ) : (
                              contact.name
                            )}
                          </td>
                          <td>{contact.relationship || "-"}</td>
                          <td>{contact.mobile || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          <section className="kalki-section">
            <div className="kalki-section-header">
              <h2 className="kalki-section-title">Salary & Payment</h2>
              <button className="kalki-button kalki-button--ghost kalki-button--sm" onClick={() => setIsEditingSalary(true)} disabled={!!pendingProposal}>
                {isProposalRequired ? "Propose Salary Change" : "Edit"}
              </button>
            </div>
            {isEditingSalary ? (
              <div className="kalki-section-content" style={{ background: "#f8fafc", borderBottom: "1px solid var(--kalki-border)" }}>
                <EmployeeSalaryForm 
                  employeeId={emp.id}
                  initialData={emp.salaryInfo}
                  isProposal={isProposalRequired}
                  onCancel={() => setIsEditingSalary(false)}
                  onSuccess={() => {
                    setIsEditingSalary(false);
                    setRefreshKey(k => k + 1);
                  }}
                />
              </div>
            ) : null}
            <div className="kalki-section-content">
              {!emp.salaryInfo ? (
                <div style={{ color: "var(--kalki-text-secondary)", fontSize: "14px", fontStyle: "italic" }}>
                  No salary information recorded.
                </div>
              ) : (
                <div className="kalki-grid-2-col">
                  <InfoItem label="Salary Type" value={emp.salaryInfo.salaryType} />
                  <InfoItem label="Amount" value={`₹${emp.salaryInfo.amount}`} strong />
                  <InfoItem label="Payment Method" value={emp.salaryInfo.paymentMethod.replace('_', ' ')} />
                  {emp.salaryInfo.paymentMethod === 'BANK_TRANSFER' && (
                    <>
                      <InfoItem label="Account Holder" value={emp.salaryInfo.accountHolderName} />
                      <InfoItem label="Account Number" value={emp.salaryInfo.accountNumber} />
                      <InfoItem label="Bank" value={emp.salaryInfo.bankName} />
                      <InfoItem label="IFSC" value={emp.salaryInfo.ifscCode} />
                    </>
                  )}
                  {emp.salaryInfo.paymentMethod === 'GPAY' && (
                    <>
                      <InfoItem label="GPay Number" value={emp.salaryInfo.gpayNumber} />
                      <InfoItem label="Banking Name" value={emp.salaryInfo.bankingName} />
                    </>
                  )}
                </div>
              )}
            </div>
          </section>

          <section className="kalki-section">
            <div className="kalki-section-header">
              <h2 className="kalki-section-title">Employment History</h2>
            </div>
            <div className="kalki-section-content">
              {(!emp.history || (emp.history.status?.length === 0 && emp.history.category?.length === 0 && emp.history.salary?.length === 0)) ? (
                <div style={{ color: "var(--kalki-text-secondary)", fontSize: "14px", fontStyle: "italic" }}>
                  No employment changes recorded yet.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {emp.history.status?.length > 0 && (
                    <div>
                      <h4 style={{ margin: "0 0 8px 0", fontSize: "13px", color: "var(--kalki-text-secondary)" }}>Status Changes</h4>
                      <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "14px" }}>
                        {emp.history.status.map((h: any) => (
                          <li key={h.id} style={{ marginBottom: "4px" }}>
                            <strong>{h.status}</strong> &mdash; Effective {new Date(h.effectiveFrom).toLocaleDateString('en-GB').replace(/\//g, '-')}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {emp.history.salary?.length > 0 && (
                    <div>
                      <h4 style={{ margin: "0 0 8px 0", fontSize: "13px", color: "var(--kalki-text-secondary)" }}>Salary Changes</h4>
                      <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "14px" }}>
                        {emp.history.salary.map((h: any) => (
                          <li key={h.id} style={{ marginBottom: "4px" }}>
                            <strong>{h.salaryType} - ₹{h.amount}</strong> &mdash; Effective {new Date(h.effectiveFrom).toLocaleDateString('en-GB').replace(/\//g, '-')}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          {emp.history.audit && emp.history.audit.length > 0 && (
            <section className="kalki-section">
              <div className="kalki-section-header">
                <h2 className="kalki-section-title">Detailed Field Changes</h2>
              </div>
              <div className="kalki-section-content" style={{ padding: 0 }}>
                <div className="kalki-table-container">
                  <table className="kalki-table">
                    <thead>
                      <tr>
                        <th>Date & Time</th>
                        <th>Field Changed</th>
                        <th>Previous Value</th>
                        <th>New Value</th>
                        <th>Changed By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {emp.history.audit.map((h: any) => (
                        <tr key={h.id}>
                          <td>{new Date(h.createdAt).toLocaleString('en-GB')}</td>
                          <td><strong>{h.field}</strong></td>
                          <td>{h.oldValue}</td>
                          <td>{h.newValue}</td>
                          <td>{h.actorName} <span style={{color: "var(--kalki-text-secondary)", fontSize: "12px"}}>— {h.actorRole}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

        </div>

        <div className="kalki-form-secondary">
          
          <section className="kalki-section">
            <div className="kalki-section-header">
              <h2 className="kalki-section-title">Roles & Access</h2>
            </div>
            <div className="kalki-section-content">
              {assignments.items.length === 0 ? (
                <div style={{ color: "var(--kalki-text-secondary)", fontSize: "14px", fontStyle: "italic", marginBottom: "16px" }}>
                  No roles assigned.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px" }}>
                  {assignments.items.map((assign) => (
                    <div key={assign.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", border: "1px solid var(--kalki-border)", borderRadius: "var(--radius-sm)" }}>
                      <div>
                        <span style={{ fontSize: "14px", fontWeight: 500, display: "block" }}>{assign.role.name}</span>
                      </div>
                      <button type="button" className="kalki-button kalki-button--ghost kalki-button--sm" style={{ color: "var(--kalki-danger)", padding: "4px 8px" }} onClick={() => void handleRemoveRole(assign.id, assign.role.name)}>
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <div style={{ borderTop: "1px solid var(--kalki-border)", paddingTop: "16px" }}>
                <h4 style={{ margin: "0 0 12px 0", fontSize: "13px", fontWeight: 600 }}>Assign a new role</h4>
                {assignError ? <StatusMessage tone="error">{assignError}</StatusMessage> : null}
                
                {availableRoles.length === 0 ? (
                  <p style={{ fontSize: "13px", color: "var(--kalki-text-secondary)", margin: 0 }}>No roles defined yet.</p>
                ) : unassignedRoles.length === 0 ? (
                  <p style={{ fontSize: "13px", color: "var(--kalki-text-secondary)", margin: 0 }}>All available roles assigned.</p>
                ) : (
                  <form onSubmit={(e) => void assignRole(e)} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <select className="kalki-select" value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} disabled={assigning}>
                      <option value="" disabled>Choose a role...</option>
                      {unassignedRoles.map((role) => (
                        <option key={role.id} value={role.id}>{role.name}</option>
                      ))}
                    </select>
                    <button type="submit" className="kalki-button kalki-button--primary" disabled={!selectedRole || assigning}>
                      {assigning ? "Assigning..." : "+ Assign"}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
