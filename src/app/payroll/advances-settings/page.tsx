"use client";

import React, { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, X, Save, AlertCircle } from "lucide-react";
import styles from "./page.module.css";
import { 
  fetchAdvanceTypesAction, 
  createAdvanceTypeAction, 
  updateAdvanceTypeAction, 
  deleteAdvanceTypeAction 
} from "./actions";
import { useSearchParams } from "next/navigation";

import { Suspense } from "react";

function AdvancesSettingsContent() {
  const [types, setTypes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const orgId = searchParams.get("organizationId");

  // Form State
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    calculationBasis: "FIXED",
    maxCapPercentage: "",
    maxCeilingAmount: "",
    maxRepaymentMonths: "",
    minTenureDays: "",
    allowConcurrentAdvances: false,
    isActive: true,
  });

  const loadTypes = async () => {
    setIsLoading(true);
    const res = await fetchAdvanceTypesAction(orgId || undefined);
    if (res.success) {
      setTypes(res.data || []);
    } else {
      setError(res.error || "Failed to load types");
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadTypes();
  }, [orgId]);

  const handleAddNew = () => {
    setCurrentId(null);
    setFormData({
      code: "",
      name: "",
      calculationBasis: "FIXED",
      maxCapPercentage: "",
      maxCeilingAmount: "",
      maxRepaymentMonths: "",
      minTenureDays: "",
      allowConcurrentAdvances: false,
      isActive: true,
    });
    setIsEditing(true);
    setError("");
  };

  const handleEdit = (t: any) => {
    setCurrentId(t.id);
    setFormData({
      code: t.code || "",
      name: t.name || "",
      calculationBasis: t.calculationBasis || "FIXED",
      maxCapPercentage: t.maxCapPercentage?.toString() || "",
      maxCeilingAmount: t.maxCeilingAmount?.toString() || "",
      maxRepaymentMonths: t.maxRepaymentMonths?.toString() || "",
      minTenureDays: t.minTenureDays?.toString() || "",
      allowConcurrentAdvances: t.allowConcurrentAdvances ?? false,
      isActive: t.isActive ?? true,
    });
    setIsEditing(true);
    setError("");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this Advance Type?")) return;
    const res = await deleteAdvanceTypeAction(id);
    if (res.success) {
      loadTypes();
    } else {
      setError(res.error || "Failed to delete");
    }
  };

  const handleSave = async () => {
    if (!formData.code || !formData.name) {
      setError("Code and Name are required.");
      return;
    }
    setError("");

    const payload = {
      code: formData.code,
      name: formData.name,
      calculationBasis: formData.calculationBasis,
      maxCapPercentage: formData.maxCapPercentage ? parseInt(formData.maxCapPercentage) : undefined,
      maxCeilingAmount: formData.maxCeilingAmount ? formData.maxCeilingAmount : undefined,
      maxRepaymentMonths: formData.maxRepaymentMonths ? parseInt(formData.maxRepaymentMonths) : undefined,
      minTenureDays: formData.minTenureDays ? parseInt(formData.minTenureDays) : undefined,
      allowConcurrentAdvances: formData.allowConcurrentAdvances,
      isActive: formData.isActive,
    };

    let res;
    if (currentId) {
      res = await updateAdvanceTypeAction(currentId, payload);
    } else {
      res = await createAdvanceTypeAction(payload, orgId || undefined);
    }

    if (res.success) {
      setIsEditing(false);
      loadTypes();
    } else {
      setError(res.error || "Failed to save.");
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Advances & Loans Settings</h1>
          <p className={styles.subtitle}>Configure dynamic rules and policies for employee advances.</p>
        </div>
        {!isEditing && (
          <button className={styles.btn} onClick={handleAddNew}>
            <Plus size={16} /> Add New Type
          </button>
        )}
      </div>

      {error && (
        <div className={styles.card} style={{ borderLeft: '4px solid #d93025', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={18} color="#d93025" />
          <span style={{ color: '#d93025', fontSize: '14px', fontWeight: 500 }}>{error}</span>
        </div>
      )}

      {isEditing ? (
        <div className={styles.card}>
          <h2 className={styles.title} style={{ fontSize: '18px', marginBottom: '20px' }}>
            {currentId ? "Edit Advance Type" : "Create Advance Type"}
          </h2>
          
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Code</label>
              <input 
                className={styles.input} 
                value={formData.code} 
                onChange={e => setFormData({...formData, code: e.target.value})} 
                placeholder="e.g. SAL-ADV"
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Name</label>
              <input 
                className={styles.input} 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
                placeholder="e.g. Salary Advance"
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Calculation Basis</label>
              <select 
                className={styles.select}
                value={formData.calculationBasis}
                onChange={e => setFormData({...formData, calculationBasis: e.target.value})}
              >
                <option value="FIXED">Fixed Amount</option>
                <option value="PERCENTAGE_GROSS">Percentage of Gross</option>
                <option value="PERCENTAGE_BASIC">Percentage of Basic</option>
                <option value="PERCENTAGE_OF_EARNED_SALARY">Percentage of Earned Salary (so far)</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Max Cap Percentage (%)</label>
              <input 
                className={styles.input} 
                type="number"
                value={formData.maxCapPercentage} 
                onChange={e => setFormData({...formData, maxCapPercentage: e.target.value})} 
                placeholder="e.g. 50"
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Max Ceiling Amount (₹)</label>
              <input 
                className={styles.input} 
                type="number"
                value={formData.maxCeilingAmount} 
                onChange={e => setFormData({...formData, maxCeilingAmount: e.target.value})} 
                placeholder="e.g. 50000"
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Max Repayment Months</label>
              <input 
                className={styles.input} 
                type="number"
                value={formData.maxRepaymentMonths} 
                onChange={e => setFormData({...formData, maxRepaymentMonths: e.target.value})} 
                placeholder="e.g. 6"
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Min Tenure Days Required</label>
              <input 
                className={styles.input} 
                type="number"
                value={formData.minTenureDays} 
                onChange={e => setFormData({...formData, minTenureDays: e.target.value})} 
                placeholder="e.g. 180"
              />
            </div>
            <div className={styles.formGroup}>
              <div className={styles.checkboxGroup} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="checkbox" 
                  checked={formData.allowConcurrentAdvances}
                  onChange={e => setFormData({...formData, allowConcurrentAdvances: e.target.checked})}
                />
                <label className={styles.label} style={{ cursor: 'pointer' }} onClick={() => setFormData({...formData, allowConcurrentAdvances: !formData.allowConcurrentAdvances})}>
                  Allow this advance when another advance is already active
                </label>
              </div>
              <div className={styles.checkboxGroup} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                <input 
                  type="checkbox" 
                  checked={formData.isActive}
                  onChange={e => setFormData({...formData, isActive: e.target.checked})}
                />
                <label className={styles.label} style={{ cursor: 'pointer' }} onClick={() => setFormData({...formData, isActive: !formData.isActive})}>
                  Active (Available for requests)
                </label>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
            <button className={styles.btn} onClick={handleSave}>
              <Save size={16} /> Save Configuration
            </button>
            <button className={`${styles.btn} ${styles.btnOutline}`} onClick={() => setIsEditing(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.card}>
          {isLoading ? (
            <div className={styles.noData}>Loading configurations...</div>
          ) : types.length === 0 ? (
            <div className={styles.noData}>No Advance Types configured yet. Click "Add New Type" to begin.</div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Basis</th>
                    <th>Max Cap</th>
                    <th>Ceiling (₹)</th>
                    <th>Max Months</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {types.map(t => (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 500 }}>{t.code}</td>
                      <td>{t.name}</td>
                      <td>{t.calculationBasis}</td>
                      <td>{t.maxCapPercentage ? `${t.maxCapPercentage}%` : 'None'}</td>
                      <td>{t.maxCeilingAmount ? `₹${t.maxCeilingAmount}` : 'None'}</td>
                      <td>{t.maxRepaymentMonths || 'None'}</td>
                      <td>
                        <span style={{ 
                          padding: '4px 8px', 
                          borderRadius: '12px', 
                          fontSize: '12px',
                          background: t.isActive ? '#e6f4ea' : '#fce8e6',
                          color: t.isActive ? '#137333' : '#c5221f'
                        }}>
                          {t.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className={styles.actionCell}>
                        <button className={styles.iconBtn} onClick={() => handleEdit(t)} title="Edit">
                          <Edit2 size={16} />
                        </button>
                        <button className={styles.iconBtn} onClick={() => handleDelete(t.id)} title="Delete">
                          <Trash2 size={16} color="#d93025" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdvancesSettingsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AdvancesSettingsContent />
    </Suspense>
  );
}
