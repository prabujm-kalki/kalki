"use client";

import React, { useState, useEffect } from "react";
import { Plus, CheckCircle, XCircle, X } from "lucide-react";
import styles from "./page.module.css";
import { fetchAdvancesDashboardData, submitAdvanceRequestAction, approveOrRejectAdvanceAction } from "./actions";
import { useSearchParams } from "next/navigation";

import { Suspense } from "react";

function AdvancesDashboardContent() {
  const [requests, setRequests] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const searchParams = useSearchParams();
  const orgId = searchParams.get("organizationId");

  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  
  const [selectedRequest, setSelectedRequest] = useState<any>(null);

  // New Request Form
  const [reqForm, setReqForm] = useState({
    employeeId: "",
    advanceTypeId: "",
    requestedAmount: "",
    repaymentMonths: "1",
  });

  // Approve Form
  const [approveForm, setApproveForm] = useState({
    approvedAmount: "",
    repaymentMonths: "",
  });

  const loadData = async () => {
    setIsLoading(true);
    const res = await fetchAdvancesDashboardData(orgId || undefined);
    if (res.success && res.data) {
      setRequests(res.data.requests || []);
      setTypes(res.data.types || []);
      setEmployees(res.data.employees || []);
    } else {
      setError(res.error || "Failed to load dashboard data");
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [orgId]);

  const handleSubmitRequest = async () => {
    if (!reqForm.employeeId || !reqForm.advanceTypeId || !reqForm.requestedAmount) {
      alert("Please fill all required fields.");
      return;
    }
    const res = await submitAdvanceRequestAction({
      employeeId: reqForm.employeeId,
      advanceTypeId: reqForm.advanceTypeId,
      requestedAmount: parseFloat(reqForm.requestedAmount),
      repaymentMonths: parseInt(reqForm.repaymentMonths),
    });

    if (res.success) {
      setIsRequestModalOpen(false);
      loadData();
    } else {
      alert(res.error || "Failed to submit request.");
    }
  };

  const handleOpenApprove = (req: any) => {
    setSelectedRequest(req);
    setApproveForm({
      approvedAmount: req.requestedAmount,
      repaymentMonths: req.repaymentMonths || "1",
    });
    setIsApproveModalOpen(true);
  };

  const handleApprove = async () => {
    if (!approveForm.approvedAmount || !approveForm.repaymentMonths) {
      alert("Amount and repayment months are required.");
      return;
    }
    const res = await approveOrRejectAdvanceAction(
      selectedRequest.id, 
      "APPROVED", 
      parseFloat(approveForm.approvedAmount), 
      parseInt(approveForm.repaymentMonths)
    );

    if (res.success) {
      setIsApproveModalOpen(false);
      loadData();
    } else {
      alert(res.error || "Failed to approve.");
    }
  };

  const handleReject = async (req: any) => {
    if (!confirm("Are you sure you want to reject this request?")) return;
    const res = await approveOrRejectAdvanceAction(req.id, "REJECTED");
    if (res.success) {
      loadData();
    } else {
      alert(res.error || "Failed to reject.");
    }
  };

  const getBadgeClass = (status: string) => {
    if (status === "APPROVED") return styles.badgeApproved;
    if (status === "REJECTED") return styles.badgeRejected;
    return styles.badgePending;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Employee Advances & Loans</h1>
          <p className={styles.subtitle}>Review and manage advance requests</p>
        </div>
        <button className={styles.btn} onClick={() => {
          setReqForm({ employeeId: "", advanceTypeId: "", requestedAmount: "", repaymentMonths: "1" });
          setIsRequestModalOpen(true);
        }}>
          <Plus size={16} /> New Request
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.card}>
        {isLoading ? (
          <div className={styles.noData}>Loading requests...</div>
        ) : requests.length === 0 ? (
          <div className={styles.noData}>No advance requests found.</div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Employee</th>
                  <th>Advance Type</th>
                  <th>Requested Amt</th>
                  <th>Approved Amt</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(r => (
                  <tr key={r.id}>
                    <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{r.employeeName}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>{r.employeeCode}</div>
                    </td>
                    <td>{r.advanceTypeName}</td>
                    <td>₹{Number(r.requestedAmount).toLocaleString()}</td>
                    <td>{r.approvedAmount ? `₹${Number(r.approvedAmount).toLocaleString()} (${r.repaymentMonths}mo)` : '-'}</td>
                    <td>
                      <span className={`${styles.badge} ${getBadgeClass(r.status)}`}>{r.status}</span>
                    </td>
                    <td>
                      {r.status === "PENDING" && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className={`${styles.btn} ${styles.btnApprove}`} onClick={() => handleOpenApprove(r)}>
                            Approve
                          </button>
                          <button className={`${styles.btn} ${styles.btnReject}`} onClick={() => handleReject(r)}>
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* NEW REQUEST MODAL */}
      {isRequestModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Submit Advance Request</h2>
              <button className={styles.closeBtn} onClick={() => setIsRequestModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className={styles.formGroup}>
              <label className={styles.label}>Select Employee</label>
              <select className={styles.select} value={reqForm.employeeId} onChange={e => setReqForm({...reqForm, employeeId: e.target.value})}>
                <option value="">-- Choose --</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.displayName} ({emp.employeeCode})</option>
                ))}
              </select>
            </div>
            
            <div className={styles.formGroup}>
              <label className={styles.label}>Advance Type</label>
              <select className={styles.select} value={reqForm.advanceTypeId} onChange={e => setReqForm({...reqForm, advanceTypeId: e.target.value})}>
                <option value="">-- Choose --</option>
                {types.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Requested Amount (₹)</label>
              <input type="number" className={styles.input} value={reqForm.requestedAmount} onChange={e => setReqForm({...reqForm, requestedAmount: e.target.value})} />
            </div>
            
            <div className={styles.formGroup}>
              <label className={styles.label}>Requested Repayment Months</label>
              <input type="number" min="1" className={styles.input} value={reqForm.repaymentMonths} onChange={e => setReqForm({...reqForm, repaymentMonths: e.target.value})} />
            </div>

            <div className={styles.modalFooter}>
              <button className={`${styles.btn} ${styles.btnOutline}`} onClick={() => setIsRequestModalOpen(false)}>Cancel</button>
              <button className={styles.btn} onClick={handleSubmitRequest}>Submit Request</button>
            </div>
          </div>
        </div>
      )}

      {/* APPROVE MODAL */}
      {isApproveModalOpen && selectedRequest && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Approve Advance Request</h2>
              <button className={styles.closeBtn} onClick={() => setIsApproveModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ marginBottom: '16px', padding: '12px', background: '#f8f9fa', borderRadius: '6px' }}>
              <div style={{ fontSize: '13px', color: '#666' }}>Employee</div>
              <div style={{ fontWeight: 500, marginBottom: '8px' }}>{selectedRequest.employeeName}</div>
              <div style={{ fontSize: '13px', color: '#666' }}>Requested Amount</div>
              <div style={{ fontWeight: 600, color: '#111' }}>₹{Number(selectedRequest.requestedAmount).toLocaleString()}</div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Approved Amount (₹)</label>
              <input type="number" className={styles.input} value={approveForm.approvedAmount} onChange={e => setApproveForm({...approveForm, approvedAmount: e.target.value})} />
            </div>
            
            <div className={styles.formGroup}>
              <label className={styles.label}>Approved Repayment Months</label>
              <input type="number" min="1" className={styles.input} value={approveForm.repaymentMonths} onChange={e => setApproveForm({...approveForm, repaymentMonths: e.target.value})} />
            </div>

            <div className={styles.modalFooter}>
              <button className={`${styles.btn} ${styles.btnOutline}`} onClick={() => setIsApproveModalOpen(false)}>Cancel</button>
              <button className={`${styles.btn} ${styles.btnApprove}`} onClick={handleApprove}><CheckCircle size={16}/> Confirm Approval</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function AdvancesDashboardPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AdvancesDashboardContent />
    </Suspense>
  );
}
