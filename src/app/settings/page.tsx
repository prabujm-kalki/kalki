import React, { Suspense } from "react";
import { KalkiPageHeader } from "@/components/ui/KalkiPageHeader";
import { AppShell } from "@/components/AppShell";
import { StatusMessage } from "@/components/StatusMessage";

export default function SettingsPage() {
  return (
    <Suspense fallback={<main className="app-main"><StatusMessage tone="loading">Loading...</StatusMessage></main>}>
      <AppShell>
        <div className="kalki-page">
          <KalkiPageHeader 
            title="Settings" 
          />
          <div className="kalki-dashboard-grid" style={{ padding: '0 2rem' }}>
            <div className="kalki-card">
              <h3>Implementation Phase</h3>
              <p>Please select a setting category from the navigation sidebar or menu.</p>
            </div>
          </div>
        </div>
      </AppShell>
    </Suspense>
  );
}
