"use client";

import { useEffect, useState } from "react";
import { AppShell, useSessionView } from "@/components/AppShell";
import { Plus, X, Shield, Settings, Edit } from "lucide-react";
import Link from "next/link";

type Role = {
  id: string;
  code: string;
  name: string;
  createdAt: string;
};

function RolesPageContent() {
  const { selected } = useSessionView();
  const locationParams = selected ? `?organizationId=${selected.organizationId}&locationId=${selected.locationId}` : '';
  
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  const loadRoles = () => {
    setLoading(true);
    fetch("/api/settings/roles")
      .then((res) => res.json())
      .then((data) => {
        setRoles(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setRoles([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadRoles();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/settings/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, code }),
      });
      if (res.ok) {
        setIsModalOpen(false);
        setName("");
        setCode("");
        loadRoles();
      } else {
        alert("Failed to create role");
      }
    } catch (err) {
      console.error(err);
      alert("Error creating role");
    }
  };

  return (
    <div className="kalki-main-wrapper">
      <div className="kalki-main-content">
        
        {/* Main Header Area */}
        <div className="kalki-page-header">
          <Link href={`/settings${locationParams}`} className="kalki-breadcrumbs">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }}><path d="m15 18-6-6 6-6"/></svg>
            Back to Settings
          </Link>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ backgroundColor: 'var(--kalki-primary)', padding: '12px', borderRadius: 'var(--radius-lg)', color: 'white' }}>
                <Shield size={28} strokeWidth={1.5} />
              </div>
              <div>
                <h1 className="kalki-page-title">Application Roles</h1>
                <p className="kalki-page-description">Manage authorization roles and application permissions.</p>
              </div>
            </div>

            <button 
              onClick={() => setIsModalOpen(true)}
              className="kalki-button kalki-button--primary"
            >
              <Plus size={16} style={{ marginRight: '8px' }} />
              New Role
            </button>
          </div>
        </div>

        <div className="kalki-section" style={{ padding: '0', overflow: 'hidden' }}>
          <div className="kalki-table-container">
            <table className="kalki-table">
              <thead>
                <tr>
                  <th style={{ width: '33%' }}>Role Name</th>
                  <th style={{ width: '33%' }}>Code</th>
                  <th style={{ width: '33%' }}>Permissions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={3} style={{ padding: '48px', textAlign: 'center', color: 'var(--kalki-text-secondary)' }}>
                      Loading roles...
                    </td>
                  </tr>
                ) : roles.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ padding: '48px', textAlign: 'center', color: 'var(--kalki-text-secondary)' }}>
                      No roles configured. Create one to get started.
                    </td>
                  </tr>
                ) : (
                  roles.map((role) => (
                    <tr key={role.id}>
                      <td style={{ fontWeight: 500, color: 'var(--kalki-text-primary)' }}>{role.name}</td>
                      <td>
                        <div style={{ display: 'inline-block', padding: '4px 8px', backgroundColor: '#f1f5f9', borderRadius: '4px', fontFamily: 'monospace', fontSize: '12px', color: 'var(--kalki-text-secondary)' }}>
                          {role.code}
                        </div>
                      </td>
                      <td>
                        <Link 
                          href={`/settings/roles/${role.id}${locationParams}`}
                          className="kalki-button kalki-button--secondary"
                        >
                          <Settings size={14} style={{ marginRight: '8px' }} />
                          Configure Matrix
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal overlay */}
        {isModalOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="kalki-section" style={{ width: '100%', maxWidth: '400px' }}>
              <div className="kalki-section-header">
                <h2 className="kalki-section-title">Create Application Role</h2>
                <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--kalki-text-secondary)' }}>
                  <X size={20} />
                </button>
              </div>
              
              <div className="kalki-section-content">
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="kalki-field">
                    <label className="kalki-label">Role Name <span className="kalki-required">*</span></label>
                    <input 
                      type="text" 
                      required
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (!code || code === name.slice(0, -1).toLowerCase().replace(/\s+/g, "_")) {
                          setCode(e.target.value.toLowerCase().replace(/\s+/g, "_"));
                        }
                      }}
                      className="kalki-input"
                      placeholder="e.g. Kitchen Manager"
                    />
                  </div>
                  
                  <div className="kalki-field">
                    <label className="kalki-label">Role Code <span className="kalki-required">*</span></label>
                    <input 
                      type="text" 
                      required
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="kalki-input"
                      style={{ fontFamily: 'monospace' }}
                      placeholder="e.g. kitchen_manager"
                    />
                    <div style={{ fontSize: '12px', color: 'var(--kalki-text-secondary)' }}>A unique technical identifier without spaces.</div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                    <button 
                      type="button" 
                      onClick={() => setIsModalOpen(false)}
                      className="kalki-button kalki-button--secondary"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="kalki-button kalki-button--primary"
                    >
                      Create Role
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RolesPage() {
  return (
    <AppShell>
      <RolesPageContent />
    </AppShell>
  );
}
