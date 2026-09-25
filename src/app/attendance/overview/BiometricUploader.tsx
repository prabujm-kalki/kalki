"use client";

import { useState, useEffect } from "react";
import { UploadCloud, CheckCircle, AlertTriangle, Settings2, FileSpreadsheet } from "lucide-react";
import { processBiometricUpload } from "@/domains/attendance/actions";
import { useSessionView } from "@/components/AppShell";
import * as XLSX from "xlsx";

type MappingConfig = {
  biometricIdIdx: number;
  timestampIdx: number;
  punchTypeIdx?: number;
  machineIdIdx?: number;
};

export function BiometricUploader() {
  const { selected } = useSessionView();
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message?: string; stats?: any; error?: string } | null>(null);
  
  // Mapping UI State
  const [fileToProcess, setFileToProcess] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawData, setRawData] = useState<any[][]>([]);
  const [showMappingUI, setShowMappingUI] = useState(false);
  
  // Mapped indices
  const [biometricIdCol, setBiometricIdCol] = useState<string>("");
  const [timestampCol, setTimestampCol] = useState<string>("");
  const [punchTypeCol, setPunchTypeCol] = useState<string>("");
  const [machineIdCol, setMachineIdCol] = useState<string>("");

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setFileToProcess(file);
    setIsUploading(true);
    setResult(null);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      const json: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      if (json.length < 2) throw new Error("File is empty or missing data rows.");
      
      const extractedHeaders = json[0].map((h: any) => String(h).trim());
      setHeaders(extractedHeaders);
      setRawData(json.slice(1).filter(row => row.length > 0)); // Skip header, remove empty rows

      // Try to load saved mapping for this specific header signature
      const signature = extractedHeaders.join("|");
      const savedMapping = localStorage.getItem(`kalki_bio_map_${signature}`);
      
      if (savedMapping) {
        const config: MappingConfig = JSON.parse(savedMapping);
        await processMappedData(json.slice(1), config, file.name);
      } else {
        // Show mapping UI
        // Attempt fuzzy matching for defaults
        const bioGuess = extractedHeaders.findIndex(h => h.toLowerCase().includes("id") || h.toLowerCase().includes("emp") || h.toLowerCase().includes("pin"));
        const timeGuess = extractedHeaders.findIndex(h => h.toLowerCase().includes("time") || h.toLowerCase().includes("date") || h.toLowerCase().includes("log"));
        const typeGuess = extractedHeaders.findIndex(h => h.toLowerCase().includes("state") || h.toLowerCase().includes("type") || h.toLowerCase().includes("in/out"));
        const machineGuess = extractedHeaders.findIndex(h => h.toLowerCase().includes("device") || h.toLowerCase().includes("machine") || h.toLowerCase().includes("sn"));

        if (bioGuess !== -1) setBiometricIdCol(bioGuess.toString());
        if (timeGuess !== -1) setTimestampCol(timeGuess.toString());
        if (typeGuess !== -1) setPunchTypeCol(typeGuess.toString());
        if (machineGuess !== -1) setMachineIdCol(machineGuess.toString());
        
        setShowMappingUI(true);
        setIsUploading(false);
      }
    } catch (err) {
      setResult({ success: false, error: err instanceof Error ? err.message : "Failed to parse file." });
      setIsUploading(false);
    }
  };

  const handleSaveMappingAndProcess = async () => {
    if (!biometricIdCol || !timestampCol) {
      alert("Biometric ID and Timestamp columns are strictly mandatory.");
      return;
    }
    
    setShowMappingUI(false);
    setIsUploading(true);

    const config: MappingConfig = {
      biometricIdIdx: parseInt(biometricIdCol),
      timestampIdx: parseInt(timestampCol),
      punchTypeIdx: punchTypeCol ? parseInt(punchTypeCol) : undefined,
      machineIdIdx: machineIdCol ? parseInt(machineIdCol) : undefined,
    };

    // Save mapping signature for future uploads
    const signature = headers.join("|");
    localStorage.setItem(`kalki_bio_map_${signature}`, JSON.stringify(config));

    await processMappedData(rawData, config, fileToProcess!.name);
  };

  const processMappedData = async (dataRows: any[][], config: MappingConfig, filename: string) => {
    try {
      const parsedData = dataRows.map(row => {
        // Handle Excel date numbers if present
        let timestampVal = row[config.timestampIdx];
        if (typeof timestampVal === 'number') {
          // Convert Excel serial date to string
          const date = new Date(Math.round((timestampVal - 25569) * 86400 * 1000));
          timestampVal = date.toISOString();
        }
        
        return {
          biometricId: String(row[config.biometricIdIdx] || ""),
          punchTimestamp: String(timestampVal || ""),
          machineId: config.machineIdIdx !== undefined ? String(row[config.machineIdIdx] || "UNKNOWN") : "UNKNOWN",
          punchType: config.punchTypeIdx !== undefined ? String(row[config.punchTypeIdx] || "UNKNOWN") : "UNKNOWN"
        };
      }).filter(r => r.biometricId && r.punchTimestamp); // Filter out rows missing mandatory fields

      // Tenant isolation: Fetch from Context/Session
      const orgId = selected?.organizationId || "00000000-0000-0000-0000-000000000000"; 
      const locId = selected?.locationId || "00000000-0000-0000-0000-000000000000";

      const res = await processBiometricUpload(parsedData, orgId, locId, filename);
      setResult(res);
    } catch (err) {
      setResult({ success: false, error: "Upload failed during processing." });
    } finally {
      setIsUploading(false);
      setFileToProcess(null);
    }
  };

  return (
    <div className="att-card" style={{ maxWidth: "600px" }}>
      <h3 className="att-title" style={{ fontSize: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <FileSpreadsheet size={20} color="var(--att-primary)" /> Upload Biometric Logs
      </h3>
      <p className="att-subtitle" style={{ marginBottom: "1.5rem" }}>Upload raw exported logs (.csv or .xlsx) from any hardware terminal.</p>
      
      {!showMappingUI ? (
        <>
          <label className="att-upload-zone">
            <UploadCloud className="att-upload-icon" />
            <div style={{ fontWeight: 600 }}>Click or drag file to upload</div>
            <div style={{ fontSize: "0.875rem", color: "var(--att-text-muted)" }}>Supports .csv, .xlsx</div>
            <input 
              type="file" 
              accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
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
        </>
      ) : (
        <div style={{ background: "var(--att-bg-subtle)", padding: "1.5rem", borderRadius: "8px", border: "1px solid var(--att-border)" }}>
          <h4 style={{ margin: "0 0 1rem 0", display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--att-primary)" }}>
            <Settings2 size={18} /> Map Columns
          </h4>
          <p style={{ fontSize: "0.875rem", color: "var(--att-text-muted)", marginBottom: "1.5rem" }}>
            We haven't seen this file format before. Please map your Excel/CSV columns to Kalki BOS fields. This configuration will be saved for future uploads.
          </p>
          
          <div style={{ display: "grid", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.25rem" }}>Biometric / Device ID <span style={{color: "red"}}>*</span></label>
              <select className="att-input-premium" value={biometricIdCol} onChange={e => setBiometricIdCol(e.target.value)}>
                <option value="">-- Select Column --</option>
                {headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.25rem" }}>Punch Timestamp <span style={{color: "red"}}>*</span></label>
              <select className="att-input-premium" value={timestampCol} onChange={e => setTimestampCol(e.target.value)}>
                <option value="">-- Select Column --</option>
                {headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.25rem" }}>Punch Type (Optional)</label>
              <select className="att-input-premium" value={punchTypeCol} onChange={e => setPunchTypeCol(e.target.value)}>
                <option value="">-- Ignore --</option>
                {headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.25rem" }}>Machine ID (Optional)</label>
              <select className="att-input-premium" value={machineIdCol} onChange={e => setMachineIdCol(e.target.value)}>
                <option value="">-- Ignore --</option>
                {headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: "flex", gap: "1rem", marginTop: "2rem" }}>
            <button type="button" onClick={() => setShowMappingUI(false)} className="att-button-premium" style={{ background: "transparent", color: "var(--att-text)", border: "1px solid var(--att-border)", flex: 1 }}>
              Cancel
            </button>
            <button type="button" onClick={handleSaveMappingAndProcess} className="att-button-premium" style={{ flex: 2 }}>
              Save Mapping & Process
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
