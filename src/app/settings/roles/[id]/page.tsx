"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ChevronLeft, Save } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

// Define the available modules and actions based on the schema
const MODULES = ["inventory", "purchase", "sales", "finance", "hr", "settings", "system"] as const;
const ACTIONS = ["read", "create", "update", "delete", "approve"] as const;

type Module = typeof MODULES[number];
type Action = typeof ACTIONS[number];

type Permission = {
  id: string;
  module: Module;
  action: Action;
};

export default function RolePermissionMatrixPage() {
  const params = useParams();
  const roleId = params.id as string;

  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!roleId) return;
    setLoading(true);
    fetch(`/api/settings/roles/${roleId}/permissions`)
      .then((res) => res.json())
      .then((data) => {
        setPermissions(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setPermissions([]);
        setLoading(false);
      });
  }, [roleId]);

  const hasPermission = (module: Module, action: Action) => {
    return permissions.some((p) => p.module === module && p.action === action);
  };

  const togglePermission = async (module: Module, action: Action, enabled: boolean) => {
    // Optimistic UI update
    if (enabled) {
      setPermissions((prev) => [...prev, { id: "temp", module, action }]);
    } else {
      setPermissions((prev) => prev.filter((p) => !(p.module === module && p.action === action)));
    }

    try {
      const res = await fetch(`/api/settings/roles/${roleId}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module, action, enabled }),
      });
      if (!res.ok) {
        throw new Error("Failed to update permission");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving permission. Reverting.");
      // In a real app we'd trigger a refetch here to restore state
      window.location.reload();
    }
  };

  const handleSelectAllModule = (module: Module, e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    ACTIONS.forEach((action) => {
      if (hasPermission(module, action) !== isChecked) {
        togglePermission(module, action, isChecked);
      }
    });
  };

  return (
    <AppShell>
      <div className="flex h-full flex-col">
        <header className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/settings/roles" className="rounded p-1 hover:bg-gray-100 text-gray-500">
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-lg font-medium">Permission Matrix</h1>
              <p className="text-sm text-gray-500">Configure exact access controls for this role.</p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-gray-500">Loading permissions...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 font-medium text-gray-900 w-48 border-r">Module</th>
                      {ACTIONS.map((action) => (
                        <th key={action} className="px-4 py-3 font-medium text-gray-900 text-center capitalize">
                          {action}
                        </th>
                      ))}
                      <th className="px-4 py-3 font-medium text-gray-900 text-center border-l bg-gray-100">
                        Select All
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {MODULES.map((module) => {
                      const moduleAllChecked = ACTIONS.every((a) => hasPermission(module, a));
                      return (
                        <tr key={module} className="hover:bg-gray-50">
                          <td className="px-6 py-4 font-medium capitalize border-r bg-gray-50/50">{module}</td>
                          {ACTIONS.map((action) => (
                            <td key={action} className="px-4 py-4 text-center">
                              <input 
                                type="checkbox"
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                checked={hasPermission(module, action)}
                                onChange={(e) => togglePermission(module, action, e.target.checked)}
                              />
                            </td>
                          ))}
                          <td className="px-4 py-4 text-center border-l bg-gray-100/50">
                             <input 
                                type="checkbox"
                                className="h-4 w-4 rounded border-gray-300 text-gray-600 focus:ring-gray-500"
                                checked={moduleAllChecked}
                                onChange={(e) => handleSelectAllModule(module, e)}
                              />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </AppShell>
  );
}
