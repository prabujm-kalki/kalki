"use client";

import { useState } from "react";
import { UploadCloud, CheckCircle, AlertTriangle } from "lucide-react";
import { processBiometricUpload } from "@/domains/attendance/actions";

export function BiometricUploader() {
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message?: string; stats?: any; error?: string } | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setResult(null);

    try {
      const text = await file.text();
      // Extremely basic CSV Parser for MVP (Assumes biometricId,punchTimestamp,machineId,punchType)
      const rows = text.split("\n").slice(1).filter(r => r.trim()); 
      
      const parsedData = rows.map(row => {
        const [biometricId, punchTimestamp, machineId, punchType] = row.split(",").map(c => c.trim());
        return {
          biometricId,
          punchTimestamp,
          machineId: machineId || "UNKNOWN",
          punchType: punchType || "UNKNOWN"
        };
      });

      // Tenant isolation: Hardcoded org/location for demo purposes, 
      // but in real app this comes from Context/Session
      const orgId = "00000000-0000-0000-0000-000000000000"; 
      const locId = "00000000-0000-0000-0000-000000000000";

      const res = await processBiometricUpload(parsedData, orgId, locId, file.name);
      setResult(res);
    } catch (err) {
      setResult({ success: false, error: "Failed to parse file locally." });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="att-card" style={{ maxWidth: "600px" }}>
      <h3 className="att-title" style={{ fontSize: "1.25rem" }}>Upload Biometric Logs</h3>
      <p className="att-subtitle" style={{ marginBottom: "1.5rem" }}>Upload the raw CSV export from the terminal.</p>
      
      <label className="att-upload-zone">
        <UploadCloud className="att-upload-icon" />
        <div style={{ fontWeight: 600 }}>Click or drag file to upload</div>
        <div style={{ fontSize: "0.875rem", color: "var(--att-text-muted)" }}>Supports .csv</div>
        <input 
          type="file" 
          accept=".csv" 
          style={{ display: "none" }} 
          onChange={handleFileUpload}
          disabled={isUploading}
        />
      </label>

      {isUploading && (
        <div style={{ marginTop: "1rem", textAlign: "center", color: "var(--att-accent)" }}>
          Processing batch securely...
        </div>
      )}

      {result && (
        <div style={{ 
          marginTop: "1.5rem", 
          padding: "1rem", 
          borderRadius: "var(--att-radius)",
          backgroundColor: result.success ? "#dcfce7" : "#fee2e2",
          color: result.success ? "#166534" : "#991b1b",
          display: "flex",
          alignItems: "flex-start",
          gap: "0.75rem"
        }}>
          {result.success ? <CheckCircle /> : <AlertTriangle />}
          <div>
            <div style={{ fontWeight: 600 }}>{result.success ? "Upload Successful" : "Upload Failed"}</div>
            <div>{result.message || result.error}</div>
            {result.stats && (
              <div style={{ marginTop: "0.5rem", fontSize: "0.875rem" }}>
                <div>Total Parsed: {result.stats.total}</div>
                <div>Inserted: {result.stats.successfulRows}</div>
                <div>Duplicates Skipped: {result.stats.failedRows}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
