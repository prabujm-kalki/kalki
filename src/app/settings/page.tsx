"use client";

import React, { Suspense } from "react";
import { KalkiPageHeader } from "@/components/ui/KalkiPageHeader";
import { AppShell, useSessionView } from "@/components/AppShell";
import { StatusMessage } from "@/components/StatusMessage";
import Link from "next/link";
import { Shield, Network, Users, BookOpen } from "lucide-react";

function SettingsDashboardContent() {
  const { selected } = useSessionView();
  
  if (!selected) return <StatusMessage tone="empty">Please select a location from the dropdown above.</StatusMessage>;
  
  const query = `?organizationId=${selected.organizationId}&locationId=${selected.locationId}`;

  const cards = [
    {
      title: "Organization Chart",
      description: "Visualize and manage departments and reporting hierarchy.",
      icon: <Network className="h-6 w-6 text-indigo-500" />,
      href: `/settings/organization${query}`,
    },
    {
      title: "Departments",
      description: "Manage organizational departments.",
      icon: <BookOpen className="h-6 w-6 text-blue-500" />,
      href: `/settings/departments${query}`,
    },
    {
      title: "Access & Roles",
      description: "Configure system roles and define granular permission matrices.",
      icon: <Shield className="h-6 w-6 text-green-500" />,
      href: `/settings/roles${query}`,
    },
    {
      title: "Users",
      description: "Manage employees, assignments, and invitations.",
      icon: <Users className="h-6 w-6 text-orange-500" />,
      href: `/settings/users${query}`,
    }
  ];

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <KalkiPageHeader title="System Settings" />
      <div className="flex-1 p-8 overflow-auto">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {cards.map((card, i) => (
              <Link key={i} href={card.href} className="flex flex-col p-6 rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md hover:border-indigo-300 transition-all group">
                <div className="flex items-center gap-4 mb-3">
                  <div className="p-3 bg-gray-50 rounded-lg group-hover:bg-indigo-50 transition-colors">
                    {card.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">{card.title}</h3>
                </div>
                <p className="text-gray-500 text-sm">{card.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<main className="app-main"><StatusMessage tone="loading">Loading...</StatusMessage></main>}>
      <AppShell>
        <SettingsDashboardContent />
      </AppShell>
    </Suspense>
  );
}
