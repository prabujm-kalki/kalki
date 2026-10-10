"use client";

import { useState, useEffect } from "react";
import { useSessionView } from "@/components/AppShell";
import { KalkiCard } from "@/components/ui/KalkiCard";
import { KalkiButton } from "@/components/ui/KalkiButton";
import { updatePrimarySalesSource, testTMBillConnection } from "@/app/sales/config-actions";
import { TMBillSyncPanel } from "@/components/integrations/TMBillSyncPanel";
import { useToast } from "@/components/ui/Toast";

export function TMBillConfig({ primarySource, setPrimarySource }: { primarySource?: string, setPrimarySource?: any }) {
  const { selected: scope } = useSessionView();
  const { addToast } = useToast();
  const [config, setConfig] = useState<any>({
    providerName: "TMBILL",
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
  const [isTesting, setIsTesting] = useState(false);

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
      addToast({ type: 'success', message: 'Configuration saved successfully' });
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Failed to save configuration' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    try {
      const res = await testTMBillConnection(config);
      if (res.success) {
        addToast({ type: 'success', message: 'Connection successful', description: 'TMBill API is reachable and credentials are valid.' });
      } else {
        addToast({ type: 'error', message: 'Connection failed', description: res.message });
      }
    } catch (err: any) {
      addToast({ type: 'error', message: 'Connection error', description: err.message });
    } finally {
      setIsTesting(false);
    }
  };

  if (!scope) {
    return <div style={{ padding: "2rem" }}>Please select an Organization and Location from the top toolbar.</div>;
  }

  return (
    <div className="stack" style={{ padding: "0", gap: "1.25rem", maxWidth: "800px" }}>
      <KalkiCard>
        <div className="stack" style={{ gap: "0.75rem" }}>
          <h3 style={{ margin: 0 }}>Primary Sales Source</h3>
          <p className="text-sm muted" style={{ margin: 0 }}>
            Select how you want to manage your sales. This alters the Sales Dashboard layout.
          </p>
          <div className="field" style={{ maxWidth: "300px" }}>
            <select 
              value={primarySource || 'Hybrid'} 
              onChange={async (e) => {
                const val = e.target.value;
                if (setPrimarySource) setPrimarySource(val);
                if (scope?.organizationId) await updatePrimarySalesSource(scope.organizationId, val);
              }} 
              className="input"
            >
              <option value="External POS">External POS</option>
              <option value="Internal Billing">Internal Billing</option>
              <option value="Hybrid">Hybrid</option>
            </select>
          </div>
        </div>
      </KalkiCard>

      {primarySource !== 'Internal Billing' && (
      <>
      <KalkiCard>
        <div className="stack" style={{ gap: "1rem" }}>
          <h3 style={{ margin: 0 }}>API Connection</h3>
          <div className="grid-2">
            <div className="field">
              <label>Provider Name</label>
              <input 
                type="text" 
                value={config.providerName || ""} 
                onChange={(e) => setConfig({ ...config, providerName: e.target.value })} 
                className="input" 
                placeholder="e.g. TMBILL"
              />
            </div>
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
              <label>POS ID</label>
              <input 
                type="text" 
                value={config.tmposId || ""} 
                onChange={(e) => setConfig({ ...config, tmposId: e.target.value })} 
                className="input" 
              />
            </div>
          </div>
          
          <div className="row" style={{ marginTop: "0.5rem" }}>
            <KalkiButton onClick={handleTest} isLoading={isTesting} variant="secondary">
              Test Connection
            </KalkiButton>
          </div>
        </div>
      </KalkiCard>

      <KalkiCard>
        <div className="stack" style={{ gap: "1rem" }}>
          <h3 style={{ margin: 0 }}>Synchronization Rules</h3>
          
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
      <div style={{ marginTop: "1rem" }}>
        <TMBillSyncPanel organizationId={scope.organizationId} locationId={scope.locationId || undefined} />
      </div>
      </>
      )}

      <div className="row" style={{ justifyContent: "flex-end" }}>
        <KalkiButton onClick={handleSave} isLoading={isLoading} variant="primary">
          Save Configuration
        </KalkiButton>
      </div>
    </div>
  );
}
