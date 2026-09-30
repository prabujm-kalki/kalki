"use client";

import React, { useState } from "react";
import { Calendar, PlayCircle, AlertCircle } from "lucide-react";
import { DraftPayslip } from "@/domains/payroll/calculator";
import { generateDraftPayroll } from "@/app/payroll/processing/actions";
import { useSessionView } from "@/components/AppShell";

export function PayrollProcessingTab() {
  const { selected } = useSessionView();
  const [frequency, setFrequency] = useState("MONTHLY");
  
  // Date states for Hourly/Daily
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  
  // Date states for Weekly/Monthly
  const [selectedPeriod, setSelectedPeriod] = useState("");

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<DraftPayslip[] | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

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
              <label style={{ fontSize: "0.9rem", fontWeight: 500 }}>Select Month</label>
              <select 
                className="kalki-input" 
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
              >
                <option value="">-- Select Month --</option>
                <option value="2026-09">September 2026</option>
                <option value="2026-08">August 2026</option>
                <option value="2026-07">July 2026</option>
              </select>
            </div>
          )}

          {frequency === "WEEKLY" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flex: "2", minWidth: "250px" }}>
              <label style={{ fontSize: "0.9rem", fontWeight: 500 }}>Select Week</label>
              <select 
                className="kalki-input" 
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
              >
                <option value="">-- Select Week --</option>
                <option value="2026-09-21_2026-09-27">21-09-2026 to 27-09-2026 (Mon-Sun)</option>
                <option value="2026-09-14_2026-09-20">14-09-2026 to 20-09-2026 (Mon-Sun)</option>
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
