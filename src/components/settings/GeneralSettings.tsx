"use client";

import { useState, useEffect } from "react";
import { useSessionView } from "@/components/AppShell";
import { Save, Settings } from "lucide-react";

export function GeneralSettings() {
  const { selected } = useSessionView();
  const [template, setTemplate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    fetch(`/api/organizations/${selected.organizationId}`, { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (data.organization) {
          setTemplate(data.organization.whatsappPoTemplate || "");
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [selected]);

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch(`/api/organizations/${selected.organizationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsappPoTemplate: template })
      });
      if (res.ok) {
        setMessage("Settings saved successfully.");
      } else {
        setMessage("Failed to save settings.");
      }
    } catch (e) {
      setMessage("An error occurred.");
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(""), 3000);
    }
  };

  if (!selected) return <div className="p-8 text-gray-500">Select an organization.</div>;

  return (
    <div className="flex h-full flex-col bg-gray-50">
      <header className="flex items-center justify-between border-b bg-white px-6 py-4 shadow-sm z-10">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2 text-gray-800">
            <Settings className="h-6 w-6 text-indigo-600" /> 
            General Settings
          </h1>
          <p className="text-sm text-gray-500 mt-1">Configure global organization preferences.</p>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-8">
        <div className="max-w-3xl bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">WhatsApp Purchase Order Template</h2>
          <p className="text-sm text-gray-600 mb-4">
            Configure the default message sent to vendors via WhatsApp.
            Available placeholders: <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">{'{poId}'}</code>, <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">{'{amount}'}</code>, <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">{'{items}'}</code>, <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">{'{link}'}</code>
          </p>
          
          {loading ? (
            <div className="py-4 text-gray-500 text-sm">Loading settings...</div>
          ) : (
            <div className="space-y-4">
              <textarea
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                className="w-full h-40 p-3 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                placeholder="Hello, please find Purchase Order #{poId} for {amount}..."
              />
              <div className="flex items-center justify-between">
                <span className={`text-sm ${message.includes('success') ? 'text-green-600' : 'text-red-600'}`}>{message}</span>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded shadow hover:bg-indigo-700 disabled:opacity-50"
                >
                  <Save size={16} />
                  {saving ? "Saving..." : "Save Template"}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
