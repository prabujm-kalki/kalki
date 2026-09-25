"use client";

import React, { useState, useEffect } from "react";
import { HandCoins } from "lucide-react";
import { apiGet } from "@/lib/api";
import { createSalaryAdvance } from "@/domains/payroll/actions";

type Advance = {
  id: string;
  amount: string;
  reason: string | null;
  dateGiven: string | null;
  status: string;
  repaymentMethod: string;
  employee: {
    name: string;
    employeeId: string;
  };
};

export function SalaryAdvancesTab({ organizationId, locationId }: { organizationId: string, locationId: string }) {
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<any[]>([]);
  
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    employeeId: "",
    amount: "",
    reason: "",
    dateGiven: new Date().toISOString().split('T')[0],
    repaymentMethod: "DEDUCT_FROM_PAYROLL"
  });

  const fetchAdvances = async () => {
    setLoading(true);
    try {
      const res = await apiGet(`/api/payroll/advances?orgId=${organizationId}&locId=${locationId}`) as any;
      if (res.advances) setAdvances(res.advances);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await apiGet(`/api/employees?organizationId=${organizationId}&locationId=${locationId}`) as any;
      if (res.employees) setEmployees(res.employees);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (organizationId && locationId) {
      fetchAdvances();
      fetchEmployees();
    }
  }, [organizationId, locationId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await createSalaryAdvance({
        ...formData,
        repaymentMethod: formData.repaymentMethod as "DEDUCT_FROM_PAYROLL" | "MANUAL_CASH",
        organizationId,
        locationId
      });
      if (res.success) {
        setShowModal(false);
        fetchAdvances();
        setFormData({
          employeeId: "",
          amount: "",
          reason: "",
          dateGiven: new Date().toISOString().split('T')[0],
          repaymentMethod: "DEDUCT_FROM_PAYROLL"
        });
      } else {
        alert(res.error || "Failed to record advance");
      }
    } catch (error) {
      console.error(error);
      alert("Error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="kalki-card">
      <div className="kalki-section-header">
        <h3 className="kalki-section-title">
          <HandCoins size={20} className="kalki-icon-accent" /> Salary Advances & Deductions
        </h3>
        <button className="kalki-btn kalki-btn-primary" onClick={() => setShowModal(true)}>
          Record Advance
        </button>
      </div>
      <p className="kalki-text-muted" style={{ marginBottom: '1.5rem' }}>
        Track and manage employee loans and advances that need to be deducted from upcoming payrolls.
      </p>
      
      <div className="kalki-table-container">
        <table className="kalki-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Amount</th>
              <th>Date Given</th>
              <th>Status</th>
              <th>Method</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>Loading...</td>
              </tr>
            ) : advances.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--kalki-text-muted)' }}>
                  No active salary advances found.
                </td>
              </tr>
            ) : (
              advances.map(adv => (
                <tr key={adv.id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{adv.employee?.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--kalki-text-muted)' }}>{adv.employee?.employeeId}</div>
                  </td>
                  <td>₹{adv.amount}</td>
                  <td>{adv.dateGiven ? new Date(adv.dateGiven).toLocaleDateString() : '-'}</td>
                  <td>
                    <span className={`kalki-badge ${adv.status === 'PENDING' ? 'kalki-badge-warning' : 'kalki-badge-success'}`}>
                      {adv.status}
                    </span>
                  </td>
                  <td>{adv.repaymentMethod === 'DEDUCT_FROM_PAYROLL' ? 'Payroll Deduction' : 'Manual Cash'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="kalki-modal-overlay">
          <div className="kalki-modal">
            <div className="kalki-modal-header">
              <h2>Record Salary Advance</h2>
              <button className="kalki-modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="kalki-modal-content">
                <div className="kalki-form-group">
                  <label>Employee</label>
                  <select 
                    className="kalki-input" 
                    value={formData.employeeId}
                    onChange={e => setFormData({...formData, employeeId: e.target.value})}
                    required
                  >
                    <option value="">Select Employee...</option>
                    {employees.map((e: any) => (
                      <option key={e.id} value={e.id}>{e.person?.firstName} {e.person?.lastName} - {e.employeeCode}</option>
                    ))}
                  </select>
                </div>
                
                <div className="kalki-form-group">
                  <label>Amount (₹)</label>
                  <input 
                    type="number" 
                    className="kalki-input" 
                    value={formData.amount}
                    onChange={e => setFormData({...formData, amount: e.target.value})}
                    required
                    min="1"
                  />
                </div>

                <div className="kalki-form-group">
                  <label>Date Given</label>
                  <input 
                    type="date" 
                    className="kalki-input" 
                    value={formData.dateGiven}
                    onChange={e => setFormData({...formData, dateGiven: e.target.value})}
                    required
                  />
                </div>

                <div className="kalki-form-group">
                  <label>Repayment Method</label>
                  <select 
                    className="kalki-input" 
                    value={formData.repaymentMethod}
                    onChange={e => setFormData({...formData, repaymentMethod: e.target.value})}
                    required
                  >
                    <option value="DEDUCT_FROM_PAYROLL">Deduct from next Payroll</option>
                    <option value="MANUAL_CASH">Manual Cash Repayment</option>
                  </select>
                </div>

                <div className="kalki-form-group">
                  <label>Reason / Notes (Optional)</label>
                  <textarea 
                    className="kalki-input" 
                    value={formData.reason}
                    onChange={e => setFormData({...formData, reason: e.target.value})}
                    rows={3}
                  />
                </div>
              </div>
              <div className="kalki-modal-footer">
                <button type="button" className="kalki-btn kalki-btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="kalki-btn kalki-btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save Advance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
