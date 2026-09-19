import React from "react";
import { AppShell } from "@/components/AppShell";
import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export default async function CommandCenterPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  return (
    <AppShell>
      <div className="kalki-page">
        <h1 className="text-3xl font-bold mb-4">Command Center</h1>
        <div className="kalki-dashboard-grid">
          <Link href="/people" className="kalki-card p-6 border rounded-md hover:bg-gray-50 flex items-center justify-between transition-colors">
            <h2 className="text-xl font-semibold m-0">People</h2>
            <span className="text-gray-400">→</span>
          </Link>
          <Link href="/attendance" className="kalki-card p-6 border rounded-md hover:bg-gray-50 flex items-center justify-between transition-colors">
            <h2 className="text-xl font-semibold m-0">Attendance</h2>
            <span className="text-gray-400">→</span>
          </Link>
          <Link href="/payroll" className="kalki-card p-6 border rounded-md hover:bg-gray-50 flex items-center justify-between transition-colors">
            <h2 className="text-xl font-semibold m-0">Payroll</h2>
            <span className="text-gray-400">→</span>
          </Link>
          <Link href="/crm" className="kalki-card p-6 border rounded-md hover:bg-gray-50 flex items-center justify-between transition-colors">
            <h2 className="text-xl font-semibold m-0">CRM</h2>
            <span className="text-gray-400">→</span>
          </Link>
          <Link href="/settings" className="kalki-card p-6 border rounded-md hover:bg-gray-50 flex items-center justify-between transition-colors">
            <h2 className="text-xl font-semibold m-0">Settings</h2>
            <span className="text-gray-400">→</span>
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
