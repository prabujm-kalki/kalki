"use client";

import { useEffect, useState } from "react";
import { AppShell, useSessionView } from "@/components/AppShell";
import { ChevronLeft, Shield, Calendar, BarChart2, Users, UserCircle, DollarSign, Package, FileSpreadsheet, ShoppingCart, Tag, Settings, PlusSquare, FileText, Edit, Trash2, CheckSquare } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { apiGet } from "@/lib/api";

type Permission = {
  id: string;
  code: string;
  name: string;
};

type GroupedPermissions = {
  [module: string]: {
    [submodule: string]: Permission[];
  };
};

function RolePermissionMatrixContent() {
  const params = useParams();
  const router = useRouter();
  const roleId = params.id as string;
  const { session, selected } = useSessionView();

  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [groupedPermissions, setGroupedPermissions] = useState<GroupedPermissions>({});
  const [initialRolePermissions, setInitialRolePermissions] = useState<Set<string>>(new Set());
  const [rolePermissions, setRolePermissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [roleName, setRoleName] = useState<string>("Role Details");

  useEffect(() => {
    if (!roleId) return;
    loadData();
  }, [roleId]);

  async function loadData() {
    setLoading(true);
    try {
      // Fetch role details from the roles list
      try {
        const rolesData = await apiGet<any[]>("/api/settings/roles");
        const role = rolesData.find(r => r.id === roleId);
        if (role && role.name) setRoleName(role.name);
      } catch(e) {
        // Ignore if endpoint fails
      }

      // Fetch all system permissions
      const permsData = await apiGet<Permission[]>("/api/settings/permissions");
      setAllPermissions(permsData);

      // Group permissions by module and submodule
      const grouped: GroupedPermissions = {};
      permsData.forEach(p => {
        let module = "General";
        let submodule = "General";
        
        if (p.code.includes(":")) {
          const [domain, action] = p.code.split(":");
          if (domain.includes(".")) {
            const [m, sm] = domain.split(".");
            module = m;
            submodule = sm;
          } else {
            module = domain;
            submodule = "General";
          }
        }
        
        if (!grouped[module]) grouped[module] = {};
        if (!grouped[module][submodule]) grouped[module][submodule] = [];
        
        grouped[module][submodule].push(p);
      });
      setGroupedPermissions(grouped);

      // Fetch assigned permissions for this role
      const assignedData = await apiGet<Permission[]>(`/api/settings/roles/${roleId}/permissions`);
      const assignedIds = new Set(assignedData.map(p => p.id));
      setInitialRolePermissions(assignedIds);
      setRolePermissions(new Set(assignedIds));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const locationParams = selected ? `?organizationId=${selected.organizationId}&locationId=${selected.locationId}` : '';

  const togglePermission = (permId: string, enabled: boolean) => {
    const newSet = new Set(rolePermissions);
    if (enabled) {
      newSet.add(permId);
    } else {
      newSet.delete(permId);
    }
    setRolePermissions(newSet);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/settings/roles/${roleId}/permissions`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          permissions: Array.from(rolePermissions),
        }),
      });
      if (!res.ok) {
        throw new Error("Failed to update permissions");
      }
      setInitialRolePermissions(new Set(rolePermissions));
      alert("Permissions saved successfully!");
      router.push(`/settings/roles${locationParams}`);
    } catch (err) {
      console.error(err);
      alert("Error saving permissions.");
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = rolePermissions.size !== initialRolePermissions.size || 
    Array.from(rolePermissions).some(id => !initialRolePermissions.has(id));

  // Dynamically find all unique actions to create table columns
  const standardActions = ["create", "read", "update", "delete", "approve"];
  
  const getActionInfo = (action: string) => {
    switch(action) {
      case "create": return { icon: <PlusSquare size={16} className="text-emerald-500" />, label: "Create", color: "text-emerald-600" };
      case "read": return { icon: <FileText size={16} className="text-blue-500" />, label: "Read", color: "text-blue-600" };
      case "update": return { icon: <Edit size={16} className="text-amber-500" />, label: "Update", color: "text-amber-600" };
      case "delete": return { icon: <Trash2 size={16} className="text-red-500" />, label: "Delete", color: "text-red-600" };
      case "approve": return { icon: <CheckSquare size={16} className="text-purple-500" />, label: "Approve", color: "text-purple-600" };
      default: return { icon: null, label: action, color: "text-gray-600" };
    }
  };

  const getModuleIcon = (module: string) => {
    switch(module.toLowerCase()) {
      case "attendance": return <Calendar size={18} className="text-blue-600" />;
      case "command-center": return <BarChart2 size={18} className="text-indigo-600" />;
      case "crm": return <Users size={18} className="text-blue-600" />;
      case "employee": return <UserCircle size={18} className="text-blue-600" />;
      case "finance": return <DollarSign size={18} className="text-emerald-600" />;
      case "inventory": return <Package size={18} className="text-emerald-600" />;
      case "payroll": return <FileSpreadsheet size={18} className="text-amber-600" />;
      case "purchasing": return <ShoppingCart size={18} className="text-purple-600" />;
      case "sales": return <Tag size={18} className="text-blue-600" />;
      case "settings": return <Settings size={18} className="text-gray-600" />;
      default: return <div style={{ height: '8px', width: '8px', borderRadius: '50%', backgroundColor: '#94a3b8' }} />;
    }
  };

  return (
    <div className="kalki-main-wrapper">
      <div className="kalki-main-content">
        
        {/* Main Header Area */}
        <div className="kalki-page-header">
          <Link href={`/settings/roles${locationParams}`} className="kalki-breadcrumbs">
            <ChevronLeft size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
            Back to Roles
          </Link>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ backgroundColor: 'var(--kalki-primary)', padding: '12px', borderRadius: 'var(--radius-lg)', color: 'white' }}>
                <Shield size={28} strokeWidth={1.5} />
              </div>
              <div>
                <h1 className="kalki-page-title">Permission Matrix</h1>
                <p className="kalki-page-description">Configure exact access controls for this role. Enable only the permissions required.</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <div className="kalki-section" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', minWidth: '200px' }}>
                <div style={{ backgroundColor: '#eff6ff', padding: '8px', borderRadius: '4px', color: 'var(--kalki-primary)' }}>
                  <Users size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--kalki-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Role</div>
                  <div style={{ fontWeight: 500, color: 'var(--kalki-text-primary)' }}>{roleName}</div>
                </div>
              </div>
              
              {selected && (
                <div className="kalki-section" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', minWidth: '200px' }}>
                  <div style={{ backgroundColor: '#f1f5f9', padding: '8px', borderRadius: '4px', color: '#64748b' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--kalki-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Organization</div>
                    <div style={{ fontWeight: 500, color: 'var(--kalki-text-primary)', lineHeight: 1.2 }}>{selected.organizationName}</div>
                    <div style={{ fontSize: '12px', color: 'var(--kalki-text-secondary)' }}>{selected.locationName}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="kalki-section" style={{ padding: '0', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--kalki-text-secondary)' }}>Loading permissions...</div>
          ) : (
            <div className="kalki-table-container">
              {Object.keys(groupedPermissions).length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--kalki-text-secondary)', padding: '32px' }}>
                  No permissions available in the system.
                </div>
              ) : (
                <table className="kalki-table">
                  <thead>
                    <tr>
                      <th style={{ width: '200px' }}>Module</th>
                      <th style={{ width: '200px', borderRight: '1px solid var(--kalki-border)' }}>Submodule</th>
                      {standardActions.map(action => {
                        const info = getActionInfo(action);
                        return (
                          <th key={action} style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                              {info.icon}
                              <span>{info.label}</span>
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(groupedPermissions).map(([module, submodules]) => {
                      const subEntries = Object.entries(submodules);
                      return subEntries.map(([submodule, perms], idx) => {
                        return (
                          <tr key={`${module}-${submodule}`}>
                            {idx === 0 && (
                              <td 
                                style={{ verticalAlign: 'top', borderRight: '1px solid var(--kalki-border)' }}
                                rowSpan={subEntries.length}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontWeight: 500, color: 'var(--kalki-text-primary)', textTransform: 'capitalize' }}>
                                  {getModuleIcon(module)}
                                  {module}
                                </div>
                              </td>
                            )}
                            <td style={{ fontWeight: 500, color: 'var(--kalki-text-secondary)', textTransform: 'capitalize', borderRight: '1px solid var(--kalki-border)', verticalAlign: 'middle' }}>
                              {submodule}
                            </td>
                            {standardActions.map(action => {
                              const perm = perms.find(p => (p.code.split(":")[1] || p.code) === action);
                              if (!perm) {
                                return <td key={action} style={{ textAlign: 'center', color: '#cbd5e1' }}>-</td>;
                              }
                              const isChecked = rolePermissions.has(perm.id);
                              return (
                                <td key={action} style={{ textAlign: 'center' }}>
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => togglePermission(perm.id, e.target.checked)}
                                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                    title={perm.name}
                                  />
                                </td>
                              );
                            })}
                          </tr>
                        );
                      });
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
        
        {/* Sticky Footer */}
        <div className="kalki-action-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', fontSize: '14px', color: 'var(--kalki-text-secondary)', marginRight: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" readOnly checked style={{ pointerEvents: 'none' }} />
              <span>Permission enabled</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" readOnly checked={false} style={{ pointerEvents: 'none' }} />
              <span>Permission disabled</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#cbd5e1', margin: '0 4px' }}>-</span>
              <span>Not applicable</span>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => {
                router.push(`/settings/roles${locationParams}`);
              }}
              disabled={saving}
              className="kalki-button kalki-button--secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="kalki-button kalki-button--primary"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RolePermissionMatrixPage() {
  return (
    <AppShell>
      <RolePermissionMatrixContent />
    </AppShell>
  );
}
