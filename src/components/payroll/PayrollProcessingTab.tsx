"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Calendar, PlayCircle, AlertCircle } from "lucide-react";
import { DraftPayslip } from "@/domains/payroll/calculator";
import { generateDraftPayroll } from "@/app/payroll/processing/actions";
import { useSessionView } from "@/components/AppShell";
import { apiGet } from "@/lib/api";

const DAY_NAME_TO_INDEX: Record<string, number> = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
};

const DAY_INDEX_TO_SHORT: Record<number, string> = {
  0: "Sun",
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
};

function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

function toYMD(val: any): string {
  if (!val) return "";
  if (typeof val === "string") {
    return val.split("T")[0];
  }
  if (val instanceof Date) {
    return formatDate(val);
  }
  return String(val);
}

export function PayrollProcessingTab() {
  const { selected } = useSessionView();
  const organizationId = selected?.organizationId;
  const [frequency, setFrequency] = useState("MONTHLY");
  
  // Settings
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    if (organizationId) {
      apiGet<any>(`/api/settings/statutory?organizationId=${organizationId}`)
        .then((res) => {
          if (res?.settings) {
            setSettings(res.settings);
          }
        })
        .catch((err) => {
          console.warn("Could not load statutory settings:", err);
        });
    }
  }, [organizationId]);
  
  // Date states for Hourly/Daily
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  
  // Date states for Weekly/Monthly
  const [selectedPeriod, setSelectedPeriod] = useState("");

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<DraftPayslip[] | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  // Existing runs state to filter out already-completed cycles
  const [existingRuns, setExistingRuns] = useState<any[]>([]);
  const [showAllCycles, setShowAllCycles] = useState(false);

  const fetchExistingRuns = () => {
    if (organizationId && selected?.locationId) {
      import("@/app/payroll/processing/actions")
        .then(m => m.getPayrollHistory(organizationId, selected.locationId))
        .then(res => {
          if (res.success && res.data) {
            setExistingRuns(res.data);
          }
        })
        .catch(console.error);
    }
  };

  useEffect(() => {
    fetchExistingRuns();
  }, [organizationId, selected?.locationId]);

  // Dynamically compute completed weeks based on configured week cut-off day
  const weeklyOptions = useMemo(() => {
    const endDayName = settings?.payrollWeekEndDay || "SUNDAY";
    const targetEndDayIndex = DAY_NAME_TO_INDEX[endDayName] ?? 0; // Default Sunday = 0
    
    // We only include strictly COMPLETED cycles (past the end day)
    const allOptions: { value: string; label: string; isProcessed: boolean; runStatus?: string }[] = [];
    const now = new Date();
    
    // Step backwards day by day from today until we find the most recent completed week end day
    let curr = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    curr.setDate(curr.getDate() - 1);
    while (curr.getDay() !== targetEndDayIndex) {
      curr.setDate(curr.getDate() - 1);
    }

    // Generate completed weeks (12 weeks historical window)
    for (let i = 0; i < 12; i++) {
      const cycleEnd = new Date(curr);
      const cycleStart = new Date(curr);
      cycleStart.setDate(cycleStart.getDate() - 6);

      const startDateStr = formatDate(cycleStart);
      const endDateStr = formatDate(cycleEnd);
      const val = `${startDateStr}_${endDateStr}`;
      const startDayShort = DAY_INDEX_TO_SHORT[cycleStart.getDay()];
      const endDayShort = DAY_INDEX_TO_SHORT[cycleEnd.getDay()];
      
      // Check if this cycle is already in existingRuns with robust date matching
      const existing = existingRuns.find(r => {
        const rStart = toYMD(r.periodStart);
        const rEnd = toYMD(r.periodEnd);
        return rStart === startDateStr && rEnd === endDateStr;
      });

      const isProcessed = Boolean(existing);
      const statusLabel = existing?.status ? ` [${existing.status.replace(/_/g, ' ')}]` : '';
      const label = `${formatDisplayDate(cycleStart)} to ${formatDisplayDate(cycleEnd)} (${startDayShort}-${endDayShort})${statusLabel}`;

      allOptions.push({ value: val, label, isProcessed, runStatus: existing?.status });
      curr.setDate(curr.getDate() - 7);
    }

    if (showAllCycles) {
      return allOptions;
    }

    // When "Show completed" is unchecked:
    // 1. Filter out already processed runs
    const pendingOnly = allOptions.filter(opt => !opt.isProcessed);
    // 2. If runs exist in system, show only pending ones. If no runs have been processed yet (fresh install/empty history),
    // show the most recent completed weeks (up to 4) instead of dumping all 12 weeks so the user sees a concise actionable list.
    if (existingRuns.length > 0) {
      return pendingOnly;
    }
    return pendingOnly.slice(0, 4);
  }, [settings?.payrollWeekEndDay, existingRuns, showAllCycles]);

  // Dynamically compute past months
  const monthlyOptions = useMemo(() => {
    const allOptions: { value: string; label: string; isProcessed: boolean; runStatus?: string }[] = [];
    const now = new Date();
    
    // Previous completed months (6 months)
    for (let i = 1; i <= 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const val = `${year}-${month}`;
      const lastDay = new Date(year, parseInt(month), 0).getDate();
      const startStr = `${year}-${month}-01`;
      const endStr = `${year}-${month}-${String(lastDay).padStart(2, "0")}`;
      
      const existing = existingRuns.find(r => {
        const rStart = toYMD(r.periodStart);
        const rEnd = toYMD(r.periodEnd);
        return rStart === startStr && rEnd === endStr;
      });
      const isProcessed = Boolean(existing);
      const statusLabel = existing?.status ? ` [${existing.status.replace(/_/g, ' ')}]` : '';
      const label = `${d.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}${statusLabel}`;

      allOptions.push({ value: val, label, isProcessed, runStatus: existing?.status });
    }

    if (showAllCycles) {
      return allOptions;
    }

    const pendingOnly = allOptions.filter(opt => !opt.isProcessed);
    if (existingRuns.length > 0) {
      return pendingOnly;
    }
    return pendingOnly.slice(0, 3);
  }, [existingRuns, showAllCycles]);

  // Auto-select latest completed/unprocessed week or month
  useEffect(() => {
    if (frequency === "WEEKLY" && weeklyOptions.length > 0) {
      if (!selectedPeriod || !weeklyOptions.some(o => o.value === selectedPeriod)) {
        setSelectedPeriod(weeklyOptions[0].value);
      }
    } else if (frequency === "MONTHLY" && monthlyOptions.length > 0) {
      if (!selectedPeriod || !monthlyOptions.some(o => o.value === selectedPeriod)) {
        setSelectedPeriod(monthlyOptions[0].value);
      }
    }
  }, [frequency, weeklyOptions, monthlyOptions, selectedPeriod]);

  // Validation
  let validationError = "";
  const today = new Date().toISOString().split("T")[0];

  if (frequency === "HOURLY" || frequency === "DAILY") {
    if (fromDate && toDate) {
      if (toDate < fromDate) {
        validationError = "'To' date cannot be earlier than 'From' date.";
      }
      if (fromDate > today || toDate > today) {
        validationError = "Future dates are not allowed.";
      }
    }
  }

  const handleGenerate = async () => {
    if (validationError) return;
    setLoading(true);
    setResults(null);
    setErrors([]);

    let start = "";
    let end = "";

    if (frequency === "HOURLY" || frequency === "DAILY") {
      start = fromDate;
      end = toDate;
    } else if (frequency === "MONTHLY") {
      // Mock splitting value like "2026-09"
      if (!selectedPeriod) {
        setLoading(false);
        return;
      }
      const [year, month] = selectedPeriod.split("-");
      start = `${year}-${month}-01`;
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      end = `${year}-${month}-${lastDay}`;
    } else if (frequency === "WEEKLY") {
      // Mock splitting value like "2026-09-21_2026-09-27"
      if (!selectedPeriod) {
        setLoading(false);
        return;
      }
      const parts = selectedPeriod.split("_");
      start = parts[0];
      end = parts[1];
    }

    if (!start || !end) {
      setErrors(["Please select valid dates."]);
      setLoading(false);
      return;
    }

    const res = await generateDraftPayroll(frequency, start, end);
    if (res.success) {
      setResults(res.data || []);
      if (res.errors && res.errors.length > 0) {
        setErrors(res.errors);
      }
    } else {
      setErrors([res.error || "Failed to generate payroll."]);
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "1rem 0" }}>
      <div style={{ background: "var(--kalki-card-bg)", border: "1px solid var(--kalki-border)", borderRadius: "8px", padding: "1.5rem", marginBottom: "2rem" }}>
        <h3 style={{ marginTop: 0, marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <PlayCircle size={20} color="var(--kalki-primary)" />
          New Payroll Run
        </h3>

        <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", alignItems: "flex-start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flex: "1", minWidth: "200px" }}>
            <label style={{ fontSize: "0.9rem", fontWeight: 500 }}>Pay Frequency</label>
            <select 
              className="kalki-input" 
              value={frequency} 
              onChange={(e) => {
                setFrequency(e.target.value);
                setFromDate("");
                setToDate("");
                setSelectedPeriod("");
              }}
              style={{ width: "100%" }}
            >
              <option value="HOURLY">Hourly</option>
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
            </select>
          </div>

          {(frequency === "HOURLY" || frequency === "DAILY") && (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flex: "1", minWidth: "150px" }}>
                <label style={{ fontSize: "0.9rem", fontWeight: 500 }}>From Date</label>
                <input 
                  type="date" 
                  className="kalki-input" 
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  max={today}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flex: "1", minWidth: "150px" }}>
                <label style={{ fontSize: "0.9rem", fontWeight: 500 }}>To Date</label>
                <input 
                  type="date" 
                  className="kalki-input" 
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  max={today}
                />
              </div>
            </>
          )}

          {frequency === "MONTHLY" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flex: "2", minWidth: "250px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label style={{ fontSize: "0.9rem", fontWeight: 500 }}>Select Month</label>
                <label style={{ fontSize: "0.8rem", color: "var(--kalki-text-secondary)", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  <input 
                    type="checkbox" 
                    checked={showAllCycles} 
                    onChange={e => setShowAllCycles(e.target.checked)} 
                    style={{ cursor: "pointer" }}
                  />
                  Show completed
                </label>
              </div>
              <select 
                className="kalki-input" 
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
              >
                <option value="">-- Select Month --</option>
                {monthlyOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {frequency === "WEEKLY" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flex: "2", minWidth: "250px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label style={{ fontSize: "0.9rem", fontWeight: 500 }}>Select Week</label>
                <label style={{ fontSize: "0.8rem", color: "var(--kalki-text-secondary)", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  <input 
                    type="checkbox" 
                    checked={showAllCycles} 
                    onChange={e => setShowAllCycles(e.target.checked)} 
                    style={{ cursor: "pointer" }}
                  />
                  Show completed
                </label>
              </div>
              <select 
                className="kalki-input" 
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
              >
                <option value="">-- Select Week --</option>
                {weeklyOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flex: "1", minWidth: "150px" }}>
            <label style={{ fontSize: "0.9rem", fontWeight: 500, visibility: "hidden" }}>Action</label>
            <button 
              className="kalki-button kalki-button--primary" 
              onClick={handleGenerate} 
              disabled={loading}
              style={{ width: "100%", opacity: loading ? 0.7 : 1 }}
            >
              {loading ? "Processing..." : "Generate Draft"}
            </button>
          </div>
        </div>

        {validationError && (
          <div style={{ marginTop: "1rem", color: "var(--kalki-danger)", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <AlertCircle size={16} /> {validationError}
          </div>
        )}
      </div>

      {/* Results Area */}
      {errors.length > 0 && (
        <div style={{ background: "rgba(220, 38, 38, 0.1)", border: "1px solid var(--kalki-danger)", borderRadius: "8px", padding: "1rem", marginBottom: "2rem" }}>
          <h4 style={{ color: "var(--kalki-danger)", marginTop: 0 }}>Warnings / Errors</h4>
          <ul style={{ margin: 0, paddingLeft: "1.5rem", color: "var(--kalki-danger)", fontSize: "0.9rem" }}>
            {errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {results && (
        <div style={{ background: "var(--kalki-card-bg)", border: "1px solid var(--kalki-border)", borderRadius: "8px", overflow: "hidden" }}>
          <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid var(--kalki-border)", background: "var(--kalki-bg)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h4 style={{ margin: 0 }}>Draft Preview ({results.length} Employees)</h4>
            {results.length > 0 && (
              <button 
                className="kalki-button kalki-button--primary"
                onClick={async () => {
                  if (!selected) return;
                  const res = await import("@/app/payroll/processing/actions").then(m => m.savePayrollRun(
                    selected.organizationId, 
                    selected.locationId, 
                    frequency, 
                    frequency === "HOURLY" || frequency === "DAILY" ? fromDate : frequency === "MONTHLY" ? `${selectedPeriod}-01` : selectedPeriod.split("_")[0],
                    frequency === "HOURLY" || frequency === "DAILY" ? toDate : frequency === "MONTHLY" ? `${selectedPeriod}-28` : selectedPeriod.split("_")[1],
                    results
                  ));
                  if (res.success) {
                    alert("Payroll processed and saved successfully! You can view it in the Payslips and History tab.");
                    setResults(null);
                    setFromDate("");
                    setToDate("");
                    setSelectedPeriod("");
                    fetchExistingRuns();
                  } else {
                    alert("Failed to process payroll: " + (('error' in res) ? res.error : "Unknown error"));
                  }
                }}
                style={{ padding: "8px 24px" }}
              >
                Process Payroll
              </button>
            )}
          </div>
          
          {results.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "var(--kalki-text-secondary)" }}>
              <Calendar size={48} style={{ opacity: 0.2, marginBottom: "1rem" }} />
              <p>No eligible employees found for this pay frequency.</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="kalki-data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--kalki-bg)", textAlign: "left", borderBottom: "2px solid var(--kalki-border)" }}>
                    <th style={{ padding: "1rem", fontWeight: 600 }}>Employee</th>
                    <th style={{ padding: "1rem", fontWeight: 600 }}>Gross Pay</th>
                    <th style={{ padding: "1rem", fontWeight: 600 }}>EPF</th>
                    <th style={{ padding: "1rem", fontWeight: 600 }}>ESI</th>
                    <th style={{ padding: "1rem", fontWeight: 600 }}>PT</th>
                    <th style={{ padding: "1rem", fontWeight: 600 }}>Other Ded.</th>
                    <th style={{ padding: "1rem", fontWeight: 600 }}>Net Pay</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid var(--kalki-border)" }}>
                      <td style={{ padding: "1rem" }}>
                        <div style={{ fontWeight: 600 }}>{r.employeeName}</div>
                        <div style={{ fontFamily: "monospace", fontSize: "0.85rem", color: "var(--kalki-text-secondary)" }}>{r.employeeCode}</div>
                      </td>
                      <td style={{ padding: "1rem", fontWeight: 500 }}>₹{r.grossPay.toFixed(2)}</td>
                      <td style={{ padding: "1rem", color: "var(--kalki-danger)" }}>₹{r.statutoryDeductions.epf.toFixed(2)}</td>
                      <td style={{ padding: "1rem", color: "var(--kalki-danger)" }}>₹{r.statutoryDeductions.esi.toFixed(2)}</td>
                      <td style={{ padding: "1rem", color: "var(--kalki-danger)" }}>₹{r.statutoryDeductions.pt.toFixed(2)}</td>
                      <td style={{ padding: "1rem", color: "var(--kalki-danger)" }}>₹{(r.otherDeductions + r.loansAndAdvances).toFixed(2)}</td>
                      <td style={{ padding: "1rem", fontWeight: 600, color: "var(--kalki-success)" }}>₹{r.netPay.toFixed(2)}</td>
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
