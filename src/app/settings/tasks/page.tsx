"use client";

import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";

// In a real app we'd get AppShell from the layout, but for standalone test we'll use a wrapper if it fails
// Assuming AppShell is globally available or properly imported.
import { AppShell } from "@/components/AppShell";

type TaskDefinition = {
  id: string;
  title: string;
  module: string;
  triggerType: string;
  actionType: string;
};

export default function TaskConfigurationPage() {
  const [tasks, setTasks] = useState<TaskDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [module, setModule] = useState("inventory");
  const [triggerType, setTriggerType] = useState("event");
  const [actionType, setActionType] = useState("task");

  const loadTasks = () => {
    setLoading(true);
    fetch("/api/settings/tasks")
      .then((res) => res.json())
      .then((data) => {
        setTasks(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setTasks([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/settings/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          module,
          triggerType,
          actionType,
        }),
      });
      if (res.ok) {
        setIsModalOpen(false);
        setTitle("");
        loadTasks();
      } else {
        alert("Failed to create task");
      }
    } catch (err) {
      console.error(err);
      alert("Error creating task");
    }
  };

  return (
    <AppShell>
      <div className="flex h-full flex-col">
        <header className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h1 className="text-lg font-medium">Task & Reminder Engine</h1>
            <p className="text-sm text-gray-500">Configure event-driven tasks and time-based reminders.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            New Task Rule
          </button>
        </header>

        <main className="flex-1 overflow-auto p-6 relative">
          <div className="rounded-lg border bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-6 py-3 font-medium text-gray-900">Title</th>
                  <th className="px-6 py-3 font-medium text-gray-900">Module</th>
                  <th className="px-6 py-3 font-medium text-gray-900">Trigger</th>
                  <th className="px-6 py-3 font-medium text-gray-900">Action</th>
                  <th className="px-6 py-3 font-medium text-gray-900">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      Loading configurations...
                    </td>
                  </tr>
                ) : tasks.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      No task rules configured. Create one to automate operations.
                    </td>
                  </tr>
                ) : (
                  tasks.map((task) => (
                    <tr key={task.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium">{task.title}</td>
                      <td className="px-6 py-4 capitalize">{task.module}</td>
                      <td className="px-6 py-4 capitalize">{task.triggerType}</td>
                      <td className="px-6 py-4 capitalize">{task.actionType}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                          Active
                        </span>
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
                  <h2 className="text-lg font-medium text-gray-900">Create Task Rule</h2>
                  <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Title</label>
                    <input 
                      type="text" 
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" 
                      placeholder="e.g. Low Stock Alert"
                    />
                  </div>
                  
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Target Module</label>
                    <select 
                      value={module}
                      onChange={(e) => setModule(e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="inventory">Inventory</option>
                      <option value="purchase">Purchase</option>
                      <option value="sales">Sales</option>
                      <option value="finance">Finance</option>
                      <option value="hr">HR</option>
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Trigger Type</label>
                      <select 
                        value={triggerType}
                        onChange={(e) => setTriggerType(e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="event">Event-Based</option>
                        <option value="time">Time-Based</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Action Type</label>
                      <select 
                        value={actionType}
                        onChange={(e) => setActionType(e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="task">Actionable Task</option>
                        <option value="reminder">Reminder</option>
                      </select>
                    </div>
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
                      Save Rule
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
