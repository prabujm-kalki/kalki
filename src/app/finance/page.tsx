"use client";

export default function FinanceDashboard() {
  return (
    <div className="stack">
      <h1 className="page-title">Finance Dashboard</h1>
      <p className="muted">Overview of your Accounts Payable and Vendor Ledgers.</p>

      <div className="grid-3">
        <div className="panel">
          <h3>Total Payables</h3>
          <p style={{ fontSize: "2rem", fontWeight: "bold", margin: "0.5rem 0", color: "var(--danger)" }}>
            ₹ 0.00
          </p>
          <p className="muted">Outstanding across all vendors</p>
        </div>
        
        <div className="panel">
          <h3>Invoices this Month</h3>
          <p style={{ fontSize: "2rem", fontWeight: "bold", margin: "0.5rem 0" }}>
            0
          </p>
          <p className="muted">Awaiting payment allocation</p>
        </div>

        <div className="panel">
          <h3>Recent Payments</h3>
          <p style={{ fontSize: "2rem", fontWeight: "bold", margin: "0.5rem 0", color: "var(--success)" }}>
            ₹ 0.00
          </p>
          <p className="muted">Last 30 days</p>
        </div>
      </div>
    </div>
  );
}
