"use client";

import { useEffect, useState } from "react";
import { Users, Plus, Network } from "lucide-react";
import { useSessionView } from "@/components/AppShell";
import { apiGet, apiSend } from "@/lib/api";
import { StatusMessage } from "@/components/StatusMessage";
import { DepartmentForm } from "@/components/settings/DepartmentForm";
import { RoleDefinitionForm } from "@/components/people/RoleDefinitionForm";
import "./org-chart.css";

type Department = {
  id: string;
  name: string;
  code: string;
};

type Position = {
  id: string;
  identifier: string;
  name: string;
  departmentId: string | null;
  reportsToRoleId: string | null;
};

type OrgNode = {
  position: Position;
  children: OrgNode[];
};

export function OrganizationDashboard() {
  const { selected } = useSessionView();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [assignments, setAssignments] = useState<{ roleId: string; displayName: string }[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showAddDept, setShowAddDept] = useState(false);
  const [showAddPos, setShowAddPos] = useState(false);
  const [editingRole, setEditingRole] = useState<any | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    setLoading(true);

    Promise.all([
      apiGet<{ departments: Department[] }>(`/api/departments?organizationId=${selected.organizationId}`),
      apiGet<{ roles: Position[] }>(`/api/role-definitions?organizationId=${selected.organizationId}&locationId=${selected.locationId}`),
      apiGet<{ assignments: { roleId: string; displayName: string }[] }>(`/api/role-definitions/assignments?organizationId=${selected.organizationId}`)
    ])
    .then(([deptRes, roleRes, assignRes]) => {
      if (cancelled) return;
      setDepartments(deptRes.departments || []);
      setPositions(roleRes.roles || []);
      setAssignments(assignRes.assignments || []);
      setLoading(false);
    })
    .catch((err) => {
      if (!cancelled) {
        console.error(err);
        setLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [selected, refreshKey]);

  if (!selected) return <StatusMessage tone="empty">Select an organization to view</StatusMessage>;

  const buildTree = (allPos: Position[]): OrgNode[] => {
    const nodeMap = new Map<string, OrgNode>();
    const roots: OrgNode[] = [];

    allPos.forEach(p => { nodeMap.set(p.id, { position: p, children: [] }); });

    allPos.forEach(p => {
      const node = nodeMap.get(p.id)!;
      if (p.reportsToRoleId && nodeMap.has(p.reportsToRoleId)) {
        nodeMap.get(p.reportsToRoleId)!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    // Enforce "Owner" at top
    const ownerIndex = roots.findIndex(r => r.position.name.toLowerCase() === 'owner');
    if (ownerIndex !== -1 && roots.length > 1) {
      const ownerNode = roots[ownerIndex];
      roots.forEach((r, idx) => {
        if (idx !== ownerIndex) ownerNode.children.push(r);
      });
      return [ownerNode];
    }

    return roots;
  };

  const tree = buildTree(positions);

  const getAssignedNames = (roleId: string) => {
    const assigned = assignments.filter(a => a.roleId === roleId);
    if (assigned.length === 0) return "UNASSIGNED";
    return assigned.map(a => a.displayName).join(", ");
  };

  const OrgNodeComponent = ({ node }: { node: OrgNode }) => {
    return (
      <li>
        <div 
          className="org-card" 
          onClick={() => { setEditingRole(node.position); setShowAddDept(false); setShowAddPos(false); }}
          style={{ cursor: "pointer" }}
          title="Click to edit position"
        >
          <div className="org-card-title">{node.position.name}</div>
          <div className="org-card-dept">{getAssignedNames(node.position.id)}</div>
        </div>
        {node.children.length > 0 && (
          <ul>
            {node.children.map(child => (
              <OrgNodeComponent key={child.position.id} node={child} />
            ))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <div className="flex h-full flex-col bg-gray-50 relative">
      <main className="flex-1 overflow-auto p-8 pt-8 relative">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem', width: '100%' }}>
          <button 
            onClick={() => setShowAddPos(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--kalki-primary, #1e3a8a)', color: 'white', padding: '8px 16px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: 500 }}
          >
            <Plus size={16} />
            Add Position
          </button>
        </div>
        {showAddDept && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
              <DepartmentForm 
                organizationId={selected.organizationId}
                onCancel={() => { setShowAddDept(false); setEditingRole(null); }}
                onSuccess={() => { setShowAddDept(false); setEditingRole(null); setRefreshKey(k => k + 1); }}
              />
            </div>
          </div>
        )}

        {(showAddPos || editingRole) && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl">
              <RoleDefinitionForm
                organizationId={selected.organizationId}
                locationId={selected.locationId}
                initialData={editingRole || undefined}
                departments={departments}
                roles={positions}
                onCancel={() => { setShowAddPos(false); setEditingRole(null); }}
                onSuccess={() => { setShowAddPos(false); setEditingRole(null); setRefreshKey(k => k + 1); }}
              />
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex h-64 items-center justify-center text-gray-500">Building organizational chart...</div>
        ) : tree.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 rounded-xl border-2 border-dashed border-gray-300 bg-white">
            <Users className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500">No organizational positions found.</p>
            <p className="text-sm text-gray-400 mt-1">Create Business Roles (Positions) to see them in the Org Chart.</p>
          </div>
        ) : (
          <div className="org-tree-container">
            <div className="tree">
              <ul>
                {tree.map(rootNode => (
                  <OrgNodeComponent key={rootNode.position.id} node={rootNode} />
                ))}
              </ul>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
