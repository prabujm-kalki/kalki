"use client";

import React, { useState, useEffect } from "react";
import { apiGet, apiSend } from "@/lib/api";
import { UserMinus, Search, Loader2, CheckCircle, Calculator } from "lucide-react";

type Employee = {
  id: string;
  employeeCode: string;
  person: {
    displayName: string;
  };
};

export function FnFSettlementTab({ organizationId, locationId }: { organizationId: string, locationId: string }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [lastWorkingDay, setLastWorkingDay] = useState("");
  const [leaveEncashmentDays, setLeaveEncashmentDays] = useState("0");
  
  const [calculating, setCalculating] = useState(false);
  const [preview, setPreview] = useState<any>(null);

  useEffect(() => {
    fetchEmployees();
  }, [organizationId, locationId]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      // Fetch ACTIVE employees
      const res = await apiGet<any>(`/api/employees?organizationId=${organizationId}&locationId=${locationId}`);
      if (res.employees) {
        setEmployees(res.employees);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCalculateFnF = async () => {
    if (!lastWorkingDay) return alert("Please select the Last Working Day.");
    
    setCalculating(true);
    // In a real implementation, this would call an API: /api/payroll/fnf/preview
    // For now, we simulate the F&F engine response to show the UI workflow.
    setTimeout(() => {
      setPreview({
        grossProRated: 15400,
        leaveEncashmentAmount: Number(leaveEncashmentDays) * 500,
        deductions: 1200,
        advanceRecovery: 5000,
        netPayable: 15400 + (Number(leaveEncashmentDays) * 500) - 1200 - 5000
      });
      setCalculating(false);
    }, 1000);
  };

  const handleFinalizeFnF = async () => {
    if (!confirm("Are you sure you want to finalize this settlement? The employee will be marked as INACTIVE and their record closed.")) return;
    
    // Simulate finalizing
    alert("Full & Final Settlement completed successfully! The employee has been deactivated.");
    setSelectedEmployee(null);
    setPreview(null);
    fetchEmployees(); // refresh list
  };

  const filteredEmployees = employees.filter(e => 
    e.person?.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.employeeCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "2rem", alignItems: "start" }}>
      {/* Sidebar: Employee Selection */}
      <div className="kalki-card" style={{ padding: "0" }}>
        <div style={{ padding: "1rem", borderBottom: "1px solid var(--kalki-border)", background: "var(--kalki-bg-secondary)" }}>
          <h3 style={{ margin: "0 0 1rem 0", fontSize: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <UserMinus size={18} /> Select Resigning Employee
          </h3>
          <div style={{ position: "relative" }}>
            <Search size={16} style={{ position: "absolute", left: "10px", top: "10px", color: "var(--kalki-text-muted)" }} />
            <input 
              type="text" 
              className="kalki-input" 
              placeholder="Search active employees..." 
              style={{ paddingLeft: "35px" }}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        <div style={{ maxHeight: "calc(100vh - 300px)", overflowY: "auto" }}>
          {loading ? (
            <div style={{ padding: "1rem", textAlign: "center" }}>Loading...</div>
          ) : filteredEmployees.length === 0 ? (
            <div style={{ padding: "1rem", color: "var(--kalki-text-muted)", textAlign: "center" }}>No employees found.</div>
          ) : (
            filteredEmployees.map(emp => (
              <div 
                key={emp.id} 
                onClick={() => {
                  setSelectedEmployee(emp);
                  setPreview(null);
                }}
                style={{
                  padding: "1rem",
                  borderBottom: "1px solid var(--kalki-border)",
                  cursor: "pointer",
                  background: selectedEmployee?.id === emp.id ? "var(--kalki-bg-secondary)" : "transparent",
                  borderLeft: selectedEmployee?.id === emp.id ? "4px solid var(--kalki-primary)" : "4px solid transparent"
                }}
              >
                <div style={{ fontWeight: 500 }}>{emp.person?.displayName}</div>
                <div style={{ fontSize: "0.8rem", color: "var(--kalki-text-muted)" }}>{emp.employeeCode}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Area: F&F Details */}
      <div className="kalki-card">
        {!selectedEmployee ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "300px", color: "var(--kalki-text-muted)" }}>
            <UserMinus size={48} style={{ opacity: 0.2, marginBottom: "1rem" }} />
            <p>Select an employee from the list to initiate Full & Final Settlement.</p>
          </div>
        ) : (
          <div>
            <h2 style={{ fontSize: "1.3rem", marginBottom: "0.5rem" }}>F&F Settlement: {selectedEmployee.person.displayName}</h2>
            <p className="kalki-text-muted" style={{ marginBottom: "2rem" }}>Configure the exit parameters to generate the final settlement.</p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "2rem" }}>
              <div className="kalki-form-group">
                <label>Last Working Day (LWD)</label>
                <input 
                  type="date" 
                  className="kalki-input" 
                  value={lastWorkingDay}
                  onChange={e => setLastWorkingDay(e.target.value)}
                />
              </div>
              <div className="kalki-form-group">
                <label>Leave Encashment (Days)</label>
                <input 
                  type="number" 
                  className="kalki-input" 
                  value={leaveEncashmentDays}
                  onChange={e => setLeaveEncashmentDays(e.target.value)}
                  min="0"
                />
              </div>
            </div>

            <button 
              className="kalki-btn kalki-btn-primary" 
              onClick={handleCalculateFnF}
              disabled={calculating}
              style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2rem" }}
            >
              {calculating ? <Loader2 size={16} className="animate-spin" /> : <Calculator size={16} />}
              Calculate Settlement
            </button>

            {preview && (
              <div style={{ borderTop: "1px solid var(--kalki-border)", paddingTop: "2rem" }}>
                <h3 style={{ fontSize: "1.1rem", marginBottom: "1.5rem" }}>Settlement Breakdown</h3>
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "2rem" }}>
                  <div style={{ background: "var(--kalki-bg)", padding: "1rem", borderRadius: "8px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                      <span>Pro-Rated Gross Pay:</span>
                      <span style={{ fontWeight: 600 }}>₹{preview.grossProRated}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                      <span>Leave Encashment:</span>
                      <span style={{ fontWeight: 600 }}>₹{preview.leaveEncashmentAmount}</span>
                    </div>
                  </div>
                  <div style={{ background: "var(--kalki-bg)", padding: "1rem", borderRadius: "8px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                      <span>Statutory Deductions:</span>
                      <span style={{ fontWeight: 600, color: "var(--kalki-danger)" }}>- ₹{preview.deductions}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                      <span>Advance Recovery:</span>
                      <span style={{ fontWeight: 600, color: "var(--kalki-danger)" }}>- ₹{preview.advanceRecovery}</span>
                    </div>
                  </div>
                </div>

                <div style={{ background: "var(--kalki-bg-secondary)", padding: "1.5rem", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
                  <span style={{ fontSize: "1.1rem", fontWeight: 600 }}>Final Net Payable:</span>
                  <span style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--kalki-success)" }}>₹{preview.netPayable}</span>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button 
                    className="kalki-btn kalki-btn-primary" 
                    style={{ background: "var(--kalki-danger)", borderColor: "var(--kalki-danger)", display: "flex", alignItems: "center", gap: "8px" }}
                    onClick={handleFinalizeFnF}
                  >
                    <CheckCircle size={16} /> Confirm & Close Employee Account
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
