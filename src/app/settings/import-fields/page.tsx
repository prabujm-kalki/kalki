"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { ImportFieldDefinition } from "@/domains/settings/import-fields.service";

export default function ImportFieldsSettingsPage() {
  const [fields, setFields] = useState<ImportFieldDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Hardcoded for demo/pilot as per current app structure
  const organizationId = "00000000-0000-0000-0000-000000000000"; // We'll get this dynamically if possible, or just pass it in.
  // Wait, we can get the organizationId from context or the API can derive it from the user's active org.
  // For now, let's fetch without organizationId and let the backend handle it or we fetch it from the user's session.
  
  useEffect(() => {
    fetchFields();
  }, []);

  const fetchFields = async () => {
    try {
      // For this pilot, we assume the backend returns fields for the user's first org if orgId is missing
      const response = await fetch("/api/settings/import-fields");
      if (!response.ok) {
        throw new Error("Failed to fetch import fields");
      }
      const data = await response.json();
      setFields(data.fields || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleMandatory = async (field: ImportFieldDefinition) => {
    try {
      const response = await fetch("/api/settings/import-fields", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: field.id, organizationId: field.organizationId, isMandatory: !field.isMandatory }),
      });
      if (!response.ok) throw new Error("Failed to update field");
      fetchFields();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const toggleActive = async (field: ImportFieldDefinition) => {
    try {
      const response = await fetch("/api/settings/import-fields", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: field.id, organizationId: field.organizationId, isActive: !field.isActive }),
      });
      if (!response.ok) throw new Error("Failed to update field");
      fetchFields();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Import Fields</h1>
            <p className="text-sm text-gray-500">Configure the fields that appear during the Excel import mapping process.</p>
          </div>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
            + Add New Field
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow border border-gray-200">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading configurations...</div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 font-semibold text-gray-900">Order</th>
                  <th className="px-6 py-4 font-semibold text-gray-900">Display Name</th>
                  <th className="px-6 py-4 font-semibold text-gray-900">Internal Key</th>
                  <th className="px-6 py-4 font-semibold text-gray-900">Required?</th>
                  <th className="px-6 py-4 font-semibold text-gray-900">Active?</th>
                  <th className="px-6 py-4 font-semibold text-gray-900">Aliases</th>
                  <th className="px-6 py-4 font-semibold text-gray-900 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {fields.map((field, idx) => (
                  <tr key={field.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-gray-500 font-medium">{field.displayOrder}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{field.displayName}</td>
                    <td className="px-6 py-4">
                      <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-mono">
                        {field.internalKey}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => toggleMandatory(field)}
                        className={`px-3 py-1 rounded-full text-xs font-medium ${field.isMandatory ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}
                      >
                        {field.isMandatory ? "Mandatory" : "Optional"}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => toggleActive(field)}
                        className={`px-3 py-1 rounded-full text-xs font-medium ${field.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}
                      >
                        {field.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-xs">
                      {field.aliases?.join(", ")}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-blue-600 hover:text-blue-800 text-sm font-medium mr-3">Edit</button>
                    </td>
                  </tr>
                ))}
                {fields.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      No import fields configured.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    
  );
}
