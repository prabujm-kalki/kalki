"use client";

import { useSessionView } from "@/components/AppShell";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type MatchStatus = "EXACT" | "SUGGESTED" | "MANUAL" | "MISSING";



export default function ImportSalesPage() {
  const { selected: scope } = useSessionView();
  const [step, setStep] = useState<1 | 2>(1);
  const [file, setFile] = useState<File | null>(null);
  
  // Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeResult, setAnalyzeResult] = useState<{
    headerRowIndex: number;
    headers: string[];
    sampleRows: any[][];
    configuredFields: any[];
  } | null>(null);
  
  // Mapping State
  const [mappingConfig, setMappingConfig] = useState<Record<string, string>>({});
  const [matchStatuses, setMatchStatuses] = useState<Record<string, MatchStatus>>({});

  // Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Intelligent Fuzzy Matching
  useEffect(() => {
    if (!analyzeResult || !scope) return;
    const headers = analyzeResult.headers;
    const newMapping: Record<string, string> = {};
    const newStatuses: Record<string, MatchStatus> = {};
    
    let savedMapping: Record<string, string> | null = null;
    try {
      const saved = localStorage.getItem(`salesMapping_${scope.locationId}`);
      if (saved) savedMapping = JSON.parse(saved);
    } catch(e) {}

    const fields = analyzeResult.configuredFields || [];
    fields.forEach((field: any) => {
      // 1. Check if we have a saved mapping that still exists in headers
      if (savedMapping && savedMapping[field.internalKey]) {
        const savedIdx = parseInt(savedMapping[field.internalKey], 10);
        if (headers[savedIdx]) {
          newMapping[field.internalKey] = String(savedIdx);
          newStatuses[field.internalKey] = "MANUAL";
          return;
        }
      }

      // 2. Intelligent Search
      let matchIdx = -1;
      let status: MatchStatus = "MISSING";

      for (let i = 0; i < headers.length; i++) {
        const headerLower = (headers[i] || "").toLowerCase().trim();
        if (!headerLower) continue;

        // Exact Match
        if (headerLower === field.displayName.toLowerCase()) {
          matchIdx = i;
          status = "EXACT";
          break;
        }

        // Fuzzy/Alias Match
        if (field.aliases && field.aliases.includes(headerLower)) {
          matchIdx = i;
          status = "SUGGESTED";
        }
      }

      if (matchIdx !== -1) {
        newMapping[field.internalKey] = String(matchIdx);
        newStatuses[field.internalKey] = status;
      } else {
        newStatuses[field.internalKey] = "MISSING";
      }
    });

    setMappingConfig(newMapping);
    setMatchStatuses(newStatuses);
  }, [analyzeResult, scope]);

  if (!scope) {
    return (
      <div className="stack" style={{ padding: "2rem" }}>
        <p>Please select an Organization and Location from the top toolbar to import sales.</p>
      </div>
    );
  }

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("organizationId", scope.organizationId);

    try {
      const res = await fetch("/api/sales/upload/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");

      setAnalyzeResult(data);
      setStep(2);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !analyzeResult) return;

    setIsUploading(true);
    setError(null);
    setResult(null);

    // Save mapping
    localStorage.setItem(`salesMapping_${scope.locationId}`, JSON.stringify(mappingConfig));

    const formData = new FormData();
    formData.append("file", file);
    formData.append("locationId", scope.locationId);
    formData.append("organizationId", scope.organizationId);
    formData.append("mappingConfig", JSON.stringify(mappingConfig));
    formData.append("headerRowIndex", String(analyzeResult.headerRowIndex));

    try {
      const res = await fetch("/api/sales/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const getBadgeClass = (status: MatchStatus) => {
    switch (status) {
      case "EXACT": return "badge-success";
      case "SUGGESTED": return "badge-warning";
      case "MANUAL": return "badge-info";
      default: return "badge-danger";
    }
  };

  const getBadgeLabel = (status: MatchStatus) => {
    switch (status) {
      case "EXACT": return "Exact Match";
      case "SUGGESTED": return "Suggested Match";
      case "MANUAL": return "Saved/Manual";
      default: return "Missing";
    }
  };

  return (
    <div className="stack" style={{ padding: "2rem" }}>
      <header className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h2>Import Sales Excel</h2>
          <p className="muted">Intelligent, configurable mapping for POS data.</p>
        </div>
        <Link href="/sales" className="btn btn-outline">
          Back to Dashboard
        </Link>
      </header>

      {error && <div style={{ color: "var(--danger-color)", padding: "1rem", border: "1px solid var(--danger-color)", borderRadius: "8px" }}>Error: {error}</div>}

      {step === 1 && !result && (
        <div className="card stack" style={{ maxWidth: "600px" }}>
          <form onSubmit={handleAnalyze} className="stack">
            <div className="form-group stack">
              <label htmlFor="fileUpload">Step 1: Select Excel File (.xlsx)</label>
              <input
                type="file"
                id="fileUpload"
                accept=".xlsx, .xls"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                required
                className="input"
                style={{ padding: "0.5rem" }}
              />
              <small className="muted">
                File must contain line-item details. The system will auto-detect headers.
              </small>
            </div>

            <button type="submit" className="btn btn-primary" disabled={isAnalyzing || !file}>
              {isAnalyzing ? "Analyzing Columns..." : "Next: Map Columns"}
            </button>
          </form>
        </div>
      )}

      {step === 2 && !result && analyzeResult && (
        <div className="card stack" style={{ maxWidth: "900px" }}>
          <h3>Step 2: Confirm Intelligent Mapping</h3>
          <p className="muted">We found {analyzeResult.headers.length} headers starting at row {analyzeResult.headerRowIndex + 1}. Please confirm or adjust the mappings below.</p>
          
          <form onSubmit={handleUpload} className="stack">
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--border)" }}>
                    <th style={{ padding: "0.5rem" }}>Kalki BOS Field</th>
                    <th style={{ padding: "0.5rem" }}>Imported Excel Column</th>
                    <th style={{ padding: "0.5rem" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {analyzeResult.configuredFields.map((field: any) => {
                    const status = matchStatuses[field.internalKey] || "MISSING";
                    return (
                      <tr key={field.internalKey} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "0.5rem" }}>
                          <strong>{field.displayName}</strong>
                          {field.isMandatory && <span style={{ color: "var(--danger-color)", marginLeft: "4px" }}>*</span>}
                        </td>
                        <td style={{ padding: "0.5rem" }}>
                          <select 
                            required={field.isMandatory}
                            value={mappingConfig[field.internalKey] || ""}
                            onChange={(e) => {
                              setMappingConfig({ ...mappingConfig, [field.internalKey]: e.target.value });
                              setMatchStatuses({ ...matchStatuses, [field.internalKey]: "MANUAL" });
                            }}
                            className="input"
                            style={{ padding: "0.5rem", width: "100%", maxWidth: "300px" }}
                          >
                            <option value="">-- Select Column --</option>
                            {analyzeResult.headers.map((h, idx) => (
                              <option key={idx} value={idx}>{h || `Column ${idx + 1}`}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ padding: "0.5rem" }}>
                          <span 
                            style={{ 
                              padding: "4px 8px", 
                              borderRadius: "4px", 
                              fontSize: "0.85rem",
                              fontWeight: "bold",
                              backgroundColor: status === "EXACT" ? "#dcfce7" : status === "SUGGESTED" ? "#fef08a" : status === "MANUAL" ? "#e0f2fe" : "#fee2e2",
                              color: status === "EXACT" ? "#166534" : status === "SUGGESTED" ? "#854d0e" : status === "MANUAL" ? "#075985" : "#991b1b"
                            }}
                          >
                            {getBadgeLabel(status)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="row" style={{ justifyContent: "flex-end", gap: "1rem", marginTop: "1rem" }}>
              <button type="button" className="btn btn-outline" onClick={() => setStep(1)} disabled={isUploading}>Back</button>
              <button type="submit" className="btn btn-primary" disabled={isUploading}>
                {isUploading ? "Importing Data..." : "Confirm & Import Sales Data"}
              </button>
            </div>
          </form>
        </div>
      )}

      {result && (
        <div className="card stack" style={{ background: "var(--bg-light)" }}>
          <h4 style={{ color: "var(--success-color)" }}>Upload Successful!</h4>
          <ul>
            <li>Total Rows Processed: {result.totalProcessed}</li>
            <li>New Bills Inserted: {result.newInserted}</li>
            <li>Duplicates Skipped: {result.duplicatesSkipped}</li>
          </ul>
          <button 
            type="button"
            className="btn btn-outline" 
            onClick={() => router.push("/sales")}
          >
            Go to Dashboard
          </button>
        </div>
      )}
    </div>
  );
}
