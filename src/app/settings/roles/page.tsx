"use client";

import { useEffect, useState } from "react";
import { AppShell, useSessionView } from "@/components/AppShell";
import { Plus, X, Shield, Settings, Edit } from "lucide-react";
import Link from "next/link";
import './roles.css';

type Role = {
  id: string;
  code: string;
  name: string;
  locationId: string | null;
  createdAt: string;
};

function RolesPageContent() {
  const { selected } = useSessionView();
  const locationParams = selected ? `?organizationId=${selected.organizationId}&locationId=${selected.locationId}` : '';
  
  const [globalRoles, setGlobalRoles] = useState<Role[]>([]);
  const [localRoles, setLocalRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  const loadRoles = () => {
    setLoading(true);
    fetch(`/api/settings/roles${locationParams}`)
      .then((res) => res.json())
      .then((data: Role[]) => {
        // Split dynamically based on locationId
        const globals = data.filter(r => !r.locationId);
        const locals = data.filter(r => !!r.locationId);
        
        setGlobalRoles(globals);
        setLocalRoles(locals);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setGlobalRoles([]);
        setLocalRoles([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (selected) {
      loadRoles();
    }
  }, [locationParams, selected]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/settings/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name, 
          code, 
          organizationId: selected?.organizationId,
          locationId: selected?.locationId 
        }),
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

  const renderTable = (rolesList: Role[], isGlobal: boolean) => (
    <div className="kalki-roles-table-container">
      <table className="kalki-roles-table">
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
              <td colSpan={3} style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
                Loading roles...
              </td>
            </tr>
          ) : rolesList.length === 0 ? (
            <tr>
              <td colSpan={3} style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
                No roles configured in this scope.
              </td>
            </tr>
          ) : (
            rolesList.map((role) => (
              <tr key={role.id}>
                <td>
                  <span className="kalki-role-name">{role.name}</span>
                  {isGlobal && (
                    <span className="kalki-role-badge-global">Global</span>
                  )}
                </td>
                <td>
                  <span className="kalki-role-code-pill">
                    {role.code}
                  </span>
                </td>
                <td>
                  <Link 
                    href={`/settings/roles/${role.id}${locationParams}`}
                    className="kalki-btn-ghost"
                  >
                    <Settings size={16} />
                    Configure Matrix
                  </Link>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

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
                <p className="kalki-page-description">Manage authorization matrices and access boundaries.</p>
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

        <div className="kalki-roles-section">
          <h2 className="kalki-roles-heading">Global Roles (Cross-Location)</h2>
          {renderTable(globalRoles, true)}

          <h2 className="kalki-roles-heading">Local Roles ({selected?.locationName || "Selected Branch"})</h2>
          {renderTable(localRoles, false)}
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
    
      <RolesPageContent />
    
  );
}
