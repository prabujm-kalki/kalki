"use client";

import { useState } from "react";
import { LeaveApplicationForm } from "./LeaveApplicationForm";
import { EncashmentApplicationForm } from "./EncashmentApplicationForm";

type MyTimeTabsProps = {
  leaveTypes: any[];
  balances: any[];
  employeeId: string;
  organizationId: string;
  locationId: string;
};

export function MyTimeTabs(props: MyTimeTabsProps) {
  const [activeTab, setActiveTab] = useState<"leave" | "encashment">("leave");

  return (
    <div className="att-card" style={{ marginBottom: "1rem", padding: "1rem" }}>
      <div className="att-tabs-container" style={{ marginBottom: "1rem", borderBottom: "1px solid var(--att-border)", paddingBottom: "0.25rem" }}>
        <button 
          className={`att-tab-btn ${activeTab === "leave" ? "active" : ""}`}
          onClick={() => setActiveTab("leave")}
        >
          Apply for Time Off
        </button>
        <button 
          className={`att-tab-btn ${activeTab === "encashment" ? "active" : ""}`}
          onClick={() => setActiveTab("encashment")}
        >
          Request Encashment
        </button>
      </div>
      
      <div style={{ paddingTop: "0.5rem" }}>
        {activeTab === "leave" && <LeaveApplicationForm {...props} />}
        {activeTab === "encashment" && <EncashmentApplicationForm {...props} />}
      </div>
    </div>
  );
}

