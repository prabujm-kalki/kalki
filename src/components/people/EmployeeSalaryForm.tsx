"use client";

import { useState, type FormEvent } from "react";
import { apiSend } from "@/lib/api";

type EmployeeSalaryFormProps = {
  employeeId: string;
  initialData?: any;
  isProposal?: boolean;
  onCancel: () => void;
  onSuccess: () => void;
};

export function EmployeeSalaryForm({ employeeId, initialData, isProposal, onCancel, onSuccess }: EmployeeSalaryFormProps) {
  const [salaryType, setSalaryType] = useState(initialData?.salaryType ?? "Monthly");
  const [amount, setAmount] = useState(initialData?.amount ?? "");
  const [paymentMethod, setPaymentMethod] = useState(initialData?.paymentMethod ?? "BANK_TRANSFER");
  
  const [accountHolderName, setAccountHolderName] = useState(initialData?.accountHolderName ?? "");
  const [accountNumber, setAccountNumber] = useState(initialData?.accountNumber ?? "");
  const [bankName, setBankName] = useState(initialData?.bankName ?? "");
  const [ifscCode, setIfscCode] = useState(initialData?.ifscCode ?? "");
  
  const [gpayNumber, setGpayNumber] = useState(initialData?.gpayNumber ?? "");
  const [bankingName, setBankingName] = useState(initialData?.bankingName ?? "");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    
    try {
      const payload = {
        salaryType,
        amount,
        paymentMethod,
        ...(paymentMethod === "BANK_TRANSFER" ? { accountHolderName, accountNumber, bankName, ifscCode } : {}),
        ...(paymentMethod === "GPAY" ? { gpayNumber, bankingName } : {}),
      };

      if (isProposal) {
        const reason = prompt("Please provide a reason for proposing this salary change:");
        if (!reason) {
          setSaving(false);
          return;
        }
        await apiSend(`/api/employees/proposals`, "POST", {
          employeeId,
          reason,
          salary: payload,
        });
      } else {
        await apiSend(`/api/employees/salary?id=${employeeId}`, "POST", payload);
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update salary");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="stack" style={{ background: "var(--bg-color)", padding: "1.5rem", borderRadius: "8px", border: "1px solid var(--border)" }}>
      <h3>Update Salary Information</h3>
      {error && <div className="status-message" data-tone="error">{error}</div>}
      
      <div className="grid-2" style={{ gap: "1rem" }}>
        <div className="field">
          <label>Salary Type</label>
          <select value={salaryType} onChange={(e) => setSalaryType(e.target.value)}>
            <option value="Daily">Daily</option>
            <option value="Weekly">Weekly</option>
            <option value="Monthly">Monthly</option>
          </select>
        </div>
        <div className="field">
          <label>Amount (₹)</label>
          <input type="number" step="0.01" min="0" required value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
      </div>

      <div className="field">
        <label>Payment Method</label>
        <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
          <option value="BANK_TRANSFER">Bank Transfer</option>
          <option value="GPAY">GPay</option>
          <option value="CASH">Cash</option>
        </select>
      </div>

      {paymentMethod === "BANK_TRANSFER" && (
        <div className="grid-2" style={{ gap: "1rem" }}>
          <div className="field">
            <label>Account Holder Name</label>
            <input type="text" required value={accountHolderName} onChange={(e) => setAccountHolderName(e.target.value)} />
          </div>
          <div className="field">
            <label>Account Number</label>
            <input type="text" required value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
          </div>
          <div className="field">
            <label>Bank Name</label>
            <input type="text" required value={bankName} onChange={(e) => setBankName(e.target.value)} />
          </div>
          <div className="field">
            <label>IFSC Code</label>
            <input type="text" required value={ifscCode} onChange={(e) => setIfscCode(e.target.value)} />
          </div>
        </div>
      )}

      {paymentMethod === "GPAY" && (
        <div className="grid-2" style={{ gap: "1rem" }}>
          <div className="field">
            <label>GPay Number</label>
            <input type="tel" required value={gpayNumber} onChange={(e) => setGpayNumber(e.target.value)} />
          </div>
          <div className="field">
            <label>Banking Name</label>
            <input type="text" required value={bankingName} onChange={(e) => setBankingName(e.target.value)} />
          </div>
        </div>
      )}

      <div className="row" style={{ gap: "1rem", marginTop: "1rem" }}>
        <button type="button" className="secondary-button" onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="submit" className="action-button" disabled={saving}>{saving ? "Saving..." : (isProposal ? "Propose Salary" : "Save Salary")}</button>
      </div>
    </form>
  );
}
