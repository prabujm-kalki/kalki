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
  const [loading, setLoading] = useState(true);
  
  const [showAddDept, setShowAddDept] = useState(false);
  const [showAddPos, setShowAddPos] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    setLoading(true);

    Promise.all([
      apiGet<{ departments: Department[] }>(`/api/departments?organizationId=${selected.organizationId}`),
      apiGet<{ roles: Position[] }>(`/api/role-definitions?organizationId=${selected.organizationId}&locationId=${selected.locationId}`)
    ])
    .then(([deptRes, roleRes]) => {
      if (cancelled) return;
      setDepartments(deptRes.departments || []);
      setPositions(roleRes.roles || []);
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

    return roots;
  };

  const tree = buildTree(positions);

  const getDeptName = (deptId: string | null) => {
    if (!deptId) return "Unassigned";
    const d = departments.find(d => d.id === deptId);
    return d ? d.name : "Unknown";
  };

  const OrgNodeComponent = ({ node }: { node: OrgNode }) => {
    return (
      <li>
        <div className="org-card">
          <div className="org-card-title">{node.position.name}</div>
          <div className="org-card-dept">{getDeptName(node.position.departmentId)}</div>
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
      <header className="flex items-center justify-between border-b bg-white px-6 py-4 shadow-sm z-10">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2 text-gray-800">
            <Network className="h-6 w-6 text-indigo-600" /> 
            Organizational Structure
          </h1>
          <p className="text-sm text-gray-500 mt-1">Visualize and manage your Departments and Reporting Hierarchy.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => { setShowAddPos(false); setShowAddDept(true); }}
            className="flex items-center gap-2 rounded-md bg-white border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
          >
            <Plus className="h-4 w-4" /> Department
          </button>
          <button 
            onClick={() => { setShowAddDept(false); setShowAddPos(true); }}
            className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-4 w-4" /> Position
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-8 relative">
        {showAddDept && (
          <div className="mb-8 max-w-xl mx-auto">
            <DepartmentForm 
              organizationId={selected.organizationId}
              onCancel={() => setShowAddDept(false)}
              onSuccess={() => { setShowAddDept(false); setRefreshKey(k => k + 1); }}
            />
          </div>
        )}

        {showAddPos && (
          <div className="mb-8 max-w-2xl mx-auto">
            <RoleDefinitionForm
              organizationId={selected.organizationId}
              locationId={selected.locationId}
              departments={departments}
              roles={positions}
              onCancel={() => setShowAddPos(false)}
              onSuccess={() => { setShowAddPos(false); setRefreshKey(k => k + 1); }}
            />
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
