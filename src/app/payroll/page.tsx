"use client";

import React, { useState } from "react";
import { KalkiPageHeader } from "@/components/ui/KalkiPageHeader";
import { AppShell } from "@/components/AppShell";
import { DollarSign, FileText, History, HandCoins } from "lucide-react";
import { useSessionView } from "@/components/AppShell";
import { SalaryAdvancesTab } from "@/components/payroll/SalaryAdvancesTab";
import { RunPayrollWizard } from "@/components/payroll/RunPayrollWizard";
import { PayslipHistoryTab } from "@/components/payroll/PayslipHistoryTab";

function PayrollDashboard() {
  const { selected } = useSessionView();
  const [activeTab, setActiveTab] = useState<"run" | "advances" | "history">("run");

  return (
    <div className="kalki-page">
      <KalkiPageHeader 
        title="Payroll Management" 
        description="Manage salary structures, generate payslips, and handle advances."
      />

      <div className="kalki-dashboard-grid" style={{ padding: '0 2rem' }}>
        
        <div className="kalki-module-nav" style={{ borderBottom: '1px solid var(--kalki-border)', marginBottom: '2rem' }}>
          <button
            className={`kalki-module-link ${activeTab === 'run' ? 'active' : ''}`}
            onClick={() => setActiveTab('run')}
            style={{ background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer' }}
          >
            <DollarSign size={18} /> Run Payroll
          </button>
          <button
            className={`kalki-module-link ${activeTab === 'advances' ? 'active' : ''}`}
            onClick={() => setActiveTab('advances')}
            style={{ background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer' }}
          >
            <HandCoins size={18} /> Salary Advances
          </button>
          <button
            className={`kalki-module-link ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
            style={{ background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer' }}
          >
            <History size={18} /> Payslip History
          </button>
        </div>

        <div className="kalki-tab-content">
              {activeTab === 'run' && selected && (
                <RunPayrollWizard organizationId={selected.organizationId} locationId={selected.locationId} />
              )}

            {activeTab === 'advances' && selected && (
              <SalaryAdvancesTab organizationId={selected.organizationId} locationId={selected.locationId} />
            )}

            {activeTab === 'history' && selected && (
              <PayslipHistoryTab organizationId={selected.organizationId} locationId={selected.locationId} />
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
