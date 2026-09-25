"use client";

import { useState, useEffect } from "react";
import { Save, Edit, Plus, Trash2 } from "lucide-react";
import { upsertLeaveConfig } from "@/domains/attendance/actions";
import { useToast } from "@/components/ui/Toast";

export function LeaveConfigForm({ 
  initialConfigs, 
  orgId, 
  locId,
  roles 
}: { 
  initialConfigs: any[], 
  orgId: string, 
  locId: string,
  roles: {id: string, name: string}[] 
}) {
  const [configs, setConfigs] = useState(initialConfigs);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const { addToast } = useToast();

  const [id, setId] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [isPaid, setIsPaid] = useState(true);
  const [annualAllocation, setAnnualAllocation] = useState("0");
  const [accrualFrequency, setAccrualFrequency] = useState("YEARLY");
  const [accrualRate, setAccrualRate] = useState("");
  const [carryForwardExpiryMonths, setCarryForwardExpiryMonths] = useState("");
  const [minTenureDays, setMinTenureDays] = useState("0");
  const [minNoticeDays, setMinNoticeDays] = useState("0");
  const [maxConsecutiveDays, setMaxConsecutiveDays] = useState("");
  const [isEncashable, setIsEncashable] = useState(false);
  const [encashmentMinTenureDays, setEncashmentMinTenureDays] = useState("365");
  const [encashmentMinBalanceRetained, setEncashmentMinBalanceRetained] = useState("3");
  const [encashmentOnlyAtYearEnd, setEncashmentOnlyAtYearEnd] = useState(true);
  const [restrictedUsageDays, setRestrictedUsageDays] = useState<string[]>([]);
  const [allowedApplicationWindow, setAllowedApplicationWindow] = useState<string[]>([]);
  const [rolePolicies, setRolePolicies] = useState<{ businessRoleId: string, customAccrualRate: string, maxConcurrentLeaves: string }[]>([]);
  const [departmentPolicies, setDepartmentPolicies] = useState<{ departmentId: string, maxConcurrentLeaves: string }[]>([]);

  const [departments, setDepartments] = useState<{id: string, name: string}[]>([]);
  useEffect(() => {
    fetch(`/api/departments?organizationId=${orgId}`)
      .then(res => res.json())
      .then(data => setDepartments(data.departments || []))
      .catch(console.error);
  }, [orgId]);

  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const handleEdit = (config: any) => {
    setId(config.id);
    setCode(config.code);
    setName(config.name);
    setIsPaid(config.isPaid);
    setAnnualAllocation(config.annualAllocation);
    setAccrualFrequency(config.accrualFrequency || "YEARLY");
    setAccrualRate(config.accrualRate || "");
    setCarryForwardExpiryMonths(config.carryForwardExpiryMonths || "");
    setMinTenureDays(config.minTenureDays?.toString() || "0");
    setMinNoticeDays(config.minNoticeDays?.toString() || "0");
    setMaxConsecutiveDays(config.maxConsecutiveDays?.toString() || "");
    setIsEncashable(config.isEncashable || false);
    setEncashmentMinTenureDays(config.encashmentMinTenureDays?.toString() || "365");
    setEncashmentMinBalanceRetained(config.encashmentMinBalanceRetained?.toString() || "3");
    setEncashmentOnlyAtYearEnd(config.encashmentOnlyAtYearEnd !== undefined ? config.encashmentOnlyAtYearEnd : true);
    setRestrictedUsageDays(config.restrictedUsageDays || []);
    setAllowedApplicationWindow(config.allowedApplicationWindow || []);
    setRolePolicies([]); 
  };

  const toggleDay = (day: string, list: string[], setList: (val: string[]) => void) => {
    if (list.includes(day)) {
      setList(list.filter(d => d !== day));
    } else {
      setList([...list, day]);
    }
  };

  const addRolePolicy = () => {
    setRolePolicies([...rolePolicies, { businessRoleId: "", customAccrualRate: "", maxConcurrentLeaves: "" }]);
  };

  const updateRolePolicy = (index: number, field: string, value: string) => {
    const updated = [...rolePolicies];
    updated[index] = { ...updated[index], [field]: value };
    setRolePolicies(updated);
  };

  const removeRolePolicy = (index: number) => {
    setRolePolicies(rolePolicies.filter((_, i) => i !== index));
  };

  const addDepartmentPolicy = () => {
    setDepartmentPolicies([...departmentPolicies, { departmentId: "", maxConcurrentLeaves: "" }]);
  };

  const updateDepartmentPolicy = (index: number, field: string, value: string) => {
    const updated = [...departmentPolicies];
    updated[index] = { ...updated[index], [field]: value };
    setDepartmentPolicies(updated);
  };

  const removeDepartmentPolicy = (index: number) => {
    setDepartmentPolicies(departmentPolicies.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const payload = {
        ...(id ? { id } : {}),
        code,
        name,
        isPaid,
        annualAllocation,
        accrualFrequency,
        accrualRate: accrualRate ? String(accrualRate) : undefined,
        carryForwardExpiryMonths: carryForwardExpiryMonths ? Number(carryForwardExpiryMonths) : undefined,
        minTenureDays: Number(minTenureDays),
        minNoticeDays: Number(minNoticeDays),
        maxConsecutiveDays: maxConsecutiveDays ? Number(maxConsecutiveDays) : undefined,
        isEncashable,
        encashmentMinTenureDays: Number(encashmentMinTenureDays),
        encashmentMinBalanceRetained: encashmentMinBalanceRetained,
        encashmentOnlyAtYearEnd,
        restrictedUsageDays,
        allowedApplicationWindow,
        rolePolicies: rolePolicies.map(p => ({
          businessRoleId: p.businessRoleId,
          customAccrualRate: p.customAccrualRate || undefined,
          maxConcurrentLeaves: p.maxConcurrentLeaves ? Number(p.maxConcurrentLeaves) : undefined
        })),
        departmentPolicies: departmentPolicies.map(p => ({
          departmentId: p.departmentId,
          maxConcurrentLeaves: p.maxConcurrentLeaves ? Number(p.maxConcurrentLeaves) : undefined
        }))
      };

      const res = await upsertLeaveConfig(payload, orgId, locId);
      
      if (res.success) {
        addToast({ type: "success", message: "Saved successfully!" });
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        setError(res.error || "Failed to save");
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      <form onSubmit={handleSubmit} className="att-card" style={{ maxWidth: "800px" }}>
        <h3 className="att-title" style={{ fontSize: "1.25rem", marginBottom: "1.5rem" }}>
          {id ? "Edit Leave Type" : "Create Leave Type"}
        </h3>
        
        {error && <div style={{ color: "red", marginBottom: "1rem" }}>{error}</div>}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontWeight: 500 }}>
            Leave Code
            <input 
              type="text" 
              value={code} 
              onChange={e => setCode(e.target.value)}
              placeholder="e.g. SL, CL, PL"
              style={{ padding: "0.5rem", borderRadius: "var(--att-radius)", border: "1px solid var(--att-border)" }}
              required 
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontWeight: 500 }}>
            Leave Name
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Sick Leave"
              style={{ padding: "0.5rem", borderRadius: "var(--att-radius)", border: "1px solid var(--att-border)" }}
              required 
            />
          </label>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", margin: "1rem 0" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 500 }}>
            <input 
              type="checkbox" 
              checked={isPaid} 
              onChange={e => setIsPaid(e.target.checked)}
            />
            Is Paid Leave?
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 500 }}>
            <input 
              type="checkbox" 
              checked={isEncashable} 
              onChange={e => setIsEncashable(e.target.checked)}
            />
            Eligible for Encashment?
          </label>
        </div>
        
        {isEncashable && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1rem", padding: "1rem", background: "#f8f9fa", borderRadius: "var(--att-radius)", border: "1px solid #e9ecef" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontWeight: 500 }}>
              Encashment Min Tenure (Days)
              <input type="number" value={encashmentMinTenureDays} onChange={e => setEncashmentMinTenureDays(e.target.value)} min="0" style={{ padding: "0.5rem", borderRadius: "var(--att-radius)", border: "1px solid var(--att-border)" }} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontWeight: 500 }}>
              Min Balance Retained (Days)
              <input type="number" value={encashmentMinBalanceRetained} onChange={e => setEncashmentMinBalanceRetained(e.target.value)} min="0" step="0.5" style={{ padding: "0.5rem", borderRadius: "var(--att-radius)", border: "1px solid var(--att-border)" }} />
            </label>
            <label style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "0.5rem", fontWeight: 500, marginTop: "1.5rem" }}>
              <input type="checkbox" checked={encashmentOnlyAtYearEnd} onChange={e => setEncashmentOnlyAtYearEnd(e.target.checked)} />
              Only at Financial Year End?
            </label>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontWeight: 500 }}>
            Annual Allocation (Days)
            <input 
              type="number" 
              value={annualAllocation} 
              onChange={e => setAnnualAllocation(e.target.value)}
              min="0"
              step="0.5"
              style={{ padding: "0.5rem", borderRadius: "var(--att-radius)", border: "1px solid var(--att-border)" }}
              required 
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontWeight: 500 }}>
            Accrual Frequency
            <select 
              value={accrualFrequency} 
              onChange={e => setAccrualFrequency(e.target.value)}
              style={{ padding: "0.5rem", borderRadius: "var(--att-radius)", border: "1px solid var(--att-border)" }}
            >
              <option value="YEARLY">Yearly</option>
              <option value="MONTHLY">Monthly</option>
              <option value="PRO_RATA">Pro-Rata</option>
            </select>
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontWeight: 500 }}>
            Accrual Rate (Days per period)
            <input 
              type="number" 
              value={accrualRate} 
              onChange={e => setAccrualRate(e.target.value)}
              min="0"
              step="0.1"
              style={{ padding: "0.5rem", borderRadius: "var(--att-radius)", border: "1px solid var(--att-border)" }}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontWeight: 500 }}>
            Carry Forward Expiry (Months)
            <input 
              type="number" 
              value={carryForwardExpiryMonths} 
              onChange={e => setCarryForwardExpiryMonths(e.target.value)}
              min="0"
              placeholder="e.g. 2"
              style={{ padding: "0.5rem", borderRadius: "var(--att-radius)", border: "1px solid var(--att-border)" }}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontWeight: 500 }}>
            Minimum Tenure (Days)
            <input 
              type="number" 
              value={minTenureDays} 
              onChange={e => setMinTenureDays(e.target.value)}
              min="0"
              placeholder="e.g. 90"
              style={{ padding: "0.5rem", borderRadius: "var(--att-radius)", border: "1px solid var(--att-border)" }}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontWeight: 500 }}>
            Advance Notice (Days)
            <input 
              type="number" 
              value={minNoticeDays} 
              onChange={e => setMinNoticeDays(e.target.value)}
              min="0"
              placeholder="e.g. 14"
              style={{ padding: "0.5rem", borderRadius: "var(--att-radius)", border: "1px solid var(--att-border)" }}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontWeight: 500 }}>
            Max Consecutive Days
            <input 
              type="number" 
              value={maxConsecutiveDays} 
              onChange={e => setMaxConsecutiveDays(e.target.value)}
              min="1"
              placeholder="e.g. 5"
              style={{ padding: "0.5rem", borderRadius: "var(--att-radius)", border: "1px solid var(--att-border)" }}
            />
          </label>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <p style={{ fontWeight: 500, marginBottom: "0.5rem" }}>Restricted Usage Days</p>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            {daysOfWeek.map(day => (
              <label key={day} style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.875rem" }}>
                <input 
                  type="checkbox" 
                  checked={restrictedUsageDays.includes(day)}
                  onChange={() => toggleDay(day, restrictedUsageDays, setRestrictedUsageDays)}
                />
                {day}
              </label>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <p style={{ fontWeight: 500, marginBottom: "0.5rem" }}>Allowed Application Window Days</p>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            {daysOfWeek.map(day => (
              <label key={day} style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.875rem" }}>
                <input 
                  type="checkbox" 
                  checked={allowedApplicationWindow.includes(day)}
                  onChange={() => toggleDay(day, allowedApplicationWindow, setAllowedApplicationWindow)}
                />
                {day}
              </label>
            ))}
          </div>
        </div>

        <div style={{ padding: "1rem", border: "1px solid var(--att-border)", borderRadius: "var(--att-radius)", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h4 style={{ fontWeight: 600, margin: 0 }}>Role-Based Overrides</h4>
            <button type="button" onClick={addRolePolicy} className="att-button" style={{ display: "flex", alignItems: "center", gap: "0.25rem", padding: "0.25rem 0.75rem", fontSize: "0.875rem" }}>
              <Plus size={14} /> Add Role Rule
            </button>
          </div>
          
          {rolePolicies.length === 0 ? (
            <p style={{ fontSize: "0.875rem", color: "var(--att-text-muted)", margin: 0 }}>No role-based overrides defined.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {rolePolicies.map((policy, index) => (
                <div key={index} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: "0.75rem", alignItems: "end" }}>
                  <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.875rem" }}>
                    Business Role
                    <select
                      value={policy.businessRoleId}
                      onChange={e => updateRolePolicy(index, "businessRoleId", e.target.value)}
                      style={{ padding: "0.4rem", borderRadius: "var(--att-radius)", border: "1px solid var(--att-border)" }}
                      required
                    >
                      <option value="">Select Role</option>
                      {roles.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.875rem" }}>
                    Custom Accrual Rate
                    <input 
                      type="number" 
                      value={policy.customAccrualRate} 
                      onChange={e => updateRolePolicy(index, "customAccrualRate", e.target.value)}
                      step="0.1"
                      placeholder="e.g. 2.0"
                      style={{ padding: "0.4rem", borderRadius: "var(--att-radius)", border: "1px solid var(--att-border)" }}
                    />
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.875rem" }}>
                    Max Concurrent Leaves
                    <input 
                      type="number" 
                      value={policy.maxConcurrentLeaves} 
                      onChange={e => updateRolePolicy(index, "maxConcurrentLeaves", e.target.value)}
                      min="1"
                      placeholder="e.g. 3"
                      style={{ padding: "0.4rem", borderRadius: "var(--att-radius)", border: "1px solid var(--att-border)" }}
                    />
                  </label>
                  <button 
                    type="button" 
                    onClick={() => removeRolePolicy(index)}
                    style={{ padding: "0.4rem", backgroundColor: "transparent", color: "red", border: "1px solid red", borderRadius: "var(--att-radius)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div style={{ padding: "1rem", border: "1px solid var(--att-border)", borderRadius: "var(--att-radius)", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h4 style={{ fontWeight: 600, margin: 0 }}>Department-Based Overrides</h4>
            <button type="button" onClick={addDepartmentPolicy} className="att-button" style={{ display: "flex", alignItems: "center", gap: "0.25rem", padding: "0.25rem 0.75rem", fontSize: "0.875rem" }}>
              <Plus size={14} /> Add Department Rule
            </button>
          </div>
          
          {departmentPolicies.length === 0 ? (
            <p style={{ fontSize: "0.875rem", color: "var(--att-text-muted)", margin: 0 }}>No department-based overrides defined.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {departmentPolicies.map((policy, index) => (
                <div key={index} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "0.75rem", alignItems: "end" }}>
                  <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.875rem" }}>
                    Department
                    <select
                      value={policy.departmentId}
                      onChange={e => updateDepartmentPolicy(index, "departmentId", e.target.value)}
                      style={{ padding: "0.4rem", borderRadius: "var(--att-radius)", border: "1px solid var(--att-border)" }}
                      required
                    >
                      <option value="">Select Department</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                      ))}
                    </select>
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.875rem" }}>
                    Max Concurrent Leaves
                    <input 
                      type="number" 
                      value={policy.maxConcurrentLeaves} 
                      onChange={e => updateDepartmentPolicy(index, "maxConcurrentLeaves", e.target.value)}
                      min="1"
                      placeholder="e.g. 3"
                      style={{ padding: "0.4rem", borderRadius: "var(--att-radius)", border: "1px solid var(--att-border)" }}
                      required
                    />
                  </label>
                  <button 
                    type="button" 
                    onClick={() => removeDepartmentPolicy(index)}
                    style={{ padding: "0.4rem", backgroundColor: "transparent", color: "red", border: "1px solid red", borderRadius: "var(--att-radius)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button type="submit" disabled={isSubmitting} className="att-button" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
          <Save size={16} /> {id ? "Update Configuration" : "Save Configuration"}
        </button>
      </form>

      <div className="att-card">
        <h3 className="att-title" style={{ fontSize: "1.25rem", marginBottom: "1.5rem" }}>Configured Leave Types</h3>
        {configs.length === 0 ? (
          <p style={{ color: "var(--att-text-muted)" }}>No leave types configured.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="att-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Paid</th>
                  <th>Allocation</th>
                  <th>Accrual Freq</th>
                  <th>Rate</th>
                  <th>Min Tenure</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {configs.map((config) => (
                  <tr key={config.id}>
                    <td><strong>{config.code}</strong></td>
                    <td>{config.name}</td>
                    <td>{config.isPaid ? "Yes" : "No"}</td>
                    <td>{config.annualAllocation}</td>
                    <td>{config.accrualFrequency}</td>
                    <td>{config.accrualRate || "-"}</td>
                    <td>{config.minTenureDays ? `${config.minTenureDays} days` : "-"}</td>
                    <td>
                      <button 
                        type="button"
                        onClick={() => handleEdit(config)}
                        className="att-button" 
                        style={{ padding: "0.25rem 0.5rem", backgroundColor: "transparent", color: "var(--att-accent)", border: "1px solid var(--att-accent)" }}
                      >
                        <Edit size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
