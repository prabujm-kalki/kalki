"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Plus, X, Shield } from "lucide-react";
import Link from "next/link";

type Role = {
  id: string;
  code: string;
  name: string;
  createdAt: string;
};

export default function RolesPage() {
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
    <AppShell>
      <div className="flex h-full flex-col">
        <header className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h1 className="text-lg font-medium flex items-center gap-2">
              <Shield className="h-5 w-5 text-gray-500" /> 
              Application Roles
            </h1>
            <p className="text-sm text-gray-500">Manage authorization roles and application permissions.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            New Role
          </button>
        </header>

        <main className="flex-1 overflow-auto p-6 relative">
          <div className="rounded-lg border bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-6 py-3 font-medium text-gray-900">Role Name</th>
                  <th className="px-6 py-3 font-medium text-gray-900">Code</th>
                  <th className="px-6 py-3 font-medium text-gray-900">Permissions</th>
                  <th className="px-6 py-3 text-right font-medium text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                      Loading roles...
                    </td>
                  </tr>
                ) : roles.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                      No roles configured. Create one to get started.
                    </td>
                  </tr>
                ) : (
                  roles.map((role) => (
                    <tr key={role.id} className="hover:bg-gray-50 group">
                      <td className="px-6 py-4 font-medium text-gray-900">{role.name}</td>
                      <td className="px-6 py-4 font-mono text-xs text-gray-500">{role.code}</td>
                      <td className="px-6 py-4">
                        <Link 
                          href={`/settings/roles/${role.id}`}
                          className="text-blue-600 hover:underline"
                        >
                          Configure Matrix
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-right">
                         <Link 
                          href={`/settings/roles/${role.id}`}
                          className="text-sm rounded border px-3 py-1 text-gray-600 hover:bg-gray-100"
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Modal overlay */}
          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-medium text-gray-900">Create Application Role</h2>
                  <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Role Name</label>
                    <input 
                      type="text" 
                      required
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        // Auto-generate code if empty or based on name
                        if (!code || code === name.slice(0, -1).toLowerCase().replace(/\s+/g, "_")) {
                          setCode(e.target.value.toLowerCase().replace(/\s+/g, "_"));
                        }
                      }}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" 
                      placeholder="e.g. Kitchen Manager"
                    />
                  </div>
                  
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Role Code</label>
                    <input 
                      type="text" 
                      required
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" 
                      placeholder="e.g. kitchen_manager"
                    />
                    <p className="mt-1 text-xs text-gray-500">A unique technical identifier without spaces.</p>
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                    <button 
                      type="button" 
                      onClick={() => setIsModalOpen(false)}
                      className="rounded-md border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      Create Role
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </AppShell>
  );
}
