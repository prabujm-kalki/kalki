"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

type Role = {
  id: string;
  name: string;
  code: string;
};

export default function UserRoleAssignmentPage() {
  const params = useParams();
  const userId = params.id as string;

  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [assignedRoles, setAssignedRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    
    setLoading(true);
    Promise.all([
      fetch("/api/settings/roles").then(r => r.json()),
      fetch(`/api/settings/users/${userId}/roles`).then(r => r.json())
    ])
    .then(([rolesData, assignedData]) => {
      setAvailableRoles(Array.isArray(rolesData) ? rolesData : []);
      setAssignedRoles(Array.isArray(assignedData) ? assignedData : []);
      setLoading(false);
    })
    .catch((err) => {
      console.error(err);
      setLoading(false);
    });
  }, [userId]);

  const hasRole = (roleId: string) => {
    return assignedRoles.some((r) => r.id === roleId);
  };

  const toggleRole = async (roleId: string, enabled: boolean) => {
    const role = availableRoles.find(r => r.id === roleId);
    if (!role) return;

    // Optimistic UI update
    if (enabled) {
      setAssignedRoles((prev) => [...prev, role]);
    } else {
      setAssignedRoles((prev) => prev.filter((r) => r.id !== roleId));
    }

    try {
      const res = await fetch(`/api/settings/users/${userId}/roles`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId, enabled }),
      });
      if (!res.ok) {
        throw new Error("Failed to update user role");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving role assignment. Reverting.");
      window.location.reload();
    }
  };

  return (
    <AppShell>
      <div className="flex h-full flex-col">
        <header className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/settings/users" className="rounded p-1 hover:bg-gray-100 text-gray-500">
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-lg font-medium">User Role Assignments</h1>
              <p className="text-sm text-gray-500">Select which application roles this user should be granted.</p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <div className="rounded-lg border bg-white shadow-sm overflow-hidden max-w-2xl">
            {loading ? (
              <div className="p-12 text-center text-gray-500">Loading assignments...</div>
            ) : availableRoles.length === 0 ? (
              <div className="p-12 text-center text-gray-500">No application roles exist in the system. Create roles first.</div>
            ) : (
              <ul className="divide-y">
                {availableRoles.map((role) => {
                  const assigned = hasRole(role.id);
                  return (
                    <li key={role.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                      <div>
                        <p className="font-medium text-gray-900">{role.name}</p>
                        <p className="text-sm font-mono text-gray-500">{role.code}</p>
                      </div>
                      <button
                        onClick={() => toggleRole(role.id, !assigned)}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
                          assigned ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            assigned ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </main>
      </div>
    </AppShell>
  );
}
