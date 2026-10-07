"use client";

import { useState, useEffect } from "react";
import { useSessionView } from "@/components/AppShell";
import { KalkiCard } from "@/components/ui/KalkiCard";
import { KalkiButton } from "@/components/ui/KalkiButton";

export function TMBillConfig() {
  const { selected: scope } = useSessionView();
  const [config, setConfig] = useState<any>({
    apiUrl: "https://api.tmbill.com/tp/v1",
    username: "",
    password: "",
    storeId: "",
    tmposId: "",
    businessDayStartTime: "06:00",
    autoSyncEnabled: false,
    autoSyncIntervalMinutes: 60,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (scope?.organizationId) {
      fetch(`/api/integrations/tmbill/config?organizationId=${scope.organizationId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && data.apiUrl) {
            setConfig(data);
          }
        });
    }
  }, [scope]);

  const handleSave = async () => {
    if (!scope?.organizationId) return;
    setIsLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/integrations/tmbill/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: scope.organizationId,
          ...config,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setMessage("Configuration saved successfully.");
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!scope) {
    return <div style={{ padding: "2rem" }}>Please select an Organization and Location from the top toolbar.</div>;
  }

  return (
    <div className="stack" style={{ padding: "2rem", gap: "2rem", maxWidth: "800px" }}>
      <header>
        <h2>TMBill POS Configuration</h2>
        <p className="muted">Configure API settings, credentials, and synchronization rules.</p>
      </header>

      <KalkiCard>
        <div className="stack" style={{ gap: "1.5rem" }}>
          <h3>API Connection</h3>
          <div className="grid-2">
            <div className="field">
              <label>API Base URL</label>
              <input 
                type="url" 
                value={config.apiUrl} 
                onChange={(e) => setConfig({ ...config, apiUrl: e.target.value })} 
                className="input" 
              />
            </div>
          </div>
          
          <div className="grid-2">
            <div className="field">
              <label>Username</label>
              <input 
                type="text" 
                value={config.username || ""} 
                onChange={(e) => setConfig({ ...config, username: e.target.value })} 
                className="input" 
              />
            </div>
            <div className="field">
              <label>Password</label>
              <input 
                type="password" 
                value={config.password || ""} 
                onChange={(e) => setConfig({ ...config, password: e.target.value })} 
                className="input" 
              />
            </div>
          </div>

          <div className="grid-2">
            <div className="field">
              <label>Store ID</label>
              <input 
                type="text" 
                value={config.storeId || ""} 
                onChange={(e) => setConfig({ ...config, storeId: e.target.value })} 
                className="input" 
              />
            </div>
            <div className="field">
              <label>TMPOS ID (Optional)</label>
              <input 
                type="text" 
                value={config.tmposId || ""} 
                onChange={(e) => setConfig({ ...config, tmposId: e.target.value })} 
                className="input" 
              />
            </div>
          </div>
        </div>
      </KalkiCard>

      <KalkiCard>
        <div className="stack" style={{ gap: "1.5rem" }}>
          <h3>Synchronization Rules</h3>
          
          <div className="field" style={{ maxWidth: "300px" }}>
            <label>Business Day Start Time</label>
            <p className="text-sm muted" style={{ marginBottom: "0.5rem" }}>
              Example: "06:00" means any sale before 6:00 AM counts towards the previous calendar day's total. This is crucial for restaurants operating past midnight.
            </p>
            <input 
              type="time" 
              value={config.businessDayStartTime || "06:00"} 
              onChange={(e) => setConfig({ ...config, businessDayStartTime: e.target.value })} 
              className="input" 
            />
          </div>

          <div className="row" style={{ alignItems: "center", gap: "1rem" }}>
            <input 
              type="checkbox" 
              id="autoSync"
              checked={config.autoSyncEnabled || false} 
              onChange={(e) => setConfig({ ...config, autoSyncEnabled: e.target.checked })} 
            />
            <label htmlFor="autoSync" style={{ margin: 0, fontWeight: "normal" }}>
              Enable Automated Background Sync
            </label>
          </div>

          {config.autoSyncEnabled && (
            <div className="field" style={{ maxWidth: "300px" }}>
              <label>Sync Interval (Minutes)</label>
              <input 
                type="number" 
                min="15"
                value={config.autoSyncIntervalMinutes || 60} 
                onChange={(e) => setConfig({ ...config, autoSyncIntervalMinutes: Number(e.target.value) })} 
                className="input" 
              />
            </div>
          )}
        </div>
      </KalkiCard>

      <div className="row" style={{ justifyContent: "flex-end" }}>
        <KalkiButton onClick={handleSave} isLoading={isLoading} variant="primary">
          Save Configuration
        </KalkiButton>
      </div>

      {message && (
        <div style={{ padding: "1rem", borderRadius: "4px", backgroundColor: message.startsWith("Error") ? "#fee2e2" : "#dcfce7", color: message.startsWith("Error") ? "#991b1b" : "#166534" }}>
          {message}
        </div>
      )}
    </div>
  );
}
