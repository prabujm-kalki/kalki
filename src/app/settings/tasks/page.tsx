"use client";

import { useEffect, useState } from "react";
import { Plus, X, Trash2, Pencil } from "lucide-react";

// In a real app we'd get AppShell from the layout, but for standalone test we'll use a wrapper if it fails
// Assuming AppShell is globally available or properly imported.
import { AppShell } from "@/components/AppShell";

type TaskDefinition = {
  id: string;
  title: string;
  module: string;
  triggerType: string;
  actionType: string;
  triggerConfig?: any;
  targetRoleId?: string | null;
  completionTimeMins?: number | null;
  warningThresholdMins?: number | null;
  allowTimeExtension?: boolean;
  maxExtensionMins?: number | null;
  escalationLevels?: any[];
};

export default function TaskConfigurationPage() {
  const [tasks, setTasks] = useState<TaskDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [actionType, setActionType] = useState("task");

  const [roles, setRoles] = useState<any[]>([]);
  const [targetRoleId, setTargetRoleId] = useState("");
  const [escalationLevels, setEscalationLevels] = useState<Array<{ roleId: string, timeoutMinutes: string, notificationTone: string }>>([
    { roleId: "", timeoutMinutes: "30", notificationTone: "level-1" }
  ]);

  const [reminderTone, setReminderTone] = useState("level-1");
  const [completionTimeMins, setCompletionTimeMins] = useState("60");
  const [warningThresholdMins, setWarningThresholdMins] = useState("10");
  const [allowTimeExtension, setAllowTimeExtension] = useState(false);
  const [maxExtensionMins, setMaxExtensionMins] = useState("15");

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

  const loadRoles = () => {
    fetch("/api/settings/roles")
      .then((res) => res.json())
      .then((data) => setRoles(Array.isArray(data) ? data : []))
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    loadTasks();
    loadRoles();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this task rule?")) return;
    try {
      const res = await fetch(`/api/settings/tasks/${id}`, { method: "DELETE" });
      if (res.ok) {
        loadTasks();
      } else {
        alert("Failed to delete task");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting task");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const triggerConfig: any = {
        reminderTone,
        escalationTones: escalationLevels.map(l => l.notificationTone)
      };

      const res = await fetch(editingTaskId ? `/api/settings/tasks/${editingTaskId}` : "/api/settings/tasks", {
        method: editingTaskId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          triggerType: "event", // Defaulting to event as a pure policy
          actionType,
          targetRoleId: targetRoleId || null,
          triggerConfig,
          completionTimeMins: Number(completionTimeMins),
          warningThresholdMins: Number(warningThresholdMins),
          allowTimeExtension,
          maxExtensionMins: Number(maxExtensionMins),
          escalationLevels: escalationLevels.map(level => ({
            roleId: level.roleId === "REPORTING_MANAGER" ? null : (level.roleId || null),
            escalateToReportingManager: level.roleId === "REPORTING_MANAGER",
            timeoutMinutes: Number(level.timeoutMinutes)
          }))
        }),
      });
      if (res.ok) {
        setEditingTaskId(null);
        setIsModalOpen(false);
        setTitle("");
        setTargetRoleId("");
        setReminderTone("level-1");
        setEscalationLevels([{ roleId: "", timeoutMinutes: "30", notificationTone: "level-1" }]);
        loadTasks();
      } else {
        alert(editingTaskId ? "Failed to update task" : "Failed to create task");
      }
    } catch (err) {
      console.error(err);
      alert(editingTaskId ? "Error updating task" : "Error creating task");
    }
  };

  const handleEdit = (task: TaskDefinition) => {
    setEditingTaskId(task.id);
    setTitle(task.title);
    setActionType(task.actionType);
    setTargetRoleId(task.targetRoleId || "");
    setReminderTone(task.triggerConfig?.reminderTone || "level-1");
    setCompletionTimeMins((task.completionTimeMins || 60).toString());
    setWarningThresholdMins((task.warningThresholdMins || 10).toString());
    setAllowTimeExtension(task.allowTimeExtension || false);
    setMaxExtensionMins((task.maxExtensionMins || 15).toString());
    
    if (task.escalationLevels && task.escalationLevels.length > 0) {
      setEscalationLevels(task.escalationLevels.map((lvl: any, index: number) => ({
        roleId: lvl.escalateToReportingManager ? "REPORTING_MANAGER" : (lvl.roleId || ""),
        timeoutMinutes: (lvl.timeoutMinutes || 0).toString(),
        notificationTone: task.triggerConfig?.escalationTones?.[index] || "level-1"
      })));
    } else {
      setEscalationLevels([{ roleId: "", timeoutMinutes: "30", notificationTone: "level-1" }]);
    }
    
    setIsModalOpen(true);
  };

  const handleOpenNew = () => {
    setEditingTaskId(null);
    setTitle("");
    setTargetRoleId("");
    setReminderTone("level-1");
    setEscalationLevels([{ roleId: "", timeoutMinutes: "30", notificationTone: "level-1" }]);
    setIsModalOpen(true);
  };

  return (

    <div className="kalki-table-container" style={{ padding: '24px' }}>
      <div className="kalki-page-header" style={{ margin: '-24px -24px 24px -24px' }}>
        <div>
          <h1 className="kalki-page-title">Task &amp; Reminder Engine</h1>
          <p className="kalki-page-description">Configure event-driven tasks and time-based reminders.</p>
        </div>
        <div style={{ marginTop: '12px' }}>
          <button
            onClick={handleOpenNew}
            className="kalki-button kalki-button--primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Plus className="h-4 w-4" />
            New Task Rule
          </button>
        </div>
      </div>

      <div className="kalki-table-container">
        <table className="kalki-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Module</th>
              <th>Action</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: 'var(--kalki-text-secondary)', padding: '32px' }}>
                  Loading configurations...
                </td>
              </tr>
            ) : tasks.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: 'var(--kalki-text-secondary)', padding: '32px' }}>
                  No task rules configured. Create one to automate operations.
                </td>
              </tr>
            ) : (
              tasks.map((task) => (
                <tr key={task.id}>
                  <td style={{ fontWeight: 500 }}>{task.title}</td>
                  <td style={{ textTransform: 'capitalize' }}>{task.module}</td>
                  <td style={{ textTransform: 'capitalize' }}>{task.actionType}</td>
                  <td>
                    <span className="pill" data-state="VERIFIED">
                      Active
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => handleEdit(task)}
                      className="kalki-button kalki-button--ghost"
                      title="Edit Task"
                    >
                      <Pencil className="h-4 w-4 text-blue-600" />
                    </button>
                    <button
                      onClick={() => handleDelete(task.id)}
                      className="kalki-button kalki-button--ghost kalki-button--danger"
                      title="Delete Task"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

        {/* Modal overlay */}
        {isModalOpen && (
          <div className="kalki-modal-overlay">
            <div className="kalki-modal" style={{ maxHeight: '90vh', overflowY: 'auto', backgroundColor: '#ffffff' }}>
              <div className="kalki-modal-header">
                <h2>{editingTaskId ? "Edit Task Rule" : "Create Task Rule"}</h2>
                <button type="button" onClick={() => setIsModalOpen(false)} className="kalki-modal-close">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="kalki-modal-content">
                  <div className="kalki-field">
                    <label className="kalki-label">Title <span className="kalki-required">*</span></label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="kalki-input"
                      placeholder="e.g. Low Stock Alert"
                    />
                  </div>

                  <div className="kalki-grid-2-col">
                    <div className="kalki-field">
                      <label className="kalki-label">Reminder Tone</label>
                      <select 
                        value={reminderTone}
                        onChange={(e) => setReminderTone(e.target.value)}
                        className="kalki-select"
                      >
                        <option value="level-1">Level 1 - Default Bell</option>
                        <option value="level-2">Level 2 - Sharp Beep</option>
                        <option value="level-3">Level 3 - Soft Chime</option>
                        <option value="level-4">Level 4 - Long Alert</option>
                        <option value="level-5">Level 5 - Urgent Siren</option>
                      </select>
                    </div>
                  </div>

                  <div className="kalki-grid-2-col">
                    <div className="kalki-field">
                      <label className="kalki-label">Assigned Role</label>
                      <select
                        value={targetRoleId}
                        onChange={(e) => setTargetRoleId(e.target.value)}
                        className="kalki-select"
                      >
                        <option value="">Any / Location Level</option>
                        {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                    </div>
                    <div className="kalki-field">
                      <label className="kalki-label">Completion Time (Mins)</label>
                      <input
                        type="number"
                        min="1"
                        value={completionTimeMins}
                        onChange={(e) => setCompletionTimeMins(e.target.value)}
                        className="kalki-input"
                        placeholder="e.g. 60"
                      />
                    </div>
                  </div>

                  <div className="kalki-section">
                    <div className="kalki-section-header">
                      <div className="kalki-section-title">Escalation Matrix (Role, Tone, & Delay)</div>
                      <button
                        type="button"
                        onClick={() => setEscalationLevels([...escalationLevels, { roleId: "", timeoutMinutes: "30", notificationTone: "level-1" }])}
                        className="kalki-button kalki-button--ghost"
                        style={{ color: 'var(--kalki-primary)' }}
                      >
                        <Plus className="h-4 w-4" style={{ marginRight: '4px' }} /> Add Level
                      </button>
                    </div>
                    <div className="kalki-section-content" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {escalationLevels.map((level, index) => (
                        <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px', border: '1px solid var(--kalki-border)', borderRadius: 'var(--radius-sm)', background: 'white' }}>
                          <span style={{ fontSize: '13px', fontWeight: 500, width: '60px', color: 'var(--kalki-text-secondary)' }}>Level {index + 1}</span>
                          <div style={{ flex: 1 }}>
                            <select
                              value={level.roleId}
                              onChange={(e) => {
                                const newLevels = [...escalationLevels];
                                newLevels[index].roleId = e.target.value;
                                setEscalationLevels(newLevels);
                              }}
                              className="kalki-select"
                            >
                              <option value="">Default Management</option>
                              <option value="REPORTING_MANAGER">Reporting Person (Manager)</option>
                              {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                          </div>
                          <div style={{ flex: 1, minWidth: '150px' }}>
                            <select
                              value={level.notificationTone}
                              onChange={(e) => {
                                const newLevels = [...escalationLevels];
                                newLevels[index].notificationTone = e.target.value;
                                setEscalationLevels(newLevels);
                              }}
                              className="kalki-select"
                            >
                              <option value="level-1">Level 1 - Default Bell</option>
                              <option value="level-2">Level 2 - Sharp Beep</option>
                              <option value="level-3">Level 3 - Soft Chime</option>
                              <option value="level-4">Level 4 - Long Alert</option>
                              <option value="level-5">Level 5 - Urgent Siren</option>
                            </select>
                          </div>
                          <div style={{ width: '100px' }}>
                            <input
                              type="number"
                              min="0"
                              placeholder="Delay (Mins)"
                              value={level.timeoutMinutes}
                              onChange={(e) => {
                                const newLevels = [...escalationLevels];
                                newLevels[index].timeoutMinutes = e.target.value;
                                setEscalationLevels(newLevels);
                              }}
                              className="kalki-input"
                            />
                          </div>
                          <div style={{ width: '32px', display: 'flex', justifyContent: 'center' }}>
                            {escalationLevels.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const newLevels = escalationLevels.filter((_, i) => i !== index);
                                  setEscalationLevels(newLevels);
                                }}
                                className="kalki-button kalki-button--ghost kalki-button--danger"
                                style={{ padding: '4px' }}
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="kalki-grid-2-col">
                    <div className="kalki-field">
                      <label className="kalki-label">Warning Threshold (Mins)</label>
                      <input
                        type="number"
                        min="0"
                        value={warningThresholdMins}
                        onChange={(e) => setWarningThresholdMins(e.target.value)}
                        className="kalki-input"
                      />
                    </div>
                    <div className="kalki-field">
                      <label className="kalki-label">Allow Extension?</label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', border: '1px solid var(--kalki-border)', borderRadius: 'var(--radius-sm)', background: '#fff', cursor: 'pointer', height: '100%', boxSizing: 'border-box' }}>
                        <input
                          type="checkbox"
                          checked={allowTimeExtension}
                          onChange={(e) => setAllowTimeExtension(e.target.checked)}
                        />
                        <span style={{ fontSize: '14px', color: 'var(--kalki-text-primary)' }}>Yes, allow user to extend</span>
                      </label>
                    </div>
                  </div>

                  {allowTimeExtension && (
                    <div className="kalki-field" style={{ padding: '12px', background: '#eff6ff', borderRadius: 'var(--radius-sm)', border: '1px solid #bfdbfe' }}>
                      <label className="kalki-label" style={{ color: '#1e3a8a' }}>Max Extension Allowed (Mins)</label>
                      <input
                        type="number"
                        min="1"
                        value={maxExtensionMins}
                        onChange={(e) => setMaxExtensionMins(e.target.value)}
                        className="kalki-input"
                        style={{ borderColor: '#bfdbfe' }}
                      />
                      <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#3b82f6' }}>This limits how much extra time a user can request.</p>
                    </div>
                  )}
                </div>

                <div className="kalki-modal-footer">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="kalki-button kalki-button--secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="kalki-button kalki-button--primary"
                  >
                    Save Rule
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
    </div>
  );
}
