import React, { useState, useEffect } from "react";
import { apiGet, apiSend } from "@/lib/api";
import { Save, User, Building, Landmark, Smartphone, RefreshCw, AlertTriangle, Settings } from "lucide-react";
import { ManageComponentsModal } from "./ManageComponentsModal";

interface Employee {
  id: string;
  employeeCode: string;
  person: {
    firstName: string;
    lastName: string;
    displayName: string;
  };
}

interface Component {
  id: string;
  name: string;
  type: "EARNING" | "DEDUCTION";
  isTaxable: boolean;
}

interface StructureComponent {
  componentId: string;
  amount: string;
}

interface SalaryStructure {
  id?: string;
  employeeId: string;
  payBasis: string;
  isEpfApplicable: boolean;
  isEsiApplicable: boolean;
  isPtApplicable: boolean;
  effectiveFrom: string;
  effectiveTo?: string | null;
  components: StructureComponent[];
}

interface SalaryInfo {
  paymentMethod: "BANK_TRANSFER" | "GPAY" | "CASH";
  accountHolderName?: string;
  accountNumber?: string;
  bankName?: string;
  ifscCode?: string;
  gpayNumber?: string;
  bankingName?: string;
}

export function PayConfigurationTab({ organizationId, locationId }: { organizationId: string, locationId: string }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  
  const [activeComponents, setActiveComponents] = useState<Component[]>([]);
  const [structure, setStructure] = useState<SalaryStructure | null>(null);
  const [info, setInfo] = useState<SalaryInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showManageComponents, setShowManageComponents] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, [organizationId, locationId]);

  useEffect(() => {
    if (selectedEmployeeId) {
      fetchEmployeeData(selectedEmployeeId);
    } else {
      setStructure(null);
      setInfo(null);
    }
  }, [selectedEmployeeId]);

  const fetchInitialData = async () => {
    if (!organizationId || !locationId) return;
    try {
      setLoading(true);
      
      // Fetch separately to avoid one failure breaking the other
      let emps: Employee[] = [];
      let comps: Component[] = [];
      
      try {
        const empsRes = await apiGet<any>(`/api/employees?organizationId=${organizationId}&locationId=${locationId}`);
        emps = empsRes.employees || [];
      } catch (e: any) {
        console.warn("Failed to fetch employees:", e.message);
      }
      
      try {
        const compsRes = await apiGet<any>(`/api/payroll/components?organizationId=${organizationId}`);
        // Filter out inactive components and deduplicate by name
        const activeComps = (compsRes.components || []).filter((c: any) => c.isActive !== false);
        const uniqueComps = Array.from(new Map(activeComps.map((c: any) => [c.name, c])).values());
        comps = uniqueComps as any;
      } catch (e: any) {
        console.warn("Failed to fetch components:", e.message);
      }
      
      setEmployees(emps);
      setActiveComponents(comps);
    } catch (error) {
      console.warn("Error in fetchInitialData:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeeData = async (employeeId: string) => {
    try {
      setLoading(true);
      
      let structData: any = null;
      let infoData: any = null;
      
      try {
        const structRes = await apiGet<any>(`/api/payroll/structures?employeeId=${employeeId}`);
        structData = structRes.structure;
      } catch (e: any) {
        console.warn("Failed to fetch structures:", e.message);
      }
      
      try {
        const infoRes = await apiGet<any>(`/api/payroll/info?employeeId=${employeeId}`);
        infoData = infoRes.info;
      } catch (e: any) {
        console.warn("Failed to fetch info:", e.message);
      }

      if (structData) {
        setStructure({
          employeeId,
          payBasis: structData.payBasis || "MONTHLY",
          isEpfApplicable: structData.isEpfApplicable,
          isEsiApplicable: structData.isEsiApplicable,
          isPtApplicable: structData.isPtApplicable,
          effectiveFrom: new Date().toISOString().split('T')[0], // Always propose new effective date for changes
          components: structData.components.map((c: any) => ({
            componentId: c.component.id,
            amount: c.amount.toString()
          }))
        });
      } else {
        setStructure({
          employeeId,
          payBasis: "MONTHLY",
          isEpfApplicable: false,
          isEsiApplicable: false,
          isPtApplicable: false,
          effectiveFrom: new Date().toISOString().split('T')[0],
          components: []
        });
      }

      if (infoData) {
        setInfo(infoData);
      } else {
        setInfo({ paymentMethod: "BANK_TRANSFER" });
      }
    } catch (error) {
      console.warn("Failed to load employee pay configuration:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleComponentChange = (componentId: string, amount: string) => {
    if (!structure) return;
    const exists = structure.components.find(c => c.componentId === componentId);
    let newComps;
    if (exists) {
      newComps = structure.components.map(c => c.componentId === componentId ? { ...c, amount } : c);
    } else {
      newComps = [...structure.components, { componentId, amount }];
    }
    setStructure({ ...structure, components: newComps });
  };

  const getAmount = (componentId: string) => {
    return structure?.components.find(c => c.componentId === componentId)?.amount || "0";
  };

  const saveConfiguration = async () => {
    if (!selectedEmployeeId || !structure || !info) return;
    try {
      setSaving(true);
      
      // Save Structure
      await apiSend(`/api/payroll/structures`, "POST", {
        ...structure,
        components: (structure?.components || []).filter(c => c.amount && c.amount.trim() !== ""),
        organizationId,
        employeeId: selectedEmployeeId
      });

      // Save Info
      await apiSend(`/api/payroll/info`, "POST", {
        ...(info || { paymentMethod: "CASH" }),
        organizationId,
        employeeId: selectedEmployeeId
      });

      alert("Pay configuration saved successfully! A new structure version has been created.");
      fetchEmployeeData(selectedEmployeeId);
    } catch (error) {
      console.error(error);
      alert("Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  if (loading && !employees.length) return <div className="kalki-loading-placeholder">Loading...</div>;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "250px 1fr", gap: "2rem", alignItems: "start" }}>
      {/* Sidebar: Employee List */}
      <div className="kalki-card" style={{ padding: "0" }}>
        <div style={{ padding: "1rem", borderBottom: "1px solid var(--kalki-border)" }}>
          <h3 style={{ margin: 0, fontSize: "1rem" }}>Select Employee</h3>
        </div>
        <div style={{ maxHeight: "calc(100vh - 250px)", overflowY: "auto" }}>
          {employees.map(emp => (
            <div 
              key={emp.id} 
              onClick={() => setSelectedEmployeeId(emp.id)}
              style={{
                padding: "1rem",
                borderBottom: "1px solid var(--kalki-border)",
                cursor: "pointer",
                background: selectedEmployeeId === emp.id ? "var(--kalki-bg-secondary)" : "transparent",
                borderLeft: selectedEmployeeId === emp.id ? "4px solid var(--kalki-primary)" : "4px solid transparent"
              }}
            >
              <div style={{ fontWeight: 500 }}>{emp.person?.displayName}</div>
              <div style={{ fontSize: "0.8rem", color: "var(--kalki-text-muted)" }}>{emp.employeeCode}</div>
            </div>
          ))}
          {employees.length === 0 && (
            <div style={{ padding: "1rem", color: "var(--kalki-text-muted)" }}>No employees found in this location.</div>
          )}
        </div>
      </div>

      {/* Main Form Area */}
      <div className="kalki-card">
        {!selectedEmployeeId ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "300px", color: "var(--kalki-text-muted)" }}>
            <User size={48} style={{ opacity: 0.2, marginBottom: "1rem" }} />
            <p>Select an employee from the list to configure their pay details.</p>
          </div>
        ) : loading ? (
          <div className="kalki-loading-placeholder">Loading configuration...</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
            
            {/* Salary Structure Builder */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h2 style={{ fontSize: "1.2rem", fontWeight: 600, margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Landmark size={20} /> Salary Structure Builder
                </h2>
                <button 
                  className="kalki-btn-secondary" 
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '13px' }}
                  onClick={() => setShowManageComponents(true)}
                >
                  <Settings size={14} /> Manage Components
                </button>
              </div>

              {/* Pay Basis Config */}
              <div className="kalki-form-group" style={{ marginBottom: "2rem" }}>
                <label>Pay Basis / Frequency</label>
                <select 
                  className="kalki-input" 
                  value={structure?.payBasis || "MONTHLY"}
                  onChange={e => setStructure(structure ? { ...structure, payBasis: e.target.value } : null)}
                  style={{ width: "250px" }}
                >
                  <option value="HOURLY">Hourly (Time & Attendance)</option>
                  <option value="DAILY">Daily (Time & Attendance)</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                </select>
                <small style={{ color: "var(--kalki-text-secondary)", marginTop: "4px" }}>
                  Select how this employee's components should be calculated against their attendance.
                </small>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                
                {/* Earnings */}
                <div style={{ background: "var(--kalki-bg-secondary)", padding: "1.5rem", borderRadius: "0.5rem" }}>
                  <h3 style={{ margin: "0 0 1rem 0", color: "var(--kalki-success)" }}>Earnings</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {activeComponents.filter(c => c.type === "EARNING").map(comp => (
                      <div key={comp.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <label style={{ fontSize: "0.9rem" }}>{comp.name} {comp.isTaxable ? "(Taxable)" : ""}</label>
                        <input 
                          type="number" 
                          className="kalki-input" 
                          style={{ width: "120px" }}
                          value={getAmount(comp.id)}
                          onChange={e => handleComponentChange(comp.id, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Deductions */}
                <div style={{ background: "var(--kalki-bg-secondary)", padding: "1.5rem", borderRadius: "0.5rem" }}>
                  <h3 style={{ margin: "0 0 1rem 0", color: "var(--kalki-danger)" }}>Deductions</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {activeComponents.filter(c => c.type === "DEDUCTION").map(comp => (
                      <div key={comp.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <label style={{ fontSize: "0.9rem" }}>{comp.name}</label>
                        <input 
                          type="number" 
                          className="kalki-input" 
                          style={{ width: "120px" }}
                          value={getAmount(comp.id)}
                          onChange={e => handleComponentChange(comp.id, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <hr style={{ borderTop: "1px solid var(--kalki-border)" }} />

            {/* Compliance Flags */}
            <div>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 600, margin: "0 0 1rem 0" }}>Statutory Compliance</h2>
              <div style={{ display: "flex", gap: "2rem" }}>
                <label className="kalki-checkbox-label">
                  <input type="checkbox" checked={structure?.isEpfApplicable || false} onChange={e => setStructure(s => s ? { ...s, isEpfApplicable: e.target.checked } : s)} />
                  EPF Applicable
                </label>
                <label className="kalki-checkbox-label">
                  <input type="checkbox" checked={structure?.isEsiApplicable || false} onChange={e => setStructure(s => s ? { ...s, isEsiApplicable: e.target.checked } : s)} />
                  ESI Applicable
                </label>
                <label className="kalki-checkbox-label">
                  <input type="checkbox" checked={structure?.isPtApplicable || false} onChange={e => setStructure(s => s ? { ...s, isPtApplicable: e.target.checked } : s)} />
                  Professional Tax (PT)
                </label>
              </div>
            </div>

            <hr style={{ borderTop: "1px solid var(--kalki-border)" }} />

            {/* Disbursement Details */}
            <div>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 600, margin: "0 0 1rem 0" }}>Disbursement Method</h2>
              
              <div className="kalki-form-group">
                <label>Payment Method</label>
                <select className="kalki-input" value={info?.paymentMethod || "BANK_TRANSFER"} onChange={e => setInfo(i => i ? { ...i, paymentMethod: e.target.value as any } : i)}>
                  <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS/IMPS)</option>
                  <option value="GPAY">Google Pay / UPI</option>
                  <option value="CASH">Cash</option>
                </select>
              </div>

              {info?.paymentMethod === "BANK_TRANSFER" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginTop: "1rem" }}>
                  <div className="kalki-form-group">
                    <label>Bank Name</label>
                    <input type="text" className="kalki-input" value={info.bankName || ""} onChange={e => setInfo(i => i ? { ...i, bankName: e.target.value } : i)} />
                  </div>
                  <div className="kalki-form-group">
                    <label>Account Holder Name</label>
                    <input type="text" className="kalki-input" value={info.accountHolderName || ""} onChange={e => setInfo(i => i ? { ...i, accountHolderName: e.target.value } : i)} />
                  </div>
                  <div className="kalki-form-group">
                    <label>Account Number</label>
                    <input type="text" className="kalki-input" value={info.accountNumber || ""} onChange={e => setInfo(i => i ? { ...i, accountNumber: e.target.value } : i)} />
                  </div>
                  <div className="kalki-form-group">
                    <label>IFSC Code</label>
                    <input type="text" className="kalki-input" value={info.ifscCode || ""} onChange={e => setInfo(i => i ? { ...i, ifscCode: e.target.value } : i)} />
                  </div>
                </div>
              )}

              {info?.paymentMethod === "GPAY" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginTop: "1rem" }}>
                  <div className="kalki-form-group">
                    <label>GPay / UPI Number</label>
                    <input type="text" className="kalki-input" value={info.gpayNumber || ""} onChange={e => setInfo(i => i ? { ...i, gpayNumber: e.target.value } : i)} />
                  </div>
                  <div className="kalki-form-group">
                    <label>Registered Banking Name</label>
                    <input type="text" className="kalki-input" value={info.bankingName || ""} onChange={e => setInfo(i => i ? { ...i, bankingName: e.target.value } : i)} />
                  </div>
                </div>
              )}
            </div>

            <hr style={{ borderTop: "1px solid var(--kalki-border)" }} />

            {/* Versioning & Save */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ color: "var(--kalki-text-muted)", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <AlertTriangle size={16} /> Saving will close the previous structure and activate a new one effective today.
              </div>
              <button 
                className="primary-button" 
                onClick={saveConfiguration}
                disabled={saving}
              >
                {saving ? "Saving..." : <><Save size={18} /> Save Configuration</>}
              </button>
            </div>

          </div>
        )}
      </div>
      {showManageComponents && (
        <ManageComponentsModal 
          organizationId={organizationId} 
          onClose={() => setShowManageComponents(false)} 
          onSaved={() => {
            setShowManageComponents(false);
            fetchInitialData();
          }}
        />
      )}
    </div>
  );
}
