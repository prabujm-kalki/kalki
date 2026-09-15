"use client";

import { Plus, Users, PackagePlus, FileCheck } from "lucide-react";

interface PendingApproval {
  id: string;
  amount: number;
  vendorName: string;
}

interface DashboardActionsProps {
  pendingApprovals: PendingApproval[];
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
};

export function DashboardActions({ pendingApprovals }: DashboardActionsProps) {
  return (
    <div className="card" style={{ padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', backgroundColor: 'white', height: '100%' }}>
      <h3 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '1rem' }}>Quick Actions</h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <button style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.5rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.25rem', textAlign: 'left', cursor: 'pointer', transition: 'background-color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}>
          <div style={{ padding: '0.25rem', backgroundColor: '#e0e7ff', color: '#4f46e5', borderRadius: '0.25rem' }}>
            <Plus size={14} />
          </div>
          <span style={{ fontWeight: '500', fontSize: '0.75rem' }}>Create New PO</span>
        </button>

        <button style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.5rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.25rem', textAlign: 'left', cursor: 'pointer', transition: 'background-color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}>
          <div style={{ padding: '0.25rem', backgroundColor: '#dcfce7', color: '#16a34a', borderRadius: '0.25rem' }}>
            <PackagePlus size={14} />
          </div>
          <span style={{ fontWeight: '500', fontSize: '0.75rem' }}>Record Goods Receipt</span>
        </button>

        <button style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.5rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.25rem', textAlign: 'left', cursor: 'pointer', transition: 'background-color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}>
          <div style={{ padding: '0.25rem', backgroundColor: '#fef3c7', color: '#d97706', borderRadius: '0.25rem' }}>
            <Users size={14} />
          </div>
          <span style={{ fontWeight: '500', fontSize: '0.75rem' }}>Add New Vendor</span>
        </button>
      </div>

      <div style={{ marginTop: '1.5rem' }}>
        <h3 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileCheck size={14} /> Requires My Approval
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {pendingApprovals.map(approval => (
            <div key={approval.id} style={{ padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '0.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.125rem' }}>
                <span style={{ fontWeight: '600', fontSize: '0.75rem' }}>{approval.id}</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>{formatCurrency(approval.amount)}</span>
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.375rem' }}>{approval.vendorName}</div>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button style={{ flex: 1, padding: '0.2rem', backgroundColor: '#22c55e', color: 'white', border: 'none', borderRadius: '0.25rem', fontSize: '0.65rem', cursor: 'pointer' }}>Approve</button>
                <button style={{ flex: 1, padding: '0.2rem', backgroundColor: '#f87171', color: 'white', border: 'none', borderRadius: '0.25rem', fontSize: '0.65rem', cursor: 'pointer' }}>Reject</button>
              </div>
            </div>
          ))}
          {pendingApprovals.length === 0 && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>No pending approvals</div>
          )}
        </div>
      </div>
    </div>
  );
}
