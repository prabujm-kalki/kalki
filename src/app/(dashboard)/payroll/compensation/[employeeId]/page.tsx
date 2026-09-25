import React from "react";

export default async function CompensationPage({ params }: { params: { employeeId: string } }) {
  return (
    <div className="kalki-container kalki-fade-in">
      <div className="kalki-header">
        <div className="kalki-header-title">
          <h1>Payroll & Compensation</h1>
          <p>Configure salary structures and statutory compliance.</p>
        </div>
      </div>
      
      <div className="kalki-card">
        <h2>Compensation Form Placeholder</h2>
        <p>This section is currently under construction for Phase 1 of the Payroll module.</p>
        <p>Employee ID: {params.employeeId}</p>
      </div>
    </div>
  );
}
