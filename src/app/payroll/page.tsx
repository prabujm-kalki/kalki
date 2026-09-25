"use client";

import React, { useState } from "react";
import { KalkiPageHeader } from "@/components/ui/KalkiPageHeader";
import { AppShell } from "@/components/AppShell";
import { DollarSign, FileText, History, HandCoins } from "lucide-react";
import { useSessionView } from "@/components/AppShell";
import { SalaryAdvancesTab } from "@/components/payroll/SalaryAdvancesTab";

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
            {activeTab === 'run' && (
              <div className="kalki-card">
                <div className="kalki-section-header">
                  <h3 className="kalki-section-title">
                    <DollarSign size={20} className="kalki-icon-accent" /> Run Monthly Payroll
                  </h3>
                </div>
                <p className="kalki-text-muted" style={{ marginBottom: '1.5rem' }}>
                  Select a month and location to process attendance data into generated payslips.
                </p>
                
                <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: 'var(--kalki-bg-secondary)', borderRadius: 'var(--kalki-radius-md)', border: '1px dashed var(--kalki-border)' }}>
                  <p>Payroll Run Wizard will be implemented here.</p>
                  <button className="kalki-btn kalki-btn-primary" style={{ marginTop: '1rem' }} disabled>
                    Start Payroll Run
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'advances' && selected && (
              <SalaryAdvancesTab organizationId={selected.organizationId} locationId={selected.locationId} />
            )}

            {activeTab === 'history' && (
              <div className="kalki-card">
                <div className="kalki-section-header">
                  <h3 className="kalki-section-title">
                    <History size={20} className="kalki-icon-accent" /> Payslip History & Reports
                  </h3>
                </div>
                <p className="kalki-text-muted" style={{ marginBottom: '1.5rem' }}>
                  View past payroll runs, download payslips, and generate statutory compliance reports (EPF, ESI, PT).
                </p>

                <div className="kalki-table-container">
                  <table className="kalki-table">
                    <thead>
                      <tr>
                        <th>Period</th>
                        <th>Run Date</th>
                        <th>Gross Total</th>
                        <th>Net Total</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--kalki-text-muted)' }}>
                          No previous payroll runs found.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
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
