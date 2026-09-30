"use client";

import { useSessionView } from "@/components/AppShell";
import { useState } from "react";

export default function ConfigurationPage() {
  const { selected } = useSessionView();
  const [loading, setLoading] = useState(false);

  const handleCreateTestSchedule = async () => {
    if (!selected) return alert("Select a location");
    setLoading(true);
    try {
      // 1. We need a vendor ID. For this test, we'll just fetch any active vendor.
      const vendors = await fetch(`/api/vendors?organizationId=${selected.organizationId}`).then(r => r.json());
      const vendorId = vendors.items?.[0]?.id;
      if (!vendorId) {
        alert("Please create a Vendor first in the Vendors tab!");
        setLoading(false);
        return;
      }
      
      // 2. Create the schedule (which will also automatically create the Task Blueprint)
      const res = await fetch("/api/purchase-schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: selected.organizationId,
          locationId: selected.locationId,
          vendorId,
          responsibleRoleId: "00000000-0000-0000-0000-000000000000", // Fallback if needed
          frequencyRule: "daily",
          reminderTime: "06:00",
        })
      });

      if (res.ok) {
        alert("Purchase Schedule & Task Blueprint successfully created! Check the Task Engine.");
      } else {
        alert("Error creating schedule");
      }
    } catch (e) {
      console.error(e);
      alert("Error");
    }
    setLoading(false);
  };

  return (
    <div className="stack">
      <section className="panel">
        <div className="panel-header">
          <h2>Configuration</h2>
          <p className="muted">Purchasing module configuration.</p>
        </div>
        <div style={{ padding: "1rem" }}>
          <h3>Purchase Schedules</h3>
          <p className="muted" style={{ marginBottom: "1rem" }}>
            Create schedules for recurring orders. This automatically links to the Task Engine.
          </p>
          <button 
            className="kalki-button primary" 
            onClick={handleCreateTestSchedule}
            disabled={loading}
          >
            {loading ? "Creating..." : "+ Test Daily Order Schedule"}
          </button>
        </div>
      </section>
    </div>
  );
}
