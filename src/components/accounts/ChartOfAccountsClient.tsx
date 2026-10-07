"use client";

import React, { useState, useEffect } from "react";
import { Folder, FileText, Plus, AlertCircle, RefreshCw, Lock, Layers, Edit2 } from "lucide-react";
import { useSessionView } from "@/components/AppShell";
import { fetchChartOfAccounts, createNewAccount, createNewAccountGroup, editAccount, editAccountGroup } from "@/app/finance/actions";

export function ChartOfAccountsClient() {
  const { selected } = useSessionView();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{ types: any[], groups: any[], accounts: any[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("All");

  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  
  const [editAccountState, setEditAccountState] = useState<any | null>(null);
  const [editGroupState, setEditGroupState] = useState<any | null>(null);
  
  const [newAccount, setNewAccount] = useState({ name: "", code: "", accountGroupId: "", description: "" });
  const [newGroup, setNewGroup] = useState({ name: "", code: "", accountTypeId: "" });
  
  const [adding, setAdding] = useState(false);

  const loadData = () => {
    if (!selected) return;
    setLoading(true);
    setError(null);
    fetchChartOfAccounts(selected.organizationId).then(res => {
      if (res.success) {
        setData(res.data as any);
      } else {
        setError(res.error || "Failed to load Chart of Accounts");
      }
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, [selected]);

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setAdding(true);
    const res = await createNewAccount({
      organizationId: selected.organizationId,
      ...newAccount
    });
    if (res.success) {
      setShowAddAccountModal(false);
      setNewAccount({ name: "", code: "", accountGroupId: "", description: "" });
      loadData();
    } else {
      alert("Error: " + res.error);
    }
    setAdding(false);
  };

  const handleEditAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !editAccountState) return;
    setAdding(true);
    const res = await editAccount({
      id: editAccountState.id,
      organizationId: selected.organizationId,
      accountGroupId: editAccountState.accountGroupId,
      name: editAccountState.name,
      code: editAccountState.code,
      description: editAccountState.description,
      isActive: editAccountState.isActive
    });
    if (res.success) {
      setEditAccountState(null);
      loadData();
    } else {
      alert("Error: " + res.error);
    }
    setAdding(false);
  };

  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setAdding(true);
    const res = await createNewAccountGroup({
      organizationId: selected.organizationId,
      ...newGroup
    });
    if (res.success) {
      setShowAddGroupModal(false);
      setNewGroup({ name: "", code: "", accountTypeId: "" });
      loadData();
    } else {
      alert("Error: " + res.error);
    }
    setAdding(false);
  };

  const handleEditGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !editGroupState) return;
    setAdding(true);
    const res = await editAccountGroup({
      id: editGroupState.id,
      organizationId: selected.organizationId,
      name: editGroupState.name,
      code: editGroupState.code
    });
    if (res.success) {
      setEditGroupState(null);
      loadData();
    } else {
      alert("Error: " + res.error);
    }
    setAdding(false);
  };

  if (!selected) {
    return <div className="kalki-main-content" style={{ padding: '32px', textAlign: 'center' }}>Please select an organization context.</div>;
  }

  const tabs = ["All", "ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"];

  return (
    <div className="kalki-main-content">
      {/* HEADER */}
      <div className="kalki-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <p className="kalki-page-description" style={{ margin: 0 }}>Manage your financial taxonomy, account groups, and general ledgers.</p>
        <button className="kalki-button kalki-button--primary" onClick={() => setShowAddAccountModal(true)}>
          <Plus size={16} /> New Account
        </button>
      </div>

      {error && (
        <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {loading || !data ? (
        <div style={{ textAlign: 'center', padding: '64px', color: '#94a3b8' }}>Loading taxonomy...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
          
          {/* SECTION 1: ACCOUNTS */}
          <div>
            <div style={{ display: 'flex', gap: '24px', borderBottom: '1px solid #e2e8f0', marginBottom: '16px' }}>
              {tabs.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '12px 4px',
                    background: 'none',
                    border: 'none',
                    borderBottom: activeTab === tab ? '2px solid var(--kalki-primary)' : '2px solid transparent',
                    color: activeTab === tab ? 'var(--kalki-primary)' : '#64748b',
                    fontWeight: activeTab === tab ? 600 : 500,
                    cursor: 'pointer',
                    fontSize: '14px',
                    transition: 'all 0.2s'
                  }}
                >
                  {tab === "All" ? "All Accounts" : tab}
                </button>
              ))}
            </div>

            <div className="kalki-section" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="kalki-table">
                <thead>
                  <tr>
                    <th>Account Code</th>
                    <th>Account Name</th>
                    <th>Account Group</th>
                    <th style={{ textAlign: 'right' }}>Status</th>
                    <th style={{ textAlign: 'right', width: '80px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.accounts
                    .filter(a => {
                      if (activeTab === "All") return true;
                      const group = data.groups.find(g => g.id === a.accountGroupId);
                      const type = data.types.find(t => t.id === group?.accountTypeId);
                      return type?.category === activeTab;
                    })
                    .map(account => {
                      const group = data.groups.find(g => g.id === account.accountGroupId);
                      const type = data.types.find(t => t.id === group?.accountTypeId);
                      
                      return (
                        <tr key={account.id}>
                          <td style={{ fontFamily: 'monospace', fontWeight: 500, color: '#475569' }}>
                            {account.code}
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <FileText size={16} style={{ color: '#94a3b8' }} />
                              <span style={{ fontWeight: 600, color: '#0f172a' }}>{account.name}</span>
                              {account.isSystemAccount && (
                                <span title="System Control Account"><Lock size={12} style={{ color: '#d97706' }} /></span>
                              )}
                            </div>
                            {account.description && (
                              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{account.description}</div>
                            )}
                          </td>
                          <td>
                            <div style={{ fontWeight: 500, color: '#0f172a' }}>{group?.name}</div>
                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{type?.category}</div>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {account.isActive ? (
                              <span className="kalki-badge kalki-badge--success">Active</span>
                            ) : (
                              <span className="kalki-badge kalki-badge--neutral">Inactive</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button 
                              onClick={() => setEditAccountState(account)}
                              style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer' }}
                            >
                              <Edit2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                  })}
                  {data.accounts.filter(a => activeTab === "All" || data.types.find(t => t.id === data.groups.find(g => g.id === a.accountGroupId)?.accountTypeId)?.category === activeTab).length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>
                        No accounts found in this category.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 2: ACCOUNT GROUPS */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', margin: 0 }}>
                <Layers size={20} style={{ color: '#6366f1' }} />
                Account Groups
              </h2>
              <button className="kalki-button kalki-button--secondary" style={{ borderColor: '#c7d2fe', color: '#4338ca' }} onClick={() => setShowAddGroupModal(true)}>
                <Plus size={16} /> New Group
              </button>
            </div>
            
            <div className="kalki-section" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="kalki-table">
                <thead>
                  <tr>
                    <th>Group Code</th>
                    <th>Group Name</th>
                    <th>Root Category (Type)</th>
                    <th style={{ textAlign: 'right', width: '80px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.groups.map(group => {
                    const type = data.types.find(t => t.id === group.accountTypeId);
                    return (
                      <tr key={group.id}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 500, color: '#475569' }}>
                          {group.code}
                        </td>
                        <td style={{ fontWeight: 600, color: '#0f172a' }}>
                          {group.name}
                        </td>
                        <td>
                          <span className="kalki-badge" style={{ backgroundColor: '#eef2ff', color: '#4338ca', border: '1px solid #c7d2fe' }}>
                            {type?.name} ({type?.category})
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button 
                            onClick={() => setEditGroupState(group)}
                            style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer' }}
                          >
                            <Edit2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {data.groups.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>
                        No account groups found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
        </div>
      )}

      {/* MODALS */}
      {showAddAccountModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            backgroundColor: '#fff', borderRadius: '12px', width: '480px', maxWidth: '90vw',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden', display: 'flex', flexDirection: 'column'
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', margin: 0 }}>Create New Account</h2>
              <button onClick={() => setShowAddAccountModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', color: '#64748b', cursor: 'pointer' }}>&times;</button>
            </div>
            <form onSubmit={handleAddAccount} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Parent Account Group <span style={{ color: '#ef4444' }}>*</span></label>
                <select 
                  required
                  value={newAccount.accountGroupId}
                  onChange={e => setNewAccount({...newAccount, accountGroupId: e.target.value})}
                  className="kalki-select"
                  style={{ width: '100%' }}
                >
                  <option value="">Select a group...</option>
                  {data?.groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name} ({data.types.find(t=>t.id === g.accountTypeId)?.category})</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Account Name <span style={{ color: '#ef4444' }}>*</span></label>
                <input 
                  required type="text" 
                  value={newAccount.name}
                  onChange={e => setNewAccount({...newAccount, name: e.target.value})}
                  className="kalki-input"
                  style={{ width: '100%' }}
                  placeholder="e.g. Employee Bonuses"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Account Code <span style={{ color: '#ef4444' }}>*</span></label>
                <input 
                  required type="text" 
                  value={newAccount.code}
                  onChange={e => setNewAccount({...newAccount, code: e.target.value})}
                  className="kalki-input"
                  style={{ width: '100%', fontFamily: 'monospace' }}
                  placeholder="e.g. 6150"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Description (Optional)</label>
                <textarea 
                  value={newAccount.description}
                  onChange={e => setNewAccount({...newAccount, description: e.target.value})}
                  className="kalki-input"
                  style={{ width: '100%', resize: 'vertical' }}
                  rows={3}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button type="button" onClick={() => setShowAddAccountModal(false)} className="kalki-button kalki-button--secondary">
                  Cancel
                </button>
                <button type="submit" disabled={adding} className="kalki-button kalki-button--primary">
                  {adding ? "Saving..." : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editAccountState && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            backgroundColor: '#fff', borderRadius: '12px', width: '480px', maxWidth: '90vw',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden', display: 'flex', flexDirection: 'column'
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', margin: 0 }}>Edit Account</h2>
              <button onClick={() => setEditAccountState(null)} style={{ background: 'none', border: 'none', fontSize: '20px', color: '#64748b', cursor: 'pointer' }}>&times;</button>
            </div>
            <form onSubmit={handleEditAccount} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Parent Account Group</label>
                <select 
                  required
                  value={editAccountState.accountGroupId}
                  onChange={e => setEditAccountState({...editAccountState, accountGroupId: e.target.value})}
                  className="kalki-select"
                  style={{ width: '100%' }}
                >
                  {data?.groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name} ({data.types.find(t=>t.id === g.accountTypeId)?.category})</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Account Name</label>
                <input 
                  required type="text" 
                  value={editAccountState.name}
                  onChange={e => setEditAccountState({...editAccountState, name: e.target.value})}
                  className="kalki-input"
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Account Code</label>
                <input 
                  required type="text" 
                  value={editAccountState.code}
                  onChange={e => setEditAccountState({...editAccountState, code: e.target.value})}
                  className="kalki-input"
                  style={{ width: '100%', fontFamily: 'monospace' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Description</label>
                <textarea 
                  value={editAccountState.description || ""}
                  onChange={e => setEditAccountState({...editAccountState, description: e.target.value})}
                  className="kalki-input"
                  style={{ width: '100%', resize: 'vertical' }}
                  rows={3}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="checkbox" 
                  id="isActiveToggle"
                  checked={editAccountState.isActive}
                  onChange={e => setEditAccountState({...editAccountState, isActive: e.target.checked})}
                  disabled={editAccountState.isSystemAccount}
                />
                <label htmlFor="isActiveToggle" style={{ fontSize: '13px', color: '#334155' }}>
                  Account is Active
                  {editAccountState.isSystemAccount && <span style={{ color: '#ef4444', marginLeft: '4px' }}>(System account cannot be deactivated)</span>}
                </label>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button type="button" onClick={() => setEditAccountState(null)} className="kalki-button kalki-button--secondary">
                  Cancel
                </button>
                <button type="submit" disabled={adding} className="kalki-button kalki-button--primary">
                  {adding ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddGroupModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            backgroundColor: '#fff', borderRadius: '12px', width: '480px', maxWidth: '90vw',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden', display: 'flex', flexDirection: 'column'
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', margin: 0 }}>Create Account Group</h2>
              <button onClick={() => setShowAddGroupModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', color: '#64748b', cursor: 'pointer' }}>&times;</button>
            </div>
            <form onSubmit={handleAddGroup} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Root Category (Type) <span style={{ color: '#ef4444' }}>*</span></label>
                <select 
                  required
                  value={newGroup.accountTypeId}
                  onChange={e => setNewGroup({...newGroup, accountTypeId: e.target.value})}
                  className="kalki-select"
                  style={{ width: '100%' }}
                >
                  <option value="">Select a base type...</option>
                  {data?.types.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.category})</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Group Name <span style={{ color: '#ef4444' }}>*</span></label>
                <input 
                  required type="text" 
                  value={newGroup.name}
                  onChange={e => setNewGroup({...newGroup, name: e.target.value})}
                  className="kalki-input"
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Group Code <span style={{ color: '#ef4444' }}>*</span></label>
                <input 
                  required type="text" 
                  value={newGroup.code}
                  onChange={e => setNewGroup({...newGroup, code: e.target.value})}
                  className="kalki-input"
                  style={{ width: '100%', fontFamily: 'monospace' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button type="button" onClick={() => setShowAddGroupModal(false)} className="kalki-button kalki-button--secondary">
                  Cancel
                </button>
                <button type="submit" disabled={adding} className="kalki-button kalki-button--primary">
                  {adding ? "Saving..." : "Create Group"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editGroupState && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            backgroundColor: '#fff', borderRadius: '12px', width: '480px', maxWidth: '90vw',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden', display: 'flex', flexDirection: 'column'
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', margin: 0 }}>Edit Account Group</h2>
              <button onClick={() => setEditGroupState(null)} style={{ background: 'none', border: 'none', fontSize: '20px', color: '#64748b', cursor: 'pointer' }}>&times;</button>
            </div>
            <form onSubmit={handleEditGroup} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Group Name</label>
                <input 
                  required type="text" 
                  value={editGroupState.name}
                  onChange={e => setEditGroupState({...editGroupState, name: e.target.value})}
                  className="kalki-input"
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Group Code</label>
                <input 
                  required type="text" 
                  value={editGroupState.code}
                  onChange={e => setEditGroupState({...editGroupState, code: e.target.value})}
                  className="kalki-input"
                  style={{ width: '100%', fontFamily: 'monospace' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button type="button" onClick={() => setEditGroupState(null)} className="kalki-button kalki-button--secondary">
                  Cancel
                </button>
                <button type="submit" disabled={adding} className="kalki-button kalki-button--primary">
                  {adding ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
