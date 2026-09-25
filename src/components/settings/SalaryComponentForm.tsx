import { useState } from "react";
import { apiSend } from "@/lib/api";

type Props = {
  organizationId: string;
  initialData?: {
    id: string;
    name: string;
    type: "EARNING" | "DEDUCTION";
    isTaxable: boolean;
    isActive: boolean;
  };
  onCancel: () => void;
  onSuccess: () => void;
};

export function SalaryComponentForm({ organizationId, initialData, onCancel, onSuccess }: Props) {
  const [name, setName] = useState(initialData?.name || "");
  const [type, setType] = useState<"EARNING" | "DEDUCTION">(initialData?.type || "EARNING");
  const [isTaxable, setIsTaxable] = useState(initialData ? initialData.isTaxable : true);
  
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSaving(true);
    
    try {
      if (initialData) {
        await apiSend(`/api/payroll/components?id=${initialData.id}`, "PATCH", {
          name,
          type,
          isTaxable,
        });
      } else {
        await apiSend(`/api/payroll/components`, "POST", {
          organizationId,
          name,
          type,
          isTaxable,
        });
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save salary component");
      setIsSaving(false);
    }
  }

  return (
    <form className="panel form-stack" onSubmit={handleSubmit}>
      <h3>{initialData ? "Edit Salary Component" : "New Salary Component"}</h3>
      
      {error && <div style={{ color: "var(--danger)", marginBottom: "1rem" }}>{error}</div>}

      <div className="form-group">
        <label>Component Name *</label>
        <input 
          type="text" 
          required 
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Basic Pay, HRA, Provident Fund"
          autoFocus
        />
      </div>

      <div className="form-group">
        <label>Type *</label>
        <select 
          required
          value={type}
          onChange={(e) => setType(e.target.value as "EARNING" | "DEDUCTION")}
        >
          <option value="EARNING">Earning</option>
          <option value="DEDUCTION">Deduction</option>
        </select>
      </div>

      <div className="form-group" style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.5rem" }}>
        <input 
          type="checkbox" 
          id={`taxable-${initialData?.id || 'new'}`}
          checked={isTaxable}
          onChange={(e) => setIsTaxable(e.target.checked)}
        />
        <label htmlFor={`taxable-${initialData?.id || 'new'}`} style={{ marginBottom: 0 }}>Is this component taxable?</label>
      </div>

      <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
        <button type="submit" className="action-button" disabled={isSaving || !name.trim()}>
          {isSaving ? "Saving..." : "Save Component"}
        </button>
        <button type="button" className="secondary-button" onClick={onCancel} disabled={isSaving}>
          Cancel
        </button>
      </div>
    </form>
  );
}
