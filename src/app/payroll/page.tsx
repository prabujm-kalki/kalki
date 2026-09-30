"use client";

import React, { useState } from "react";
import { KalkiPageHeader } from "@/components/ui/KalkiPageHeader";
import { AppShell, useSessionView } from "@/components/AppShell";
import { PlayCircle, HandCoins, Landmark, History, UserMinus } from "lucide-react";
import { PayConfigurationTab } from "@/components/payroll/PayConfigurationTab";
import { PayrollProcessingTab } from "@/components/payroll/PayrollProcessingTab";
import { PayslipsHistoryTab } from "@/components/payroll/PayslipsHistoryTab";
import { FnFSettlementsTab } from "@/components/payroll/FnFSettlementsTab";

type PayrollTab = "run" | "advances" | "config" | "history" | "fnf";
import { AdvancesAndLoansTab } from "@/components/payroll/AdvancesAndLoansTab";

function UnderConstruction({ title }: { title: string }) {
  return (
    <div style={{ padding: "4rem 2rem", textAlign: "center", color: "var(--kalki-text-secondary)" }}>
      <h3>{title} is Under Construction</h3>
      <p>This module is currently being built and will be available soon.</p>
    </div>
  );
}

function PayrollDashboard() {
  const { session, selected } = useSessionView();
  const [activeTab, setActiveTab] = useState<PayrollTab>("run");

  return (
    <div className="kalki-page">
      <KalkiPageHeader 
        title="Payroll Management" 
        description="Manage pay configuration, process payroll, and handle statutory settings."
      />

      <div className="kalki-dashboard-grid" style={{ padding: '0 2rem' }}>
        
        <div className="kalki-module-nav" style={{ overflowX: 'auto', display: 'flex', gap: '8px' }}>
          <button
            className={`kalki-module-link ${activeTab === 'run' ? 'active' : ''}`}
            onClick={() => setActiveTab('run')}
            style={{ background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            <PlayCircle size={18} /> Payroll Processing
          </button>
          {(session?.isOwner || selected?.permissions?.includes("payroll.advances:read") || selected?.permissions?.includes("payroll.advances:write")) && (
            <button
              className={`kalki-module-link ${activeTab === 'advances' ? 'active' : ''}`}
              onClick={() => setActiveTab('advances')}
              style={{ background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              <HandCoins size={18} /> Advances and Loans
            </button>
          )}
          <button
            className={`kalki-module-link ${activeTab === 'config' ? 'active' : ''}`}
            onClick={() => setActiveTab('config')}
            style={{ background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            <Landmark size={18} /> Pay Configuration
          </button>
          <button
            className={`kalki-module-link ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
            style={{ background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            <History size={18} /> Payslips and History
          </button>
          <button
            className={`kalki-module-link ${activeTab === 'fnf' ? 'active' : ''}`}
            onClick={() => setActiveTab('fnf')}
            style={{ background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            <UserMinus size={18} /> F&F Settlement
          </button>
        </div>

        <div className="kalki-tab-content">
          {activeTab === 'config' && selected ? (
            <PayConfigurationTab organizationId={selected.organizationId} locationId={selected.locationId} />
          ) : activeTab === 'run' ? (
            <PayrollProcessingTab />
          ) : activeTab === 'history' ? (
            <PayslipsHistoryTab />
          ) : activeTab === 'advances' ? (
            <AdvancesAndLoansTab />
          ) : activeTab === 'fnf' && selected ? (
            <FnFSettlementsTab organizationId={selected.organizationId} />
          ) : (
            <UnderConstruction title="" />
          )}
        </div>
      </div>
    </div>
  );
}

export default function PayrollDashboardPage() {
  return (
    <AppShell>
      <PayrollDashboard />
    </AppShell>
  );
}
