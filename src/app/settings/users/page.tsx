"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Users } from "lucide-react";
import Link from "next/link";

type User = {
  id: string;
  name: string | null;
  email: string | null;
};

export default function UsersSettingsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUsers = () => {
    setLoading(true);
    fetch("/api/settings/users")
      .then((res) => res.json())
      .then((data) => {
        setUsers(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setUsers([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadUsers();
  }, []);

  return (
    
      <div className="flex h-full flex-col">
        <header className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h1 className="text-lg font-medium flex items-center gap-2">
              <Users className="h-5 w-5 text-gray-500" /> 
              User Management
            </h1>
            <p className="text-sm text-gray-500">Manage all users and assign application roles.</p>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6 relative">
          <div className="rounded-lg border bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-6 py-3 font-medium text-gray-900">Name</th>
                  <th className="px-6 py-3 font-medium text-gray-900">Email</th>
                  <th className="px-6 py-3 text-right font-medium text-gray-900">Role Assignment</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                      Loading users...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 group">
                      <td className="px-6 py-4 font-medium text-gray-900">{user.name || "Unknown"}</td>
                      <td className="px-6 py-4 text-gray-500">{user.email || "No email"}</td>
                      <td className="px-6 py-4 text-right">
                         <Link 
                          href={`/settings/users/${user.id}`}
                          className="text-sm rounded border px-3 py-1 text-blue-600 border-blue-600 hover:bg-blue-50"
                        >
                          Manage Roles
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    
  );
}
