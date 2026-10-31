import React, { useState, useEffect, useMemo } from "react";
import { apiGet, apiSend } from "@/lib/api";
import { 
  Save, 
  User, 
  Landmark, 
  Settings, 
  Search, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown,
  ShieldCheck,
  CreditCard,
  Building,
  Smartphone,
  Banknote,
  Sparkles
} from "lucide-react";
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

export function PayConfigurationTab({ organizationId, locationId }: { organizationId: string; locationId: string }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
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
        const activeComps = (compsRes.components || []).filter((c: any) => c.isActive !== false);
        const uniqueComps = Array.from(new Map(activeComps.map((c: any) => [c.name, c])).values());
        comps = uniqueComps as any;
      } catch (e: any) {
        console.warn("Failed to fetch components:", e.message);
      }
      
      setEmployees(emps);
      setActiveComponents(comps);

      // Auto-select first employee if none selected yet
      if (emps.length > 0 && !selectedEmployeeId) {
        setSelectedEmployeeId(emps[0].id);
      }
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
          payBasis: structData.payBasis || "WEEKLY",
          isEpfApplicable: structData.isEpfApplicable || false,
          isEsiApplicable: structData.isEsiApplicable || false,
          isPtApplicable: structData.isPtApplicable || false,
          effectiveFrom: new Date().toISOString().split("T")[0],
          components: (structData.components || []).map((c: any) => ({
            componentId: c.component?.id || c.componentId,
            amount: c.amount ? c.amount.toString() : "0"
          }))
        });
      } else {
        setStructure({
          employeeId,
          payBasis: "WEEKLY",
          isEpfApplicable: false,
          isEsiApplicable: false,
          isPtApplicable: false,
          effectiveFrom: new Date().toISOString().split("T")[0],
          components: []
        });
      }

      if (infoData) {
        setInfo(infoData);
      } else {
        setInfo({ paymentMethod: "CASH" });
      }
    } catch (error) {
      console.warn("Failed to load employee pay configuration:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleComponentChange = (componentId: string, amount: string) => {
    if (!structure) return;
    const cleanAmount = amount === "" ? "" : isNaN(Number(amount)) ? "0" : amount;
    const exists = structure.components.find(c => c.componentId === componentId);
    let newComps;
    if (exists) {
      newComps = structure.components.map(c => c.componentId === componentId ? { ...c, amount: cleanAmount } : c);
    } else {
      newComps = [...structure.components, { componentId, amount: cleanAmount }];
    }
    setStructure({ ...structure, components: newComps });
  };

  const getAmount = (componentId: string) => {
    const found = structure?.components.find(c => c.componentId === componentId);
    return found ? found.amount : "";
  };

  const saveConfiguration = async () => {
    if (!selectedEmployeeId || !structure) return;
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

      alert("Pay configuration saved successfully! Active structure updated.");
      fetchEmployeeData(selectedEmployeeId);
    } catch (error: any) {
      console.error(error);
      alert("Failed to save configuration: " + (error.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  // Filtered employees list
  const filteredEmployees = useMemo(() => {
    if (!searchTerm.trim()) return employees;
    const term = searchTerm.toLowerCase();
    return employees.filter(emp => 
      emp.person?.displayName?.toLowerCase().includes(term) ||
      emp.employeeCode?.toLowerCase().includes(term)
    );
  }, [employees, searchTerm]);

  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);

  // Totals calculations
  const earningComponents = activeComponents.filter(c => c.type === "EARNING");
  const deductionComponents = activeComponents.filter(c => c.type === "DEDUCTION");

  const totalEarnings = useMemo(() => {
    if (!structure) return 0;
    return earningComponents.reduce((sum, c) => {
      const val = parseFloat(getAmount(c.id) || "0");
      return sum + (isNaN(val) ? 0 : val);
    }, 0);
  }, [structure, earningComponents]);

  const totalDeductions = useMemo(() => {
    if (!structure) return 0;
    return deductionComponents.reduce((sum, c) => {
      const val = parseFloat(getAmount(c.id) || "0");
      return sum + (isNaN(val) ? 0 : val);
    }, 0);
  }, [structure, deductionComponents]);

  const estimatedNet = Math.max(0, totalEarnings - totalDeductions);

  return (
    <div style={{ maxWidth: "1380px", margin: "0 auto", padding: "0.5rem 0 2rem 0" }}>
      {/* Top Banner & Quick Controls */}
      <div 
        className="card" 
        style={{ 
          padding: "1rem 1.5rem", 
          marginBottom: "1.25rem", 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
          <div 
            style={{ 
              width: "40px", 
              height: "40px", 
              borderRadius: "8px", 
              background: "#eff6ff", 
              color: "#2563eb", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center" 
            }}
          >
            <Landmark size={22} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "#0f172a" }}>
              Pay & Salary Configuration
            </h2>
            <div style={{ fontSize: "0.85rem", color: "#64748b", marginTop: "2px" }}>
              Configure base wages, allowance structures, statutory compliance, and disbursement accounts.
            </div>
          </div>
        </div>

        <button 
          className="kalki-button kalki-button--secondary"
          onClick={() => setShowManageComponents(true)}
          style={{ display: "flex", alignItems: "center", gap: "8px", height: "38px" }}
        >
          <Settings size={15} />
          <span>Manage Components</span>
        </button>
      </div>

      {/* Main 2-Column Layout */}
      <div style={{ display: "grid", gridTemplateColumns: "310px 1fr", gap: "1.25rem", alignItems: "start" }}>
        
        {/* Left Column: Employee Selector */}
        <div className="card" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#1e293b" }}>Employees</span>
              <span 
                style={{ 
                  fontSize: "0.75rem", 
                  fontWeight: 600, 
                  background: "#e2e8f0", 
                  color: "#475569", 
                  padding: "2px 8px", 
                  borderRadius: "12px" 
                }}
              >
                {filteredEmployees.length} of {employees.length}
              </span>
            </div>

            {/* Employee Search Box */}
            <div style={{ position: "relative" }}>
              <Search size={15} style={{ position: "absolute", left: "10px", top: "11px", color: "#94a3b8" }} />
              <input 
                type="text" 
                className="kalki-input"
                placeholder="Search by name or code..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ paddingLeft: "32px", fontSize: "0.85rem", height: "36px" }}
              />
            </div>
          </div>

          {/* Employee Scrollable List */}
          <div style={{ maxHeight: "calc(100vh - 280px)", overflowY: "auto" }}>
            {filteredEmployees.map(emp => {
              const isSelected = selectedEmployeeId === emp.id;
              return (
                <div 
                  key={emp.id} 
                  onClick={() => setSelectedEmployeeId(emp.id)}
                  style={{
                    padding: "0.85rem 1.25rem",
                    borderBottom: "1px solid #f1f5f9",
                    cursor: "pointer",
                    background: isSelected ? "#f8fafc" : "#ffffff",
                    borderLeft: isSelected ? "4px solid #2563eb" : "4px solid transparent",
                    transition: "all 0.15s ease",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem"
                  }}
                >
                  <div 
                    style={{ 
                      width: "34px", 
                      height: "34px", 
                      borderRadius: "50%", 
                      background: isSelected ? "#dbeafe" : "#f1f5f9",
                      color: isSelected ? "#1d4ed8" : "#64748b",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 600,
                      fontSize: "0.8rem",
                      flexShrink: 0
                    }}
                  >
                    {emp.person?.displayName?.charAt(0) || "E"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div 
                      style={{ 
                        fontWeight: isSelected ? 700 : 600, 
                        fontSize: "0.9rem",
                        color: isSelected ? "#0f172a" : "#334155",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis"
                      }}
                    >
                      {emp.person?.displayName}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>
                      {emp.employeeCode}
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredEmployees.length === 0 && (
              <div style={{ padding: "2.5rem 1rem", textAlign: "center", color: "#64748b", fontSize: "0.85rem" }}>
                No employees matching criteria.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Salary Structure & Configuration Form */}
        <div className="card" style={{ padding: "1.75rem" }}>
          {!selectedEmployeeId ? (
            <div style={{ padding: "4rem 2rem", textAlign: "center", color: "#64748b" }}>
              <User size={48} style={{ opacity: 0.25, marginBottom: "1rem" }} />
              <div style={{ fontWeight: 600, fontSize: "1.05rem", color: "#1e293b" }}>No Employee Selected</div>
              <p style={{ fontSize: "0.9rem", marginTop: "4px" }}>
                Choose an employee from the list on the left to configure their pay structure.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
              
              {/* Header card for selected employee */}
              <div 
                style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "1rem",
                  paddingBottom: "1.25rem",
                  borderBottom: "1px solid #e2e8f0"
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: "#0f172a" }}>
                      {selectedEmployee?.person?.displayName}
                    </h3>
                    <span 
                      style={{ 
                        fontSize: "0.75rem", 
                        padding: "2px 8px", 
                        background: "#eff6ff", 
                        color: "#2563eb", 
                        fontWeight: 600, 
                        borderRadius: "4px" 
                      }}
                    >
                      {selectedEmployee?.employeeCode}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "#64748b", marginTop: "4px" }}>
                    Configure earnings, deductions, statutory flags, and payout preferences.
                  </div>
                </div>

                {/* Estimated Rate Summary Pill */}
                <div 
                  style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "1.25rem", 
                    background: "#f8fafc", 
                    padding: "0.6rem 1rem", 
                    borderRadius: "8px", 
                    border: "1px solid #e2e8f0" 
                  }}
                >
                  <div>
                    <div style={{ fontSize: "0.7rem", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>
                      Gross ({structure?.payBasis || "WEEKLY"})
                    </div>
                    <div style={{ fontSize: "1rem", fontWeight: 700, color: "#16a34a" }}>
                      ₹{totalEarnings.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div style={{ width: "1px", height: "24px", background: "#cbd5e1" }} />
                  <div>
                    <div style={{ fontSize: "0.7rem", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>
                      Est. Net Payout
                    </div>
                    <div style={{ fontSize: "1rem", fontWeight: 700, color: "#2563eb" }}>
                      ₹{estimatedNet.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 1: Pay Basis / Frequency */}
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#1e293b", marginBottom: "0.4rem" }}>
                  Pay Basis / Frequency <span style={{ color: "var(--kalki-danger)" }}>*</span>
                </label>
                <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
                  <select 
                    className="kalki-input" 
                    value={structure?.payBasis || "WEEKLY"}
                    onChange={e => setStructure(structure ? { ...structure, payBasis: e.target.value } : null)}
                    style={{ width: "320px", fontWeight: 500 }}
                  >
                    <option value="WEEKLY">Weekly (Recommended for Operations)</option>
                    <option value="MONTHLY">Monthly (Salaried Staff)</option>
                    <option value="DAILY">Daily (Time & Attendance)</option>
                    <option value="HOURLY">Hourly (Time & Attendance)</option>
                  </select>
                  <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
                    Determines cycle calculation against employee biometric & selfie punches.
                  </span>
                </div>
              </div>

              {/* SECTION 2: Salary Components (Earnings & Deductions) */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
                  <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0f172a" }}>
                    Salary Breakdown Components
                  </div>
                  {activeComponents.length === 0 && (
                    <button 
                      className="kalki-button kalki-button--secondary"
                      onClick={() => setShowManageComponents(true)}
                      style={{ fontSize: "0.8rem", height: "30px", padding: "0 10px", color: "#2563eb" }}
                    >
                      <Plus size={14} style={{ marginRight: "4px" }} /> Add Components
                    </button>
                  )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
                  
                  {/* Earnings Column */}
                  <div 
                    style={{ 
                      border: "1px solid #bbf7d0", 
                      borderRadius: "8px", 
                      background: "#f0fdf4", 
                      padding: "1.25rem" 
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                      <TrendingUp size={18} color="#16a34a" />
                      <h4 style={{ margin: 0, color: "#166534", fontSize: "0.95rem", fontWeight: 700 }}>
                        Earnings / Allowances
                      </h4>
                    </div>

                    {earningComponents.length === 0 ? (
                      <div 
                        style={{ 
                          padding: "1.5rem", 
                          textAlign: "center", 
                          background: "#ffffff", 
                          borderRadius: "6px", 
                          border: "1px dashed #cbd5e1" 
                        }}
                      >
                        <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
                          No earning components defined yet.
                        </p>
                        <button 
                          className="kalki-button kalki-button--secondary"
                          onClick={() => setShowManageComponents(true)}
                          style={{ marginTop: "0.75rem", fontSize: "0.8rem", height: "30px", padding: "0 12px" }}
                        >
                          <Plus size={14} style={{ marginRight: "4px" }} /> Create Earnings
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                        {earningComponents.map(comp => (
                          <div 
                            key={comp.id} 
                            style={{ 
                              display: "flex", 
                              alignItems: "center", 
                              justifyContent: "space-between",
                              background: "#ffffff",
                              padding: "0.6rem 0.85rem",
                              borderRadius: "6px",
                              border: "1px solid #dcfce7"
                            }}
                          >
                            <div>
                              <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#1e293b" }}>{comp.name}</div>
                              <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                                {comp.isTaxable ? "Taxable" : "Tax-Exempt"}
                              </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                              <span style={{ fontSize: "0.85rem", color: "#64748b" }}>₹</span>
                              <input 
                                type="number" 
                                className="kalki-input" 
                                placeholder="0.00"
                                style={{ width: "130px", height: "36px", textAlign: "right", fontWeight: 600 }}
                                value={getAmount(comp.id)}
                                onChange={e => handleComponentChange(comp.id, e.target.value)}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Deductions Column */}
                  <div 
                    style={{ 
                      border: "1px solid #fecaca", 
                      borderRadius: "8px", 
                      background: "#fef2f2", 
                      padding: "1.25rem" 
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                      <TrendingDown size={18} color="#dc2626" />
                      <h4 style={{ margin: 0, color: "#991b1b", fontSize: "0.95rem", fontWeight: 700 }}>
                        Fixed Deductions
                      </h4>
                    </div>

                    {deductionComponents.length === 0 ? (
                      <div 
                        style={{ 
                          padding: "1.5rem", 
                          textAlign: "center", 
                          background: "#ffffff", 
                          borderRadius: "6px", 
                          border: "1px dashed #cbd5e1" 
                        }}
                      >
                        <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
                          No deduction components defined yet.
                        </p>
                        <button 
                          className="kalki-button kalki-button--secondary"
                          onClick={() => setShowManageComponents(true)}
                          style={{ marginTop: "0.75rem", fontSize: "0.8rem", height: "30px", padding: "0 12px" }}
                        >
                          <Plus size={14} style={{ marginRight: "4px" }} /> Create Deductions
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                        {deductionComponents.map(comp => (
                          <div 
                            key={comp.id} 
                            style={{ 
                              display: "flex", 
                              alignItems: "center", 
                              justifyContent: "space-between",
                              background: "#ffffff",
                              padding: "0.6rem 0.85rem",
                              borderRadius: "6px",
                              border: "1px solid #fee2e2"
                            }}
                          >
                            <div>
                              <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#1e293b" }}>{comp.name}</div>
                              <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Recurring Deduction</div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                              <span style={{ fontSize: "0.85rem", color: "#64748b" }}>₹</span>
                              <input 
                                type="number" 
                                className="kalki-input" 
                                placeholder="0.00"
                                style={{ width: "130px", height: "36px", textAlign: "right", fontWeight: 600 }}
                                value={getAmount(comp.id)}
                                onChange={e => handleComponentChange(comp.id, e.target.value)}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION 3: Statutory Compliance */}
              <div 
                style={{ 
                  border: "1px solid #e2e8f0", 
                  borderRadius: "8px", 
                  padding: "1.25rem", 
                  background: "#f8fafc" 
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.85rem" }}>
                  <ShieldCheck size={18} color="#2563eb" />
                  <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0f172a" }}>
                    Statutory Compliance Flags
                  </div>
                </div>

                <div style={{ display: "flex", gap: "2.5rem", flexWrap: "wrap" }}>
                  <label 
                    style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      gap: "0.5rem", 
                      cursor: "pointer", 
                      fontSize: "0.9rem",
                      fontWeight: 500,
                      color: "#1e293b" 
                    }}
                  >
                    <input 
                      type="checkbox" 
                      style={{ width: "16px", height: "16px", cursor: "pointer" }}
                      checked={structure?.isEpfApplicable || false} 
                      onChange={e => setStructure(s => s ? { ...s, isEpfApplicable: e.target.checked } : s)} 
                    />
                    <span>Employees' Provident Fund (EPF)</span>
                  </label>

                  <label 
                    style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      gap: "0.5rem", 
                      cursor: "pointer", 
                      fontSize: "0.9rem",
                      fontWeight: 500,
                      color: "#1e293b" 
                    }}
                  >
                    <input 
                      type="checkbox" 
                      style={{ width: "16px", height: "16px", cursor: "pointer" }}
                      checked={structure?.isEsiApplicable || false} 
                      onChange={e => setStructure(s => s ? { ...s, isEsiApplicable: e.target.checked } : s)} 
                    />
                    <span>Employees' State Insurance (ESI)</span>
                  </label>

                  <label 
                    style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      gap: "0.5rem", 
                      cursor: "pointer", 
                      fontSize: "0.9rem",
                      fontWeight: 500,
                      color: "#1e293b" 
                    }}
                  >
                    <input 
                      type="checkbox" 
                      style={{ width: "16px", height: "16px", cursor: "pointer" }}
                      checked={structure?.isPtApplicable || false} 
                      onChange={e => setStructure(s => s ? { ...s, isPtApplicable: e.target.checked } : s)} 
                    />
                    <span>Professional Tax (PT)</span>
                  </label>
                </div>
              </div>

              {/* SECTION 4: Disbursement & Payout Details */}
              <div 
                style={{ 
                  border: "1px solid #e2e8f0", 
                  borderRadius: "8px", 
                  padding: "1.25rem", 
                  background: "#ffffff" 
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                  <CreditCard size={18} color="#2563eb" />
                  <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0f172a" }}>
                    Disbursement & Payout Account
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#1e293b", marginBottom: "0.4rem" }}>
                      Payment Method
                    </label>
                    <select 
                      className="kalki-input" 
                      style={{ maxWidth: "340px", fontWeight: 500 }}
                      value={info?.paymentMethod || "CASH"} 
                      onChange={e => setInfo(i => i ? { ...i, paymentMethod: e.target.value as any } : i)}
                    >
                      <option value="CASH">Cash Disbursement</option>
                      <option value="BANK_TRANSFER">Bank Transfer (NEFT / RTGS / IMPS)</option>
                      <option value="GPAY">UPI / Google Pay</option>
                    </select>
                  </div>

                  {info?.paymentMethod === "BANK_TRANSFER" && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "0.5rem" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                          Bank Name
                        </label>
                        <input 
                          type="text" 
                          className="kalki-input" 
                          placeholder="e.g. State Bank of India"
                          value={info.bankName || ""} 
                          onChange={e => setInfo(i => i ? { ...i, bankName: e.target.value } : i)} 
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                          Account Holder Name
                        </label>
                        <input 
                          type="text" 
                          className="kalki-input" 
                          placeholder="As printed in passbook"
                          value={info.accountHolderName || ""} 
                          onChange={e => setInfo(i => i ? { ...i, accountHolderName: e.target.value } : i)} 
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                          Account Number
                        </label>
                        <input 
                          type="text" 
                          className="kalki-input" 
                          placeholder="Account Number"
                          value={info.accountNumber || ""} 
                          onChange={e => setInfo(i => i ? { ...i, accountNumber: e.target.value } : i)} 
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                          IFSC Code
                        </label>
                        <input 
                          type="text" 
                          className="kalki-input" 
                          placeholder="e.g. SBIN0001234"
                          value={info.ifscCode || ""} 
                          onChange={e => setInfo(i => i ? { ...i, ifscCode: e.target.value } : i)} 
                        />
                      </div>
                    </div>
                  )}

                  {info?.paymentMethod === "GPAY" && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "0.5rem" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                          GPay / PhonePe / UPI Number
                        </label>
                        <input 
                          type="text" 
                          className="kalki-input" 
                          placeholder="10-digit mobile number or UPI ID"
                          value={info.gpayNumber || ""} 
                          onChange={e => setInfo(i => i ? { ...i, gpayNumber: e.target.value } : i)} 
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                          Registered Banking Name
                        </label>
                        <input 
                          type="text" 
                          className="kalki-input" 
                          placeholder="Beneficiary name registered with UPI"
                          value={info.bankingName || ""} 
                          onChange={e => setInfo(i => i ? { ...i, bankingName: e.target.value } : i)} 
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 5: Save & Action Bar */}
              <div 
                style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "1rem",
                  paddingTop: "1rem",
                  borderTop: "1px solid #e2e8f0" 
                }}
              >
                <div style={{ color: "#64748b", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <AlertCircle size={16} color="#d97706" />
                  <span>Saving creates an active salary structure effective from today.</span>
                </div>

                <button 
                  className="kalki-button kalki-button--primary" 
                  onClick={saveConfiguration}
                  disabled={saving}
                  style={{ display: "flex", alignItems: "center", gap: "8px", height: "42px", padding: "0 22px", fontSize: "0.95rem" }}
                >
                  <Save size={18} />
                  <span>{saving ? "Saving Configuration..." : "Save Configuration"}</span>
                </button>
              </div>

            </div>
          )}
        </div>
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
