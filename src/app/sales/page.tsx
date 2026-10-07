"use client";

import { useSessionView } from "@/components/AppShell";
import Link from "next/link";
import { useEffect, useState } from "react";
import { TMBillSyncPanel } from "@/components/integrations/TMBillSyncPanel";
import { TMBillConfig } from "@/components/integrations/TMBillConfig";
import { SalesChannelsDashboard } from "@/components/sales/SalesChannelsDashboard";
import { SalesOverview } from "@/components/sales/SalesOverview";

export default function SalesDashboard() {
  const { selected: scope } = useSessionView();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'channels' | 'config'>('dashboard');
  const [stats, setStats] = useState({ totalAmount: 0, totalBills: 0 });

  const fetchStats = () => {
    if (!scope?.locationId) return;
    fetch("/api/sales/stats?locationId=" + scope.locationId)
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    fetchStats();
  }, [scope]);

  if (!scope) {
    return (
      <div className="stack" style={{ padding: "2rem" }}>
        <p>Please select an Organization and Location from the top toolbar to view sales.</p>
      </div>
    );
  }

  return (
    <div className="stack" style={{ padding: "2rem", gap: "2rem" }}>
      <header className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h2>Sales Foundation</h2>
          <p className="muted">
            Import, normalize, and monitor authoritative sales data.
          </p>
        </div>
        <Link href="/sales/import" className="btn btn-primary">
          Import TMBill Excel
        </Link>
      </header>

      <div className="row" style={{ gap: "1rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "1rem" }}>
        <button 
          className={`btn ${activeTab === 'dashboard' ? 'btn-primary' : 'btn-ghost'}`} 
          onClick={() => setActiveTab('dashboard')}
        >
          Sales Dashboard
        </button>
        <button 
          className={`btn ${activeTab === 'channels' ? 'btn-primary' : 'btn-ghost'}`} 
          onClick={() => setActiveTab('channels')}
        >
          Sales Channels
        </button>
        <button 
          className={`btn ${activeTab === 'config' ? 'btn-primary' : 'btn-ghost'}`} 
          onClick={() => setActiveTab('config')}
        >
          ⚙️ Integration Settings
        </button>
      </div>

      {activeTab === 'dashboard' && (
        <SalesOverview />
      )}

      {activeTab === 'channels' && (
        <SalesChannelsDashboard />
      )}

      {activeTab === 'config' && (
        <TMBillConfig />
      )}
    </div>
  );
}
