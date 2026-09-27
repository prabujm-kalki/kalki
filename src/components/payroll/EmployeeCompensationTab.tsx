"use client";

import { useEffect, useState } from "react";
import { apiGet, apiSend } from "@/lib/api";
import { StatusMessage } from "@/components/StatusMessage";

type ComponentDef = {
  id: string;
  name: string;
  type: "EARNING" | "DEDUCTION";
  isTaxable: boolean;
};

type StructureComponent = {
  id: string;
  amount: string;
  component: ComponentDef;
};

type SalaryStructure = {
  id: string;
  effectiveFrom: string;
  isEpfApplicable: boolean;
  isEsiApplicable: boolean;
  isPtApplicable: boolean;
  components: StructureComponent[];
};

export function EmployeeCompensationTab({ employeeId, organizationId }: { employeeId: string, organizationId: string }) {
  const [structure, setStructure] = useState<{ requestKey: string; data: SalaryStructure | null }>({ requestKey: "", data: null });
  const [availableComponents, setAvailableComponents] = useState<ComponentDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Form State
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().split('T')[0]);
  const [isEpfApplicable, setIsEpfApplicable] = useState(false);
  const [isEsiApplicable, setIsEsiApplicable] = useState(false);
  const [isPtApplicable, setIsPtApplicable] = useState(false);
  const [componentAmounts, setComponentAmounts] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const requestKey = `${employeeId}-${refreshKey}`;
    
    setLoading(true);
    Promise.all([
      apiGet<{ structure: SalaryStructure | null }>(`/api/payroll/structures?employeeId=${employeeId}`),
      apiGet<{ components: ComponentDef[] }>(`/api/payroll/components?organizationId=${organizationId}`)
    ]).then(([structData, compsData]) => {
      if (cancelled) return;
      setStructure({ requestKey, data: structData.structure });
      const activeComps = (compsData.components || []).filter((c: any) => c.isActive !== false);
      const uniqueComps = Array.from(new Map(activeComps.map((c: any) => [c.name, c])).values());
      setAvailableComponents(uniqueComps as ComponentDef[]);
      
      if (structData.structure) {
        setIsEpfApplicable(structData.structure.isEpfApplicable);
        setIsEsiApplicable(structData.structure.isEsiApplicable);
        setIsPtApplicable(structData.structure.isPtApplicable);
        const amounts: Record<string, string> = {};
        structData.structure.components.forEach(c => {
          amounts[c.component.id] = c.amount;
        });
        setComponentAmounts(amounts);
      } else {
        setIsEpfApplicable(false);
        setIsEsiApplicable(false);
        setIsPtApplicable(false);
        setComponentAmounts({});
      }
      setLoading(false);
    }).catch(err => {
      if (!cancelled) {
        setError(err instanceof Error ? err.message : "Failed to load compensation data");
        setLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [employeeId, organizationId, refreshKey]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const availableCompIds = new Set(availableComponents.map(c => c.id));
      const componentsToSave = Object.entries(componentAmounts).filter(([compId]) => availableCompIds.has(compId))
        .filter(([_, amount]) => amount && parseFloat(amount) > 0)
        .map(([componentId, amount]) => ({
          componentId,
          amount
        }));

      await apiSend(`/api/payroll/structures`, "POST", {
        organizationId,
        employeeId,
        effectiveFrom,
        isEpfApplicable,
        isEsiApplicable,
        isPtApplicable,
        components: componentsToSave
      });

      setIsEditing(false);
      setRefreshKey(k => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save salary structure");
    } finally {
      setIsSaving(false);
    }
  }

  function handleAmountChange(compId: string, value: string) {
    setComponentAmounts(prev => ({
      ...prev,
      [compId]: value
    }));
  }

  if (loading) return <div style={{ padding: "1rem" }}><StatusMessage tone="loading">Loading compensation details...</StatusMessage></div>;

  const s = structure.data;

  // Deduplicate active structure components by name to hide ghost duplicates
  if (s && !isEditing) {
    const uniqueSComps = Array.from(new Map(s.components.map(c => [c.component.name, c])).values());
    s.components = uniqueSComps;
  }

  // Calculate totals
  let totalEarnings = 0;
  let totalDeductions = 0;
  if (s && !isEditing) {
    s.components.forEach(c => {
      const amt = parseFloat(c.amount) || 0;
      if (c.component.type === "EARNING") totalEarnings += amt;
      if (c.component.type === "DEDUCTION") totalDeductions += amt;
    });
  }

  const earningsComps = availableComponents.filter(c => c.type === "EARNING");
  const deductionsComps = availableComponents.filter(c => c.type === "DEDUCTION");

  return (
    <div className="kalki-section">
      <div className="kalki-section-header">
        <h2 className="kalki-section-title">Compensation & Payroll</h2>
        {!isEditing && (
          <button className="kalki-button kalki-button--ghost kalki-button--sm" onClick={() => setIsEditing(true)}>
            {s ? "Revise Structure" : "Set up Structure"}
          </button>
        )}
      </div>
      
      {error && <StatusMessage tone="error">{error}</StatusMessage>}

      <div className="kalki-section-content">
        {isEditing ? (
          <form onSubmit={handleSave} className="form-stack">
            <div className="form-group" style={{ maxWidth: "300px" }}>
              <label>Effective From Date *</label>
              <input type="date" required value={effectiveFrom} onChange={e => setEffectiveFrom(e.target.value)} />
            </div>

            <div style={{ display: "flex", gap: "2rem", margin: "1rem 0" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input type="checkbox" checked={isEpfApplicable} onChange={e => setIsEpfApplicable(e.target.checked)} />
                EPF Applicable
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input type="checkbox" checked={isEsiApplicable} onChange={e => setIsEsiApplicable(e.target.checked)} />
                ESI Applicable
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input type="checkbox" checked={isPtApplicable} onChange={e => setIsPtApplicable(e.target.checked)} />
                Prof. Tax Applicable
              </label>
            </div>

            <div className="kalki-grid-2-col">
              <div>
                <h4 style={{ marginBottom: "1rem", color: "var(--kalki-success)" }}>Earnings</h4>
                {earningsComps.length === 0 ? <p className="muted">No earning components defined.</p> : null}
                {earningsComps.map(c => (
                  <div key={c.id} className="form-group" style={{ marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "1rem" }}>
                    <label style={{ flex: 1, marginBottom: 0 }}>{c.name}</label>
                    <input 
                      type="number" 
                      step="0.01"
                      min="0"
                      style={{ width: "150px" }}
                      placeholder="0.00"
                      value={componentAmounts[c.id] || ""}
                      onChange={e => handleAmountChange(c.id, e.target.value)}
                    />
                  </div>
                ))}
              </div>
              <div>
                <h4 style={{ marginBottom: "1rem", color: "var(--danger)" }}>Deductions</h4>
                {deductionsComps.length === 0 ? <p className="muted">No deduction components defined.</p> : null}
                {deductionsComps.map(c => (
                  <div key={c.id} className="form-group" style={{ marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "1rem" }}>
                    <label style={{ flex: 1, marginBottom: 0 }}>{c.name}</label>
                    <input 
                      type="number" 
                      step="0.01"
                      min="0"
                      style={{ width: "150px" }}
                      placeholder="0.00"
                      value={componentAmounts[c.id] || ""}
                      onChange={e => handleAmountChange(c.id, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
              <button type="submit" className="action-button" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Structure"}
              </button>
              <button type="button" className="secondary-button" onClick={() => setIsEditing(false)} disabled={isSaving}>
                Cancel
              </button>
            </div>
          </form>
        ) : !s ? (
          <div style={{ color: "var(--kalki-text-secondary)", fontSize: "14px", fontStyle: "italic" }}>
            No salary structure assigned.
          </div>
        ) : (
          <div>
            <div style={{ display: "flex", gap: "2rem", marginBottom: "1.5rem", fontSize: "14px" }}>
              <div><strong>Effective From:</strong> {new Date(s.effectiveFrom).toLocaleDateString()}</div>
              <div><strong>EPF:</strong> {s.isEpfApplicable ? "Yes" : "No"}</div>
              <div><strong>ESI:</strong> {s.isEsiApplicable ? "Yes" : "No"}</div>
              <div><strong>PT:</strong> {s.isPtApplicable ? "Yes" : "No"}</div>
            </div>

            <div className="kalki-grid-2-col">
              <div style={{ border: "1px solid var(--kalki-border)", borderRadius: "var(--radius-md)", padding: "1rem" }}>
                <h4 style={{ margin: "0 0 1rem 0", color: "var(--kalki-success)" }}>Earnings</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {s.components.filter(c => c.component.type === "EARNING").map(c => (
                    <div key={c.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                      <span>{c.component.name}</span>
                      <span>₹{Number(c.amount).toFixed(2)}</span>
                    </div>
                  ))}
                  <div style={{ borderTop: "1px solid var(--kalki-border)", marginTop: "0.5rem", paddingTop: "0.5rem", display: "flex", justifyContent: "space-between", fontWeight: 600 }}>
                    <span>Total Gross</span>
                    <span>₹{totalEarnings.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div style={{ border: "1px solid var(--kalki-border)", borderRadius: "var(--radius-md)", padding: "1rem" }}>
                <h4 style={{ margin: "0 0 1rem 0", color: "var(--danger)" }}>Deductions</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {s.components.filter(c => c.component.type === "DEDUCTION").map(c => (
                    <div key={c.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                      <span>{c.component.name}</span>
                      <span>₹{Number(c.amount).toFixed(2)}</span>
                    </div>
                  ))}
                  <div style={{ borderTop: "1px solid var(--kalki-border)", marginTop: "0.5rem", paddingTop: "0.5rem", display: "flex", justifyContent: "space-between", fontWeight: 600 }}>
                    <span>Total Deductions</span>
                    <span>₹{totalDeductions.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: "1rem", padding: "1rem", backgroundColor: "var(--kalki-primary-light)", color: "var(--kalki-primary-dark)", borderRadius: "var(--radius-md)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 600 }}>Net Payable Salary</span>
              <span style={{ fontSize: "1.25rem", fontWeight: 700 }}>₹{(totalEarnings - totalDeductions).toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
