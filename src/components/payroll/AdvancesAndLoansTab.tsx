"use client";

import React, { useState } from "react";
import AdvancesSettingsPage from "@/app/payroll/advances-settings/page";
import AdvancesDashboardPage from "@/app/payroll/advances/page";

export function AdvancesAndLoansTab() {
  const [subTab, setSubTab] = useState<"requests" | "settings">("requests");

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '16px' }}>
      <div style={{ display: 'flex', borderBottom: '1px solid var(--kalki-border)' }}>
        <button
          onClick={() => setSubTab("requests")}
          style={{
            padding: '12px 24px',
            background: 'none',
            border: 'none',
            borderBottom: subTab === "requests" ? '2px solid #000' : '2px solid transparent',
            color: subTab === "requests" ? '#000' : '#666',
            fontWeight: subTab === "requests" ? 600 : 400,
            cursor: 'pointer',
            fontSize: '15px'
          }}
        >
          Requests & Approvals
        </button>
        <button
          onClick={() => setSubTab("settings")}
          style={{
            padding: '12px 24px',
            background: 'none',
            border: 'none',
            borderBottom: subTab === "settings" ? '2px solid #000' : '2px solid transparent',
            color: subTab === "settings" ? '#000' : '#666',
            fontWeight: subTab === "settings" ? 600 : 400,
            cursor: 'pointer',
            fontSize: '15px'
          }}
        >
          Configuration (Admin)
        </button>
      </div>

      <div>
        {subTab === "requests" && <AdvancesDashboardPage />}
        {subTab === "settings" && <AdvancesSettingsPage />}
      </div>
    </div>
  );
}
