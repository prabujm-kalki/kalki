"use client";

import { useState } from "react";
import { KalkiButton } from "@/components/ui/KalkiButton";
import { KalkiCard } from "@/components/ui/KalkiCard";
import Link from "next/link";

export function TMBillSyncPanel({ organizationId, locationId, onSyncComplete }: { organizationId: string, locationId?: string, onSyncComplete?: () => void }) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const getTodayString = () => new Date().toISOString().split('T')[0];
  const [fromDateStr, setFromDateStr] = useState(getTodayString());
  const [toDateStr, setToDateStr] = useState(getTodayString());

  const handleSync = async () => {
    setIsSyncing(true);
    setMessage(null);
    try {
      const fromDate = `${fromDateStr} 00:00:00`;
      const toDate = `${toDateStr} 23:59:59`;

      const response = await fetch("/api/integrations/tmbill/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          locationId,
          fromDate,
          toDate
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || "Failed to sync");
      }

      setMessage(`Success: Processed ${data.result?.totalProcessed || 0} orders.`);
      if (onSyncComplete) {
        onSyncComplete();
      }
    } catch (error: any) {
      setMessage(`Error: ${error.message || "An error occurred during sync."}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <KalkiCard>
      <div className="stack" style={{ gap: "1rem" }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <h3>TMBill POS Integration</h3>
            <p className="muted" style={{ margin: 0 }}>
              Synchronize sales orders and ADSR reports from your TMBill POS system directly into Kalki BOS.
            </p>
          </div>
        </div>
        
        <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-end", backgroundColor: "var(--background-alt)", padding: "1rem", borderRadius: "8px" }}>
          <div className="row" style={{ gap: "1rem" }}>
            <div className="field">
              <label>From Date</label>
              <input type="date" value={fromDateStr} onChange={e => setFromDateStr(e.target.value)} className="input" />
            </div>
            <div className="field">
              <label>To Date</label>
              <input type="date" value={toDateStr} onChange={e => setToDateStr(e.target.value)} className="input" />
            </div>
          </div>
          <KalkiButton onClick={handleSync} isLoading={isSyncing} variant="primary">
            {isSyncing ? "Syncing..." : "Sync Now"}
          </KalkiButton>
        </div>
        
        {message && (
          <div style={{ marginTop: "1rem", padding: "0.5rem", borderRadius: "4px", backgroundColor: message.startsWith("Error") ? "#fee2e2" : "#dcfce7", color: message.startsWith("Error") ? "#991b1b" : "#166534" }}>
            {message}
          </div>
        )}
      </div>
    </KalkiCard>
  );
}
