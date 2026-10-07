"use client";

import React, { useState, useEffect } from "react";
import { Settings, Save, AlertCircle } from "lucide-react";
import { useSessionView } from "@/components/AppShell";
import { fetchChartOfAccounts, fetchAccountingMappings, saveAccountingMapping } from "@/app/finance/actions";

export function AccountsSettingsClient() {
  const { selected } = useSessionView();
  const [loading, setLoading] = useState(false);
  const [accountsData, setAccountsData] = useState<{ types: any[], groups: any[], accounts: any[] } | null>(null);
  const [mappings, setMappings] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // For simplicity, we define standard operational categories we want to map
  const SYSTEM_MAPPINGS = [
    { sourceModule: "SYSTEM", mappingType: "SYSTEM_DEFAULT", sourceReferenceId: "INTER_BRANCH_RECEIVABLE", label: "Inter-Branch Receivable" },
    { sourceModule: "SYSTEM", mappingType: "SYSTEM_DEFAULT", sourceReferenceId: "INTER_BRANCH_PAYABLE", label: "Inter-Branch Payable" },
    { sourceModule: "PURCHASE", mappingType: "SYSTEM_DEFAULT", sourceReferenceId: "GRNI_SUSPENSE", label: "GRNI Suspense" },
    { sourceModule: "PURCHASE", mappingType: "SYSTEM_DEFAULT", sourceReferenceId: "VENDOR_PAYABLE", label: "Accounts Payable (Vendors)" },
    { sourceModule: "PURCHASE", mappingType: "SYSTEM_DEFAULT", sourceReferenceId: "BANK_CASH", label: "Default Bank/Cash (Purchases)" }
  ];

  const loadData = () => {
    if (!selected) return;
    setLoading(true);
    setError(null);
    Promise.all([
      fetchChartOfAccounts(selected.organizationId),
      fetchAccountingMappings(selected.organizationId)
    ]).then(([accRes, mapRes]) => {
      if (accRes.success && mapRes.success) {
        setAccountsData(accRes.data as any);
        setMappings(mapRes.data as any[]);
      } else {
        setError("Failed to load settings data");
      }
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, [selected]);

  const handleMappingChange = async (def: any, accountId: string) => {
    if (!selected) return;
    const res = await saveAccountingMapping({
      organizationId: selected.organizationId,
      sourceModule: def.sourceModule,
      mappingType: def.mappingType,
      sourceReferenceId: def.sourceReferenceId,
      accountId
    });
    if (res.success) {
      loadData();
    } else {
      alert("Error saving mapping: " + res.error);
    }
  };

  if (!selected) {
    return <div className="kalki-main-content p-8 text-center">Please select an organization context.</div>;
  }

  if (error) {
    return <div className="kalki-main-content p-8 text-center text-red-500">{error}</div>;
  }

  return (
    <div className="kalki-main-content">
      <div className="kalki-page-header flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings size={24} className="text-blue-600" />
            Accounts Settings
          </h1>
          <p className="text-gray-500 text-sm">Configure the Accounting Engine mappings and rules.</p>
        </div>
      </div>

      <div className="kalki-section overflow-hidden rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold mb-4">System Account Mappings</h2>
        <p className="text-sm text-gray-500 mb-6">These mappings route automated operational transactions (like purchase approvals and vendor payments) into the correct double-entry ledger accounts.</p>
        
        {loading || !accountsData ? (
          <div className="text-center p-4 text-gray-400">Loading...</div>
        ) : (
          <div className="space-y-6">
            {SYSTEM_MAPPINGS.map((def, idx) => {
              const currentMapping = mappings.find(m => 
                m.sourceModule === def.sourceModule && 
                m.mappingType === def.mappingType && 
                m.sourceReferenceId === def.sourceReferenceId
              );

              return (
                <div key={idx} className="flex items-center justify-between border-b pb-4 border-gray-100 last:border-0">
                  <div className="w-1/3">
                    <div className="font-medium text-gray-900">{def.label}</div>
                    <div className="text-xs text-gray-500 font-mono mt-1">[{def.sourceModule}] {def.sourceReferenceId}</div>
                  </div>
                  <div className="w-1/2">
                    <select
                      className="w-full border-gray-300 rounded-md shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500"
                      value={currentMapping?.accountId || ""}
                      onChange={(e) => handleMappingChange(def, e.target.value)}
                    >
                      <option value="">-- Select Account --</option>
                      {accountsData.accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-1/12 text-right">
                    {!currentMapping ? (
                      <AlertCircle size={16} className="text-yellow-500 ml-auto" title="Unmapped" />
                    ) : (
                      <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded-full">Mapped</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
