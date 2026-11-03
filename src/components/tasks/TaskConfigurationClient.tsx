"use client";

import { useEffect, useState } from "react";
import { Plus, X, Trash2, Pencil, HelpCircle, CheckSquare, ShieldAlert, Layers, Sparkles, Clock, User, ArrowRight, ShieldCheck, CheckCircle2, AlertCircle, FileText, Bot } from "lucide-react";
import { useSessionView } from "@/components/AppShell";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { KalkiModal } from "@/components/ui/KalkiModal";

export type ChecklistItemConfig = {
  id: string;
  title: string;
  helpDescription: string;
  inputType: "checkbox" | "multi_checkbox" | "radio" | "text" | "number";
  options?: string[];
  isRequired?: boolean;
};

type TaskDefinition = {
  id: string;
  title: string;
  description?: string | null;
  module: string;
  triggerType: string;
  actionType: string;
  priority?: "low" | "medium" | "high" | "critical" | string;
  evidenceRequirementType?: string | null;
  triggerConfig?: any;
  targetRoleId?: string | null;
  escalationPolicyId?: string | null;
  completionTimeMins?: number | null;
  warningThresholdMins?: number | null;
  allowTimeExtension?: boolean;
  maxExtensionMins?: number | null;
  requiresApproval?: boolean;
  checklistConfig?: ChecklistItemConfig[];
  escalationLevels?: any[];
  liveInstance?: {
    id: string;
    status: string;
    escalationLevel: number;
    dueAt: string | null;
    completedAt: string | null;
    createdAt: string;
    scoreSnapshot?: any;
    completionProofUrl?: string | null;
    actorName?: string;
  } | null;
  lastCycle?: {
    id: string;
    status: string;
    escalationLevel: number;
    dueAt: string | null;
    completedAt: string | null;
    createdAt: string;
    scoreSnapshot?: any;
    completionProofUrl?: string | null;
    actorName?: string;
  } | null;
};

export function TaskConfigurationClient() {
  const { selected } = useSessionView();
  const [activeConfigTab, setActiveConfigTab] = useState<"tasks" | "rules">("tasks");
  const [tasks, setTasks] = useState<TaskDefinition[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal 1: Routine Task Modal
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskModule, setTaskModule] = useState("system");
  const [taskRoleId, setTaskRoleId] = useState("");
  const [taskEscalationRuleId, setTaskEscalationRuleId] = useState("");
  const [taskPriority, setTaskPriority] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [taskRequiresApproval, setTaskRequiresApproval] = useState(false);
  const [taskEvidenceRequirementType, setTaskEvidenceRequirementType] = useState<"optional" | "mandatory" | "none">("optional");
  const [taskChecklistItems, setTaskChecklistItems] = useState<ChecklistItemConfig[]>([]);

  // Task Frequency & Trigger Config State
  const [taskFrequency, setTaskFrequency] = useState<"daily" | "weekly" | "biweekly" | "monthly">("daily");
  const [taskTriggerTime, setTaskTriggerTime] = useState("09:00");
  const [taskSelectedDays, setTaskSelectedDays] = useState<string[]>(["MON", "WED", "FRI"]);
  const [taskNotificationTone, setTaskNotificationTone] = useState("level-1");

  // Modal 2: Escalation Rule Modal
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [ruleTitle, setRuleTitle] = useState("");
  const [ruleDescription, setRuleDescription] = useState("");
  const [ruleCompletionMins, setRuleCompletionMins] = useState("60");
  const [ruleWarningMins, setRuleWarningMins] = useState("10");
  const [ruleAllowExtension, setRuleAllowExtension] = useState(true);
  const [ruleMaxExtensionMins, setRuleMaxExtensionMins] = useState("15");
  const [ruleReminderTone, setRuleReminderTone] = useState("level-1");
  const [ruleEscalationLevels, setRuleEscalationLevels] = useState<Array<{ roleId: string; timeoutMinutes: string; notificationTone: string }>>([
    { roleId: "REPORTING_MANAGER", timeoutMinutes: "30", notificationTone: "level-1" },
  ]);

  // Modal 3: View Job Details Modal (Clicking on Job Title)
  const [viewingTask, setViewingTask] = useState<TaskDefinition | null>(null);

  // Modal 4: AI & Automation Flow Intelligence Modal
  const [aiFlowTask, setAiFlowTask] = useState<TaskDefinition | null>(null);

  // Close modals on Escape key
  useEscapeKey(() => setIsTaskModalOpen(false), isTaskModalOpen);
  useEscapeKey(() => setIsRuleModalOpen(false), isRuleModalOpen);

  // Filter tasks into: Routine Tasks (has checklist or time trigger with no policy mark) vs SLA Escalation Rules
  // Any definition with triggerType === "policy" OR (no checklist AND has escalationLevels configured) is an SLA Rule
  const escalationRules = tasks.filter((t) => 
    t.triggerType === "policy" || 
    (t.triggerType === "event" && (!t.checklistConfig || (Array.isArray(t.checklistConfig) && t.checklistConfig.length === 0)))
  );
  const routineTasks = tasks.filter((t) => !escalationRules.some(r => r.id === t.id));

  const loadData = () => {
    if (!selected?.organizationId) return;
    setLoading(true);
    const params = new URLSearchParams({ organizationId: selected.organizationId });
    if (selected.locationId) {
      params.append("locationId", selected.locationId);
    }
    fetch(`/api/settings/tasks?${params.toString()}`)
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

    fetch(`/api/settings/roles?organizationId=${selected.organizationId}`)
      .then((res) => res.json())
      .then((data) => setRoles(Array.isArray(data) ? data : []))
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    loadData();
  }, [selected?.organizationId, selected?.locationId]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      const res = await fetch(`/api/settings/tasks/${id}`, { method: "DELETE" });
      if (res.ok) {
        loadData();
      } else {
        alert("Failed to delete record");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting record");
    }
  };

  // -------------------------------------------------------------
  // HANDLERS FOR TASK ITEMS
  // -------------------------------------------------------------
  const handleOpenNewTask = () => {
    setEditingTaskId(null);
    setTaskTitle("");
    setTaskDescription("");
    setTaskModule("system");
    setTaskRoleId("");
    setTaskEscalationRuleId(escalationRules[0]?.id || "");
    setTaskPriority("medium");
    setTaskRequiresApproval(false);
    setTaskEvidenceRequirementType("optional");
    setTaskFrequency("daily");
    setTaskTriggerTime("09:00");
    setTaskSelectedDays(["MON", "WED", "FRI"]);
    setTaskNotificationTone("level-1");
    setTaskChecklistItems([]);
    setIsTaskModalOpen(true);
  };

  const handleEditTask = (t: TaskDefinition) => {
    setEditingTaskId(t.id);
    setTaskTitle(t.title);
    setTaskDescription(t.description || "");
    setTaskModule(t.module || "system");
    setTaskRoleId(t.targetRoleId || "");
    setTaskEscalationRuleId(t.escalationPolicyId || "");
    setTaskPriority((t.priority as any) || "medium");
    setTaskRequiresApproval(!!t.requiresApproval);
    const reqType = (t.evidenceRequirementType === "mandatory" || t.evidenceRequirementType === "image" || t.evidenceRequirementType === "document")
      ? "mandatory"
      : t.evidenceRequirementType === "none"
      ? "none"
      : "optional";
    setTaskEvidenceRequirementType(reqType);
    setTaskChecklistItems(Array.isArray(t.checklistConfig) ? t.checklistConfig : []);

    const config = t.triggerConfig || {};
    setTaskFrequency(config.frequency || "daily");
    setTaskTriggerTime(config.triggerTime || "09:00");
    setTaskSelectedDays(Array.isArray(config.selectedDays) ? config.selectedDays : ["MON", "WED", "FRI"]);
    setTaskNotificationTone(config.reminderTone || "level-1");
    setIsTaskModalOpen(true);
  };

  const handleSubmitTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const linkedRule = escalationRules.find((r) => r.id === taskEscalationRuleId);

      const triggerConfig = {
        frequency: taskFrequency,
        triggerTime: taskTriggerTime,
        selectedDays: taskFrequency === "weekly" || taskFrequency === "biweekly" ? taskSelectedDays : undefined,
        reminderTone: taskNotificationTone,
      };

      const payload = {
        organizationId: selected?.organizationId,
        title: taskTitle,
        description: taskDescription || null,
        module: taskModule,
        triggerType: "time",
        actionType: "task",
        triggerConfig,
        targetRoleId: taskRoleId || null,
        escalationPolicyId: taskEscalationRuleId || null,
        priority: taskPriority,
        requiresApproval: taskRequiresApproval,
        evidenceRequirementType: taskEvidenceRequirementType,
        checklistConfig: taskChecklistItems,
        // Inherit defaults from linked rule
        completionTimeMins: linkedRule?.completionTimeMins || 60,
        warningThresholdMins: linkedRule?.warningThresholdMins || 10,
        allowTimeExtension: linkedRule ? linkedRule.allowTimeExtension : true,
        maxExtensionMins: linkedRule?.maxExtensionMins || 15,
      };

      const res = await fetch(editingTaskId ? `/api/settings/tasks/${editingTaskId}` : "/api/settings/tasks", {
        method: editingTaskId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsTaskModalOpen(false);
        loadData();
      } else {
        alert(editingTaskId ? "Failed to update task" : "Failed to create task");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving task");
    }
  };

  // -------------------------------------------------------------
  // HANDLERS FOR ESCALATION RULES
  // -------------------------------------------------------------
  const handleOpenNewRule = () => {
    setEditingRuleId(null);
    setRuleTitle("");
    setRuleDescription("");
    setRuleCompletionMins("60");
    setRuleWarningMins("10");
    setRuleAllowExtension(true);
    setRuleMaxExtensionMins("15");
    setRuleReminderTone("level-1");
    setRuleEscalationLevels([
      { roleId: "REPORTING_MANAGER", timeoutMinutes: "30", notificationTone: "level-1" },
    ]);
    setIsRuleModalOpen(true);
  };

  const handleEditRule = (r: TaskDefinition) => {
    setEditingRuleId(r.id);
    setRuleTitle(r.title);
    setRuleDescription(r.description || "");
    setRuleCompletionMins((r.completionTimeMins || 60).toString());
    setRuleWarningMins((r.warningThresholdMins || 10).toString());
    setRuleAllowExtension(r.allowTimeExtension !== false);
    setRuleMaxExtensionMins((r.maxExtensionMins || 15).toString());
    setRuleReminderTone(r.triggerConfig?.reminderTone || "level-1");

    if (r.escalationLevels && r.escalationLevels.length > 0) {
      setRuleEscalationLevels(
        r.escalationLevels.map((lvl: any, index: number) => ({
          roleId: lvl.escalateToReportingManager ? "REPORTING_MANAGER" : lvl.roleId || "",
          timeoutMinutes: (lvl.timeoutMinutes || 0).toString(),
          notificationTone: r.triggerConfig?.escalationTones?.[index] || "level-1",
        }))
      );
    } else {
      setRuleEscalationLevels([
        { roleId: "REPORTING_MANAGER", timeoutMinutes: "30", notificationTone: "level-1" },
      ]);
    }
    setIsRuleModalOpen(true);
  };

  const handleSubmitRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const triggerConfig = {
        reminderTone: ruleReminderTone,
        escalationTones: ruleEscalationLevels.map((l) => l.notificationTone),
      };

      const payload = {
        organizationId: selected?.organizationId,
        title: ruleTitle,
        description: ruleDescription || null,
        module: "system",
        triggerType: "policy", // Distinguishes reusable Escalation Policy from routine jobs
        actionType: "reminder",
        triggerConfig,
        completionTimeMins: Number(ruleCompletionMins),
        warningThresholdMins: Number(ruleWarningMins),
        allowTimeExtension: ruleAllowExtension,
        maxExtensionMins: Number(ruleMaxExtensionMins),
        escalationLevels: ruleEscalationLevels.map((level) => ({
          roleId: level.roleId === "REPORTING_MANAGER" ? null : level.roleId || null,
          escalateToReportingManager: level.roleId === "REPORTING_MANAGER",
          timeoutMinutes: Number(level.timeoutMinutes),
        })),
      };

      const res = await fetch(editingRuleId ? `/api/settings/tasks/${editingRuleId}` : "/api/settings/tasks", {
        method: editingRuleId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsRuleModalOpen(false);
        loadData();
      } else {
        alert(editingRuleId ? "Failed to update escalation rule" : "Failed to create escalation rule");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving escalation rule");
    }
  };

  return (
    <div className="kalki-table-container" style={{ padding: "20px" }}>
      {/* Header with 2 clean sub-tabs */}
      <div className="kalki-page-header" style={{ margin: "-20px -20px 20px -20px" }}>
        <div>
          <h1 className="kalki-page-title">Tasks &amp; Escalation Configuration</h1>
          <p className="kalki-page-description">
            Configure operational checklist routines and global SLA escalation rules separately.
          </p>
        </div>
        <div>
          {activeConfigTab === "tasks" ? (
            <button
              onClick={handleOpenNewTask}
              className="kalki-button kalki-button--primary"
              style={{ display: "flex", alignItems: "center", gap: "8px" }}
            >
              <Plus className="h-4 w-4" />
              New Routine Job / Checklist
            </button>
          ) : (
            <button
              onClick={handleOpenNewRule}
              className="kalki-button kalki-button--primary"
              style={{ display: "flex", alignItems: "center", gap: "8px" }}
            >
              <Plus className="h-4 w-4" />
              New Escalation Rule
            </button>
          )}
        </div>
      </div>

      {/* Configuration View Selector */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
        <button
          type="button"
          onClick={() => setActiveConfigTab("tasks")}
          className="kalki-button"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: activeConfigTab === "tasks" ? "#fef3c7" : "#ffffff",
            borderColor: activeConfigTab === "tasks" ? "#d97706" : "#cbd5e1",
            color: activeConfigTab === "tasks" ? "#b45309" : "#475569",
            fontWeight: activeConfigTab === "tasks" ? 600 : 500,
          }}
        >
          <Layers className="h-4 w-4" />
          Routine Jobs &amp; Checklists ({routineTasks.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveConfigTab("rules")}
          className="kalki-button"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: activeConfigTab === "rules" ? "#fef3c7" : "#ffffff",
            borderColor: activeConfigTab === "rules" ? "#d97706" : "#cbd5e1",
            color: activeConfigTab === "rules" ? "#b45309" : "#475569",
            fontWeight: activeConfigTab === "rules" ? 600 : 500,
          }}
        >
          <ShieldAlert className="h-4 w-4" />
          SLA &amp; Escalation Rules ({escalationRules.length})
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: ROUTINE TASKS & CHECKLISTS TABLE */}
      {/* ------------------------------------------------------------- */}
      {activeConfigTab === "tasks" && (
        <div className="kalki-table-container">
          <table className="kalki-table">
            <thead>
              <tr>
                <th>Job Title &amp; SOP</th>
                <th>Assigned Role</th>
                <th>Priority</th>
                <th>Linked Escalation Rule</th>
                <th>Checklist Items</th>
                <th>Attachment</th>
                <th>Supervisor Sign-off</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", color: "var(--kalki-text-secondary)", padding: "32px" }}>
                    Loading routine jobs...
                  </td>
                </tr>
              ) : routineTasks.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", color: "var(--kalki-text-secondary)", padding: "32px" }}>
                    No routine tasks configured. Click "+ New Routine Job / Checklist" above to create one.
                  </td>
                </tr>
              ) : (
                routineTasks.map((t) => {
                  const linkedRule = escalationRules.find((r) => r.id === t.escalationPolicyId);
                  return (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 500 }}>
                        <button
                          type="button"
                          onClick={() => setViewingTask(t)}
                          style={{
                            background: "none",
                            border: "none",
                            padding: 0,
                            margin: 0,
                            textAlign: "left",
                            cursor: "pointer",
                            display: "inline-block",
                            color: "#2563eb",
                            fontWeight: 600,
                            fontSize: "14px",
                            textDecoration: "none",
                          }}
                          className="hover:text-blue-700 transition-colors"
                          title="Click to view full job description, task checklist, and SOP"
                        >
                          <span style={{ borderBottom: "1px dashed #3b82f6", display: "inline-block" }}>
                            {t.title}
                          </span>
                        </button>
                        {t.description && (
                          <div style={{ fontSize: "12px", color: "var(--kalki-text-secondary)", marginTop: "2px" }}>
                            {t.description}
                          </div>
                        )}
                      </td>
                      <td>
                        {roles.find((r) => r.id === t.targetRoleId)?.name || "General Staff"}
                      </td>
                      <td>
                        <span
                          className="pill"
                          data-state={
                            t.priority === "critical"
                              ? "DANGER"
                              : t.priority === "high"
                              ? "WARNING"
                              : t.priority === "low"
                              ? "NEUTRAL"
                              : "INFO"
                          }
                          style={{ textTransform: "capitalize", fontWeight: 600 }}
                        >
                          {t.priority || "Medium"}
                        </span>
                      </td>
                      <td>
                        {linkedRule ? (
                          <span style={{ fontSize: "13px", fontWeight: 500, color: "#2563eb" }}>
                            {linkedRule.title}
                          </span>
                        ) : (
                          <span style={{ fontSize: "12px", color: "#94a3b8" }}>Default SLA (60m)</span>
                        )}
                      </td>
                      <td>
                        {Array.isArray(t.checklistConfig) && t.checklistConfig.length > 0 ? (
                          <span className="pill" data-state="INFO">
                            {t.checklistConfig.length} Checks
                          </span>
                        ) : (
                          <span style={{ fontSize: "12px", color: "var(--kalki-text-muted)" }}>Simple Check</span>
                        )}
                      </td>
                      <td>
                        {t.evidenceRequirementType === "mandatory" || t.evidenceRequirementType === "image" || t.evidenceRequirementType === "document" ? (
                          <span className="pill" data-state="DANGER" style={{ fontWeight: 600 }}>
                            Mandatory Proof
                          </span>
                        ) : t.evidenceRequirementType === "none" ? (
                          <span style={{ fontSize: "12px", color: "var(--kalki-text-muted)" }}>None</span>
                        ) : (
                          <span className="pill" data-state="NEUTRAL" style={{ backgroundColor: "#f1f5f9", color: "#475569" }}>
                            Optional
                          </span>
                        )}
                      </td>
                      <td>
                        {t.requiresApproval ? (
                          <span className="pill" data-state="WARNING">Requires Review</span>
                        ) : (
                          <span className="pill" data-state="VERIFIED">Auto-Complete</span>
                        )}
                      </td>
                      <td style={{ textAlign: "right", display: "flex", gap: "8px", justifyContent: "flex-end", alignItems: "center" }}>
                        <button
                          type="button"
                          onClick={() => setAiFlowTask(t)}
                          className="kalki-button kalki-button--ghost"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            backgroundColor: "#f5f3ff",
                            color: "#7c3aed",
                            border: "1px solid #ddd6fe",
                            padding: "6px 10px",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                          title="View Automation & AI Flow Intelligence"
                        >
                          <Sparkles className="h-3.5 w-3.5" style={{ color: "#7c3aed" }} />
                          <span>AI Flow</span>
                        </button>
                        <button
                          onClick={() => handleEditTask(t)}
                          className="kalki-button kalki-button--ghost"
                          title="Edit Task"
                        >
                          <Pencil className="h-4 w-4 text-blue-600" />
                        </button>
                        <button
                          onClick={() => handleDelete(t.id, t.title)}
                          className="kalki-button kalki-button--ghost kalki-button--danger"
                          title="Delete Task"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: REUSABLE ESCALATION RULES TABLE */}
      {/* ------------------------------------------------------------- */}
      {activeConfigTab === "rules" && (
        <div className="kalki-table-container">
          <table className="kalki-table">
            <thead>
              <tr>
                <th>Rule Name</th>
                <th>Completion Time</th>
                <th>Warning Alert</th>
                <th>Extension Allowed</th>
                <th>Escalation Hierarchy</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", color: "var(--kalki-text-secondary)", padding: "32px" }}>
                    Loading escalation rules...
                  </td>
                </tr>
              ) : escalationRules.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", color: "var(--kalki-text-secondary)", padding: "32px" }}>
                    No reusable escalation rules configured. Click "+ New Escalation Rule" above to create one.
                  </td>
                </tr>
              ) : (
                escalationRules.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 500 }}>
                      <div>{r.title}</div>
                      {r.description && (
                        <div style={{ fontSize: "12px", color: "var(--kalki-text-secondary)", marginTop: "2px" }}>
                          {r.description}
                        </div>
                      )}
                    </td>
                    <td>{r.completionTimeMins || 60} mins</td>
                    <td>{r.warningThresholdMins || 10} mins before SLA</td>
                    <td>
                      {r.allowTimeExtension !== false ? (
                        <span className="pill" data-state="VERIFIED">Yes (+{r.maxExtensionMins || 15}m)</span>
                      ) : (
                        <span className="pill" data-state="NEUTRAL">No Extension</span>
                      )}
                    </td>
                    <td>
                      <span className="pill" data-state="INFO">
                        {r.escalationLevels?.length || 1} Level(s) Configured
                      </span>
                    </td>
                    <td style={{ textAlign: "right", display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                      <button
                        onClick={() => handleEditRule(r)}
                        className="kalki-button kalki-button--ghost"
                        title="Edit Rule"
                      >
                        <Pencil className="h-4 w-4 text-blue-600" />
                      </button>
                      <button
                        onClick={() => handleDelete(r.id, r.title)}
                        className="kalki-button kalki-button--ghost kalki-button--danger"
                        title="Delete Rule"
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
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: CREATE / EDIT ROUTINE TASK & CHECKLIST */}
      {/* ------------------------------------------------------------- */}
      {isTaskModalOpen && (
        <div className="kalki-modal-overlay">
          <div className="kalki-modal" style={{ maxHeight: "90vh", overflowY: "auto", backgroundColor: "#ffffff" }}>
            <div className="kalki-modal-header">
              <h2>{editingTaskId ? "Edit Routine Job" : "Create Routine Job / Checklist"}</h2>
              <button type="button" onClick={() => setIsTaskModalOpen(false)} className="kalki-modal-close">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitTask}>
              <div className="kalki-modal-content">
                <div className="kalki-field">
                  <label className="kalki-label">Job Title <span className="kalki-required">*</span></label>
                  <input
                    type="text"
                    required
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    className="kalki-input"
                    placeholder="e.g. Kitchen Opening & Cleanliness Check"
                  />
                </div>

                <div className="kalki-field">
                  <label className="kalki-label">Detailed Job Description / Standard Operating Procedure (SOP)</label>
                  <textarea
                    rows={2}
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                    className="kalki-input"
                    placeholder="Explain the background and operational purpose of this routine job..."
                  />
                </div>

                <div className="kalki-grid-2-col">
                  <div className="kalki-field">
                    <label className="kalki-label">Assigned Business Role <span className="kalki-required">*</span></label>
                    <select
                      required
                      value={taskRoleId}
                      onChange={(e) => setTaskRoleId(e.target.value)}
                      className="kalki-select"
                    >
                      <option value="">Select Role (e.g. Supervisor, Cashier)</option>
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="kalki-field">
                    <label className="kalki-label">Priority</label>
                    <select
                      value={taskPriority}
                      onChange={(e) => setTaskPriority(e.target.value as any)}
                      className="kalki-select"
                    >
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority (Standard)</option>
                      <option value="high">High Priority</option>
                      <option value="critical">Critical (Immediate)</option>
                    </select>
                  </div>
                </div>

                <div className="kalki-field">
                  <label className="kalki-label">Linked SLA &amp; Escalation Rule</label>
                  <select
                    value={taskEscalationRuleId}
                    onChange={(e) => setTaskEscalationRuleId(e.target.value)}
                    className="kalki-select"
                  >
                    <option value="">Default SLA Policy</option>
                    {escalationRules.map((r) => (
                      <option key={r.id} value={r.id}>{r.title} ({r.completionTimeMins}m)</option>
                    ))}
                  </select>
                </div>

                {/* Recurrence Schedule & Trigger Timing */}
                <div className="kalki-section" style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "14px", background: "#f8fafc", marginBottom: "16px" }}>
                  <div style={{ fontWeight: 600, fontSize: "13px", color: "#1e293b", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>Trigger Frequency &amp; Timing</span>
                  </div>

                  <div className="kalki-grid-2-col" style={{ marginBottom: "10px" }}>
                    <div className="kalki-field">
                      <label className="kalki-label">Frequency <span className="kalki-required">*</span></label>
                      <select
                        value={taskFrequency}
                        onChange={(e) => setTaskFrequency(e.target.value as any)}
                        className="kalki-select"
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="biweekly">Bi-Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>

                    <div className="kalki-field">
                      <label className="kalki-label">Job Trigger Time (24h) <span className="kalki-required">*</span></label>
                      <input
                        type="time"
                        required
                        value={taskTriggerTime}
                        onChange={(e) => setTaskTriggerTime(e.target.value)}
                        className="kalki-input"
                      />
                    </div>
                  </div>

                  {/* Day of Week Selector for Weekly or Bi-Weekly */}
                  {(taskFrequency === "weekly" || taskFrequency === "biweekly") && (
                    <div className="kalki-field" style={{ marginBottom: "8px" }}>
                      <label className="kalki-label" style={{ fontSize: "12px" }}>
                        Run on Days of the Week:
                      </label>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "4px" }}>
                        {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((day) => {
                          const isSelected = taskSelectedDays.includes(day);
                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setTaskSelectedDays(taskSelectedDays.filter((d) => d !== day));
                                } else {
                                  setTaskSelectedDays([...taskSelectedDays, day]);
                                }
                              }}
                              className="kalki-button kalki-button--sm"
                              style={{
                                padding: "4px 10px",
                                fontSize: "12px",
                                background: isSelected ? "#fef3c7" : "#ffffff",
                                borderColor: isSelected ? "#d97706" : "#cbd5e1",
                                color: isSelected ? "#b45309" : "#475569",
                                fontWeight: isSelected ? 600 : 400,
                              }}
                            >
                              {day}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Notification Tone on Job Trigger */}
                  <div className="kalki-field" style={{ marginTop: "10px" }}>
                    <label className="kalki-label">Notification Sound Alert When Job Triggers</label>
                    <select
                      value={taskNotificationTone}
                      onChange={(e) => setTaskNotificationTone(e.target.value)}
                      className="kalki-select"
                    >
                      <option value="none">No Notification Sound (Silent)</option>
                      <option value="level-1">Level 1 - Classic Bell</option>
                      <option value="level-2">Level 2 - Sharp Beep</option>
                      <option value="level-3">Level 3 - Soft Chime</option>
                      <option value="level-4">Level 4 - Alarm Alert</option>
                      <option value="level-5">Level 5 - Urgent Siren</option>
                    </select>
                    <p style={{ margin: "4px 0 0 0", fontSize: "11px", color: "#64748b" }}>
                      When this job triggers at the configured time, the employee's dashboard will chime with this tone.
                    </p>
                  </div>
                </div>

                <div className="kalki-field">
                  <label className="kalki-label">Attachment / Completion Proof Requirement</label>
                  <select
                    value={taskEvidenceRequirementType}
                    onChange={(e) => setTaskEvidenceRequirementType(e.target.value as any)}
                    className="kalki-select"
                  >
                    <option value="optional">Default: Optional Attachment (Employees can attach photo/doc if needed)</option>
                    <option value="mandatory">Mandatory Attachment (Must upload photo or doc to complete)</option>
                    <option value="none">Disabled (No attachment allowed)</option>
                  </select>
                  <p style={{ margin: "4px 0 0 0", fontSize: "11px", color: "#64748b" }}>
                    Configure whether employees must upload a photo/document proof before submitting this task.
                  </p>
                </div>

                <div className="kalki-field">
                  <label className="kalki-label">Supervisor Approval Workflow</label>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", border: "1px solid var(--kalki-border)", borderRadius: "var(--radius-sm)", background: "#fff", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={taskRequiresApproval}
                      onChange={(e) => setTaskRequiresApproval(e.target.checked)}
                    />
                    <span style={{ fontSize: "13px", color: "var(--kalki-text-primary)" }}>
                      <strong>Require Supervisor Sign-off</strong> (Task routes to supervisor after employee submits)
                    </span>
                  </label>
                </div>

                {/* Checklist Questions Builder */}
                <div className="kalki-section" style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "16px", background: "#f8fafc" }}>
                  <div className="kalki-section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <div>
                      <div className="kalki-section-title" style={{ fontWeight: 600, fontSize: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
                        <CheckSquare className="h-4 w-4" style={{ color: "var(--kalki-primary)" }} />
                        Checklist Questions &amp; Items ({taskChecklistItems.length})
                      </div>
                      <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "var(--kalki-text-secondary)" }}>
                        Configure the items to check with (?) SOP help popups for employees.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const newItem: ChecklistItemConfig = {
                          id: `item-${Date.now()}`,
                          title: "",
                          helpDescription: "",
                          inputType: "checkbox",
                          options: ["Pass", "Fail"],
                          isRequired: true,
                        };
                        setTaskChecklistItems([...taskChecklistItems, newItem]);
                      }}
                      className="kalki-button kalki-button--primary kalki-button--sm"
                      style={{ display: "flex", alignItems: "center", gap: "4px" }}
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Item
                    </button>
                  </div>

                  {taskChecklistItems.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "16px", color: "var(--kalki-text-secondary)", fontSize: "13px", background: "#ffffff", borderRadius: "6px", border: "1px dashed #cbd5e1" }}>
                      No checklist items yet. Click "+ Add Item" to add verification questions.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {taskChecklistItems.map((item, idx) => (
                        <div key={item.id} style={{ padding: "12px", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "6px" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                            <span style={{ fontSize: "12px", fontWeight: 600, color: "#475569" }}>Item #{idx + 1}</span>
                            <button
                              type="button"
                              onClick={() => setTaskChecklistItems(taskChecklistItems.filter((_, i) => i !== idx))}
                              className="kalki-button kalki-button--ghost kalki-button--danger"
                              style={{ padding: "2px 6px", fontSize: "11px" }}
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Remove
                            </button>
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "8px", marginBottom: "8px" }}>
                            <div>
                              <label className="kalki-label" style={{ fontSize: "11px" }}>Task Question <span className="kalki-required">*</span></label>
                              <input
                                type="text"
                                required
                                placeholder="e.g. Check kitchen is cleaned & sanitized"
                                value={item.title}
                                onChange={(e) => {
                                  const next = [...taskChecklistItems];
                                  next[idx].title = e.target.value;
                                  setTaskChecklistItems(next);
                                }}
                                className="kalki-input"
                                style={{ fontSize: "13px", padding: "6px 8px" }}
                              />
                            </div>
                            <div>
                              <label className="kalki-label" style={{ fontSize: "11px" }}>Input Type</label>
                              <select
                                value={item.inputType}
                                onChange={(e) => {
                                  const next = [...taskChecklistItems];
                                  next[idx].inputType = e.target.value as any;
                                  if ((e.target.value === "radio" || e.target.value === "multi_checkbox") && (!next[idx].options || next[idx].options?.length === 0)) {
                                    next[idx].options = ["Pass", "Fail"];
                                  }
                                  setTaskChecklistItems(next);
                                }}
                                className="kalki-select"
                                style={{ fontSize: "13px", padding: "6px 8px" }}
                              >
                                <option value="checkbox">Single Checkbox (Done / Not Done)</option>
                                <option value="multi_checkbox">Multiple Checkboxes (Multi-Select Options)</option>
                                <option value="radio">Radio Buttons (Single Choice)</option>
                                <option value="text">Text Input (Notes / Remarks)</option>
                                <option value="number">Numeric (Temp / Count)</option>
                              </select>
                            </div>
                          </div>

                          {(item.inputType === "radio" || item.inputType === "multi_checkbox") && (
                            <div style={{ marginBottom: "12px", background: "#f8fafc", padding: "10px", borderRadius: "6px", border: "1px dashed #cbd5e1" }}>
                              <label className="kalki-label" style={{ fontSize: "11px", marginBottom: "6px", display: "block" }}>
                                {item.inputType === "multi_checkbox" ? "Custom Checkbox Options (Employees can check one or multiple)" : "Radio Choice Options (Employees select one of these)"}
                              </label>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "8px" }}>
                                {(item.options || ["Pass", "Fail"]).map((opt, optIdx) => (
                                  <span
                                    key={optIdx}
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "4px",
                                      background: "#ffffff",
                                      border: "1px solid #cbd5e1",
                                      borderRadius: "4px",
                                      padding: "3px 8px",
                                      fontSize: "12px",
                                      fontWeight: 500,
                                      color: "#334155",
                                    }}
                                  >
                                    {opt}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const next = [...taskChecklistItems];
                                        next[idx].options = (next[idx].options || ["Pass", "Fail"]).filter((_, i) => i !== optIdx);
                                        setTaskChecklistItems(next);
                                      }}
                                      style={{ background: "transparent", border: "none", cursor: "pointer", color: "#94a3b8", padding: 0, marginLeft: "2px" }}
                                      title="Remove option"
                                    >
                                      ×
                                    </button>
                                  </span>
                                ))}
                              </div>
                              <div style={{ display: "flex", gap: "6px" }}>
                                <input
                                  type="text"
                                  id={`new-opt-input-${item.id}`}
                                  placeholder={item.inputType === "multi_checkbox" ? "Type checkbox option (e.g. Floors mopped, Trash emptied) and click Add" : "Type option name (e.g. Needs Attention, Present) and click Add"}
                                  className="kalki-input"
                                  style={{ fontSize: "12px", padding: "4px 8px" }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      const val = (e.target as HTMLInputElement).value.trim();
                                      if (val) {
                                        const next = [...taskChecklistItems];
                                        next[idx].options = [...(next[idx].options || []), val];
                                        setTaskChecklistItems(next);
                                        (e.target as HTMLInputElement).value = "";
                                      }
                                    }
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const input = document.getElementById(`new-opt-input-${item.id}`) as HTMLInputElement;
                                    if (input && input.value.trim()) {
                                      const next = [...taskChecklistItems];
                                      next[idx].options = [...(next[idx].options || []), input.value.trim()];
                                      setTaskChecklistItems(next);
                                      input.value = "";
                                    }
                                  }}
                                  className="kalki-button kalki-button--secondary kalki-button--sm"
                                  style={{ whiteSpace: "nowrap", fontSize: "11px", padding: "4px 10px" }}
                                >
                                  + Add Option
                                </button>
                              </div>
                            </div>
                          )}

                          <div>
                            <label className="kalki-label" style={{ fontSize: "11px", display: "flex", alignItems: "center", gap: "4px" }}>
                              <HelpCircle className="h-3 w-3" style={{ color: "#2563eb" }} />
                              Detailed SOP Help (Appears in <strong>(?)</strong> popup for employees)
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Verify all counter tops wiped down with sanitizing liquid."
                              value={item.helpDescription}
                              onChange={(e) => {
                                const next = [...taskChecklistItems];
                                next[idx].helpDescription = e.target.value;
                                setTaskChecklistItems(next);
                              }}
                              className="kalki-input"
                              style={{ fontSize: "12px", padding: "6px 8px" }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="kalki-modal-footer">
                <button type="button" onClick={() => setIsTaskModalOpen(false)} className="kalki-button kalki-button--secondary">
                  Cancel
                </button>
                <button type="submit" className="kalki-button kalki-button--primary">
                  Save Routine Job
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: CREATE / EDIT SLA & ESCALATION RULE */}
      {/* ------------------------------------------------------------- */}
      {isRuleModalOpen && (
        <div className="kalki-modal-overlay">
          <div className="kalki-modal" style={{ maxHeight: "90vh", overflowY: "auto", backgroundColor: "#ffffff" }}>
            <div className="kalki-modal-header">
              <h2>{editingRuleId ? "Edit Escalation Rule" : "Create SLA & Escalation Rule"}</h2>
              <button type="button" onClick={() => setIsRuleModalOpen(false)} className="kalki-modal-close">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitRule}>
              <div className="kalki-modal-content">
                <div className="kalki-field">
                  <label className="kalki-label">Rule Policy Name <span className="kalki-required">*</span></label>
                  <input
                    type="text"
                    required
                    value={ruleTitle}
                    onChange={(e) => setRuleTitle(e.target.value)}
                    className="kalki-input"
                    placeholder="e.g. Standard Shift Opening Policy (30 Mins)"
                  />
                </div>

                <div className="kalki-field">
                  <label className="kalki-label">Rule Description</label>
                  <input
                    type="text"
                    value={ruleDescription}
                    onChange={(e) => setRuleDescription(e.target.value)}
                    className="kalki-input"
                    placeholder="e.g. Escalates to store manager after 30 mins delay"
                  />
                </div>

                <div className="kalki-grid-2-col">
                  <div className="kalki-field">
                    <label className="kalki-label">Expected Completion Time (Mins) <span className="kalki-required">*</span></label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={ruleCompletionMins}
                      onChange={(e) => setRuleCompletionMins(e.target.value)}
                      className="kalki-input"
                      placeholder="e.g. 60"
                    />
                  </div>
                  <div className="kalki-field">
                    <label className="kalki-label">Reminder Tone</label>
                    <select
                      value={ruleReminderTone}
                      onChange={(e) => setRuleReminderTone(e.target.value)}
                      className="kalki-select"
                    >
                      <option value="none">No Notification Sound (Silent)</option>
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
                    <label className="kalki-label">Warning Threshold (Mins)</label>
                    <input
                      type="number"
                      min="0"
                      value={ruleWarningMins}
                      onChange={(e) => setRuleWarningMins(e.target.value)}
                      className="kalki-input"
                    />
                  </div>
                  <div className="kalki-field">
                    <label className="kalki-label">Allow Time Extension?</label>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", border: "1px solid var(--kalki-border)", borderRadius: "var(--radius-sm)", background: "#fff", cursor: "pointer", height: "100%", boxSizing: "border-box" }}>
                      <input
                        type="checkbox"
                        checked={ruleAllowExtension}
                        onChange={(e) => setRuleAllowExtension(e.target.checked)}
                      />
                      <span style={{ fontSize: "14px", color: "var(--kalki-text-primary)" }}>Yes, allow user to extend</span>
                    </label>
                  </div>
                </div>

                {ruleAllowExtension && (
                  <div className="kalki-field" style={{ padding: "12px", background: "#eff6ff", borderRadius: "var(--radius-sm)", border: "1px solid #bfdbfe" }}>
                    <label className="kalki-label" style={{ color: "#1e3a8a" }}>Max Extension Allowed (Mins)</label>
                    <input
                      type="number"
                      min="1"
                      value={ruleMaxExtensionMins}
                      onChange={(e) => setRuleMaxExtensionMins(e.target.value)}
                      className="kalki-input"
                      style={{ borderColor: "#bfdbfe" }}
                    />
                  </div>
                )}

                {/* Escalation Matrix */}
                <div className="kalki-section" style={{ marginTop: "16px" }}>
                  <div className="kalki-section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <div className="kalki-section-title" style={{ fontWeight: 600 }}>Escalation Matrix (Role, Tone, &amp; Delay)</div>
                    <button
                      type="button"
                      onClick={() => setRuleEscalationLevels([...ruleEscalationLevels, { roleId: "", timeoutMinutes: "30", notificationTone: "level-1" }])}
                      className="kalki-button kalki-button--ghost"
                      style={{ color: "var(--kalki-primary)" }}
                    >
                      <Plus className="h-4 w-4" style={{ marginRight: "4px" }} /> Add Level
                    </button>
                  </div>
                  <div className="kalki-section-content" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {ruleEscalationLevels.map((level, index) => (
                      <div key={index} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px", border: "1px solid var(--kalki-border)", borderRadius: "var(--radius-sm)", background: "white" }}>
                        <span style={{ fontSize: "12px", fontWeight: 600, width: "55px", color: "var(--kalki-text-secondary)" }}>Level {index + 1}</span>
                        <div style={{ flex: 1 }}>
                          <select
                            value={level.roleId}
                            onChange={(e) => {
                              const next = [...ruleEscalationLevels];
                              next[index].roleId = e.target.value;
                              setRuleEscalationLevels(next);
                            }}
                            className="kalki-select"
                          >
                            <option value="">Default Management</option>
                            <option value="REPORTING_MANAGER">Reporting Person (Manager)</option>
                            {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                          </select>
                        </div>
                        <div style={{ flex: 1, minWidth: "140px" }}>
                          <select
                            value={level.notificationTone}
                            onChange={(e) => {
                              const next = [...ruleEscalationLevels];
                              next[index].notificationTone = e.target.value;
                              setRuleEscalationLevels(next);
                            }}
                            className="kalki-select"
                          >
                            <option value="none">No Sound (Silent)</option>
                            <option value="level-1">Level 1 - Bell</option>
                            <option value="level-2">Level 2 - Beep</option>
                            <option value="level-3">Level 3 - Chime</option>
                            <option value="level-4">Level 4 - Alert</option>
                            <option value="level-5">Level 5 - Siren</option>
                          </select>
                        </div>
                        <div style={{ width: "95px" }}>
                          <input
                            type="number"
                            min="0"
                            placeholder="Delay (m)"
                            value={level.timeoutMinutes}
                            onChange={(e) => {
                              const next = [...ruleEscalationLevels];
                              next[index].timeoutMinutes = e.target.value;
                              setRuleEscalationLevels(next);
                            }}
                            className="kalki-input"
                          />
                        </div>
                        <div style={{ width: "28px" }}>
                          {ruleEscalationLevels.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setRuleEscalationLevels(ruleEscalationLevels.filter((_, i) => i !== index))}
                              className="kalki-button kalki-button--ghost kalki-button--danger"
                              style={{ padding: "4px" }}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="kalki-modal-footer">
                <button type="button" onClick={() => setIsRuleModalOpen(false)} className="kalki-button kalki-button--secondary">
                  Cancel
                </button>
                <button type="submit" className="kalki-button kalki-button--primary">
                  Save Escalation Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 3: VIEW JOB DETAILS & TASK CHECKLIST (READ-ONLY) */}
      {/* ------------------------------------------------------------- */}
      {viewingTask && (
        <KalkiModal
          isOpen={!!viewingTask}
          onClose={() => setViewingTask(null)}
          title={
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <FileText className="h-5 w-5" style={{ color: "var(--kalki-primary, #b45309)" }} />
              <span>{viewingTask.title}</span>
            </div>
          }
          subtitle={`Routine Definition • ${roles.find((r) => r.id === viewingTask.targetRoleId)?.name || "General Staff"}`}
          maxWidth="700px"
          footer={
            <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
              <button
                type="button"
                onClick={() => {
                  const t = viewingTask;
                  setViewingTask(null);
                  handleEditTask(t);
                }}
                className="kalki-button kalki-button--secondary"
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <Pencil className="h-4 w-4" /> Edit Definition
              </button>
              <button
                type="button"
                onClick={() => setViewingTask(null)}
                className="kalki-button kalki-button--primary"
              >
                Close
              </button>
            </div>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            {/* Description & SOP Statement */}
            <div style={{ backgroundColor: "#f8fafc", padding: "14px 16px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>
                Job Description &amp; Standard Operating Procedure (SOP)
              </div>
              <div style={{ fontSize: "14px", color: viewingTask.description ? "#1e293b" : "#94a3b8", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                {viewingTask.description || "No detailed description or SOP was provided for this job."}
              </div>
            </div>

            {/* Quick Metadata Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
              <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px", backgroundColor: "#ffffff" }}>
                <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Assigned Role</span>
                <p style={{ margin: "4px 0 0 0", fontWeight: 600, color: "#0f172a", fontSize: "13px" }}>
                  {roles.find((r) => r.id === viewingTask.targetRoleId)?.name || "General Staff"}
                </p>
              </div>

              <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px", backgroundColor: "#ffffff" }}>
                <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Priority</span>
                <p style={{ margin: "4px 0 0 0", fontWeight: 600, fontSize: "13px", textTransform: "capitalize" }}>
                  <span style={{
                    color: viewingTask.priority === "critical"
                      ? "#dc2626"
                      : viewingTask.priority === "high"
                      ? "#d97706"
                      : viewingTask.priority === "low"
                      ? "#64748b"
                      : "#2563eb"
                  }}>
                    ● {viewingTask.priority || "Medium"}
                  </span>
                </p>
              </div>

              <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px", backgroundColor: "#ffffff" }}>
                <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Trigger Schedule</span>
                <p style={{ margin: "4px 0 0 0", fontWeight: 600, color: "#0f172a", fontSize: "13px" }}>
                  {viewingTask.triggerConfig?.frequency ? viewingTask.triggerConfig.frequency.toUpperCase() : "DAILY"} at {viewingTask.triggerConfig?.triggerTime || "09:00"}
                </p>
              </div>

              <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px", backgroundColor: "#ffffff" }}>
                <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Attachment Proof</span>
                <p style={{ margin: "4px 0 0 0", fontWeight: 600, fontSize: "13px" }}>
                  {viewingTask.evidenceRequirementType === "mandatory" || viewingTask.evidenceRequirementType === "image" || viewingTask.evidenceRequirementType === "document" ? (
                    <span style={{ color: "#dc2626" }}>📸 Mandatory Proof</span>
                  ) : viewingTask.evidenceRequirementType === "none" ? (
                    <span style={{ color: "#64748b" }}>Disabled</span>
                  ) : (
                    <span style={{ color: "#2563eb" }}>📎 Optional (Default)</span>
                  )}
                </p>
              </div>

              <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px", backgroundColor: "#ffffff" }}>
                <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Supervisor Approval</span>
                <p style={{ margin: "4px 0 0 0", fontWeight: 600, fontSize: "13px" }}>
                  {viewingTask.requiresApproval ? (
                    <span style={{ color: "#d97706" }}>⚠️ Requires Sign-off</span>
                  ) : (
                    <span style={{ color: "#16a34a" }}>✓ Auto-Complete</span>
                  )}
                </p>
              </div>

              <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px", backgroundColor: "#ffffff" }}>
                <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Escalation Policy</span>
                <p style={{ margin: "4px 0 0 0", fontWeight: 600, color: "#2563eb", fontSize: "13px" }}>
                  {escalationRules.find((r) => r.id === viewingTask.escalationPolicyId)?.title || "Default SLA (60m)"}
                </p>
              </div>
            </div>

            {/* Checklist items list */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <h4 style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Configured Tasks &amp; Checklist Items ({Array.isArray(viewingTask.checklistConfig) ? viewingTask.checklistConfig.length : 0})
                </h4>
              </div>

              {Array.isArray(viewingTask.checklistConfig) && viewingTask.checklistConfig.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {viewingTask.checklistConfig.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      style={{
                        padding: "12px 14px",
                        borderRadius: "8px",
                        border: "1px solid #e2e8f0",
                        backgroundColor: "#ffffff",
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ width: "22px", height: "22px", borderRadius: "50%", backgroundColor: "#e2e8f0", color: "#475569", fontSize: "11px", fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                            {idx + 1}
                          </span>
                          <span style={{ fontWeight: 600, fontSize: "13px", color: "#0f172a" }}>
                            {item.title || "Untitled Checkpoint"}
                          </span>
                          {item.isRequired && (
                            <span style={{ fontSize: "10px", padding: "1px 6px", borderRadius: "4px", backgroundColor: "#fee2e2", color: "#b91c1c", fontWeight: 700 }}>
                              Mandatory
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: "11px", color: "#64748b", textTransform: "capitalize", backgroundColor: "#f1f5f9", padding: "2px 8px", borderRadius: "4px" }}>
                          Type: {item.inputType || "checkbox"}
                        </span>
                      </div>

                      {item.helpDescription && (
                        <div style={{ marginLeft: "30px", fontSize: "12px", color: "#475569", backgroundColor: "#eff6ff", padding: "6px 10px", borderRadius: "6px", borderLeft: "3px solid #3b82f6" }}>
                          <strong style={{ color: "#1d4ed8" }}>SOP Guidance: </strong>{item.helpDescription}
                        </div>
                      )}

                      {item.options && item.options.length > 0 && (
                        <div style={{ marginLeft: "30px", display: "flex", gap: "6px", marginTop: "2px" }}>
                          {item.options.map((opt, oIdx) => (
                            <span key={oIdx} style={{ fontSize: "11px", padding: "2px 8px", backgroundColor: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "4px", color: "#334155" }}>
                              {opt}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: "24px", textAlign: "center", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px dashed #cbd5e1", color: "#64748b", fontSize: "13px" }}>
                  This routine is configured as a simple standard sign-off without individual checkpoint questions.
                </div>
              )}
            </div>
          </div>
        </KalkiModal>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 4: AI & AUTOMATION FLOW INTELLIGENCE MODAL */}
      {/* ------------------------------------------------------------- */}
      {aiFlowTask && (
        <KalkiModal
          isOpen={!!aiFlowTask}
          onClose={() => setAiFlowTask(null)}
          title={
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ padding: "6px", borderRadius: "8px", backgroundColor: "#f5f3ff", color: "#7c3aed", display: "flex" }}>
                <Sparkles className="h-5 w-5" />
              </div>
              <span>Workflow &amp; AI Automation Flow</span>
            </div>
          }
          subtitle={`Visual Execution Pipeline • ${aiFlowTask.title}`}
          maxWidth="720px"
          footer={
            <div style={{ display: "flex", justifyContent: "flex-end", width: "100%" }}>
              <button
                type="button"
                onClick={() => setAiFlowTask(null)}
                className="kalki-button kalki-button--primary"
              >
                Got It
              </button>
            </div>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Automation Overview Card */}
            <div style={{ padding: "16px", borderRadius: "10px", backgroundColor: "#f5f3ff", border: "1px solid #ddd6fe" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Bot className="h-5 w-5" style={{ color: "#7c3aed" }} />
                  <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#5b21b6" }}>
                    Autonomous Routine Lifecycle
                  </h4>
                </div>
                {/* Live Pipeline Status Badge */}
                {(() => {
                  const inst = aiFlowTask.liveInstance;
                  if (!inst) {
                    return (
                      <span style={{ fontSize: "11px", fontWeight: 700, backgroundColor: "#f1f5f9", color: "#475569", padding: "3px 10px", borderRadius: "20px", display: "inline-flex", alignItems: "center", gap: "5px" }}>
                        <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#94a3b8" }}></span>
                        Status: Scheduled / Idle
                      </span>
                    );
                  }
                  if (inst.status === "completed") {
                    return (
                      <span style={{ fontSize: "11px", fontWeight: 700, backgroundColor: "#dcfce7", color: "#15803d", padding: "3px 10px", borderRadius: "20px", display: "inline-flex", alignItems: "center", gap: "5px" }}>
                        <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#16a34a" }}></span>
                        Status: Successfully Completed
                      </span>
                    );
                  }
                  if (inst.escalationLevel > 0) {
                    return (
                      <span style={{ fontSize: "11px", fontWeight: 700, backgroundColor: "#fee2e2", color: "#b91c1c", padding: "3px 10px", borderRadius: "20px", display: "inline-flex", alignItems: "center", gap: "5px" }}>
                        <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#dc2626" }}></span>
                        Status: Escalated (Level {inst.escalationLevel})
                      </span>
                    );
                  }
                  return (
                    <span style={{ fontSize: "11px", fontWeight: 700, backgroundColor: "#e0e7ff", color: "#4338ca", padding: "3px 10px", borderRadius: "20px", display: "inline-flex", alignItems: "center", gap: "5px" }}>
                      <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#4f46e5" }}></span>
                      Status: Active in Queue
                    </span>
                  );
                })()}
              </div>
              <p style={{ margin: 0, fontSize: "13px", color: "#4c1d95", lineHeight: 1.5 }}>
                This job is monitored continuously by Kalki BOS background automation engines. Here is the operational flow with live position markers tracking the current execution state.
              </p>
            </div>

            {/* Last Cycle Data Summary Card */}
            <div style={{
              backgroundColor: aiFlowTask.lastCycle ? "#f0fdf4" : "#f8fafc",
              border: aiFlowTask.lastCycle ? "1px solid #bbf7d0" : "1px solid #e2e8f0",
              borderRadius: "8px",
              padding: "12px 16px",
              marginBottom: "16px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <span style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: aiFlowTask.lastCycle ? "#15803d" : "#64748b" }}>
                  Last Cycle Execution Record
                </span>
                {aiFlowTask.lastCycle && (
                  <span style={{ fontSize: "11px", fontWeight: 600, color: "#16a34a", backgroundColor: "#dcfce7", padding: "2px 8px", borderRadius: "12px" }}>
                    ✓ Completed Cycle
                  </span>
                )}
              </div>
              {aiFlowTask.lastCycle ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "10px", fontSize: "12px" }}>
                  <div>
                    <span style={{ color: "#64748b", display: "block", fontSize: "11px" }}>Completed Date</span>
                    <strong style={{ color: "#0f172a" }}>
                      {aiFlowTask.lastCycle.completedAt ? new Date(aiFlowTask.lastCycle.completedAt).toLocaleString() : "N/A"}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: "#64748b", display: "block", fontSize: "11px" }}>Executed By</span>
                    <strong style={{ color: "#0f172a" }}>
                      {aiFlowTask.lastCycle.actorName || "Staff"}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: "#64748b", display: "block", fontSize: "11px" }}>Score &amp; SLA</span>
                    <strong style={{ color: "#0f172a" }}>
                      {aiFlowTask.lastCycle.scoreSnapshot?.scorePercent ? `${aiFlowTask.lastCycle.scoreSnapshot.scorePercent}%` : "100%"}
                      {" · "}
                      <span style={{ color: aiFlowTask.lastCycle.scoreSnapshot?.slaStatus === "BREACHED" ? "#dc2626" : "#16a34a" }}>
                        {aiFlowTask.lastCycle.scoreSnapshot?.slaStatus || "ON_TIME"}
                      </span>
                    </strong>
                  </div>
                  {aiFlowTask.lastCycle.completionProofUrl && (
                    <div>
                      <span style={{ color: "#64748b", display: "block", fontSize: "11px" }}>Proof Attachment</span>
                      <a
                        href={aiFlowTask.lastCycle.completionProofUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "#2563eb", fontWeight: 600, textDecoration: "underline" }}
                      >
                        View Attachment ↗
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: "12px", color: "#64748b" }}>
                  No prior completed cycles on record. Waiting for next automated or manual trigger.
                </div>
              )}
            </div>

            {/* Visual Step-by-Step Flow Pipeline */}
            {(() => {
              const live = aiFlowTask.liveInstance;
              const last = aiFlowTask.lastCycle;

              // Determine which stage is currently active:
              // - If there is an active pending/in-progress instance:
              //     - Stage 2: In employee queue (escalationLevel === 0)
              //     - Stage 3: Escalated (escalationLevel > 0)
              // - If no active pending instance exists:
              //     - If the cycle was completed (last exists and no pending run):
              //         Stage 4: Completed & Audited
              //     - Otherwise, Stage 1: Waiting for Next Trigger
              let currentStageNumber = 1;
              if (live) {
                if (live.escalationLevel > 0) {
                  currentStageNumber = 3;
                } else if (live.status === "pending" || live.status === "in_progress") {
                  currentStageNumber = 2;
                }
              } else if (last && last.status === "completed") {
                currentStageNumber = 4;
              }

              return (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", position: "relative" }}>
                  {/* Step 1: Trigger */}
                  <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        backgroundColor: currentStageNumber === 1 ? "#2563eb" : "#dbeafe",
                        color: currentStageNumber === 1 ? "#ffffff" : "#2563eb",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: "13px",
                        boxShadow: currentStageNumber === 1 ? "0 0 0 4px #bfdbfe" : undefined,
                      }}>
                        1
                      </div>
                      <div style={{ width: "2px", height: "42px", backgroundColor: currentStageNumber > 1 ? "#3b82f6" : "#cbd5e1", marginTop: "4px" }}></div>
                    </div>
                    <div style={{
                      flex: 1,
                      backgroundColor: "#ffffff",
                      border: currentStageNumber === 1 ? "2px solid #3b82f6" : "1px solid #e2e8f0",
                      borderRadius: "8px",
                      padding: "12px 14px",
                      boxShadow: currentStageNumber === 1 ? "0 2px 6px rgba(37, 99, 235, 0.08)" : undefined,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontWeight: 700, fontSize: "14px", color: "#0f172a" }}>Automated Trigger &amp; Dispatch</span>
                          {currentStageNumber === 1 && (
                            <span style={{ fontSize: "10px", fontWeight: 700, backgroundColor: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", padding: "1px 7px", borderRadius: "12px" }}>
                              ● Current Stage: Next Trigger Cycle
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: "11px", fontWeight: 700, backgroundColor: "#eff6ff", color: "#1d4ed8", padding: "2px 8px", borderRadius: "4px" }}>
                          Cron / Event Engine
                        </span>
                      </div>
                      <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                        Fires according to schedule ({aiFlowTask.triggerConfig?.frequency || "daily"} at {aiFlowTask.triggerConfig?.triggerTime || "09:00"}). Dispatches to assigned role: <strong>{roles.find((r) => r.id === aiFlowTask.targetRoleId)?.name || "General Staff"}</strong> with tone alert <em>{aiFlowTask.triggerConfig?.reminderTone || "Level 1"}</em>.
                      </div>
                    </div>
                  </div>

                  {/* Step 2: Employee Execution */}
                  <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        backgroundColor: currentStageNumber === 2 ? "#4f46e5" : "#e0e7ff",
                        color: currentStageNumber === 2 ? "#ffffff" : "#4f46e5",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: "13px",
                        boxShadow: currentStageNumber === 2 ? "0 0 0 4px #c7d2fe" : undefined,
                      }}>
                        2
                      </div>
                      <div style={{ width: "2px", height: "42px", backgroundColor: currentStageNumber > 2 ? "#6366f1" : "#cbd5e1", marginTop: "4px" }}></div>
                    </div>
                    <div style={{
                      flex: 1,
                      backgroundColor: "#ffffff",
                      border: currentStageNumber === 2 ? "2px solid #6366f1" : "1px solid #e2e8f0",
                      borderRadius: "8px",
                      padding: "12px 14px",
                      boxShadow: currentStageNumber === 2 ? "0 2px 6px rgba(99, 102, 241, 0.08)" : undefined,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontWeight: 700, fontSize: "14px", color: "#0f172a" }}>Employee Operational Task</span>
                          {currentStageNumber === 2 && (
                            <span style={{ fontSize: "10px", fontWeight: 700, backgroundColor: "#eef2ff", color: "#4338ca", border: "1px solid #c7d2fe", padding: "1px 7px", borderRadius: "12px" }}>
                              ● Current Position: Active in Employee Queue
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: "11px", fontWeight: 700, backgroundColor: "#eef2ff", color: "#4338ca", padding: "2px 8px", borderRadius: "4px" }}>
                          Queue Execution
                        </span>
                      </div>
                      <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                        Employee performs actions in <strong>Routines &amp; Queue</strong> (or linked module like Stock Assessment / Purchase Order). Checklist questions must be answered, and SOP verified before submission.
                      </div>
                    </div>
                  </div>

                  {/* Step 3: SLA Countdown & Auto-Escalation Engine */}
                  <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        backgroundColor: currentStageNumber === 3 ? "#d97706" : "#fef3c7",
                        color: currentStageNumber === 3 ? "#ffffff" : "#d97706",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: "13px",
                        boxShadow: currentStageNumber === 3 ? "0 0 0 4px #fde68a" : undefined,
                      }}>
                        3
                      </div>
                      <div style={{ width: "2px", height: "42px", backgroundColor: currentStageNumber > 3 ? "#f59e0b" : "#cbd5e1", marginTop: "4px" }}></div>
                    </div>
                    <div style={{
                      flex: 1,
                      backgroundColor: "#ffffff",
                      border: currentStageNumber === 3 ? "2px solid #f59e0b" : "1px solid #e2e8f0",
                      borderRadius: "8px",
                      padding: "12px 14px",
                      boxShadow: currentStageNumber === 3 ? "0 2px 6px rgba(217, 119, 6, 0.08)" : undefined,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontWeight: 700, fontSize: "14px", color: "#0f172a" }}>SLA Monitoring &amp; Auto-Escalation</span>
                          {currentStageNumber === 3 && (
                            <span style={{ fontSize: "10px", fontWeight: 700, backgroundColor: "#fffbeb", color: "#b45309", border: "1px solid #fde68a", padding: "1px 7px", borderRadius: "12px" }}>
                              ● Current Position: Escalated to Manager
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: "11px", fontWeight: 700, backgroundColor: "#fffbeb", color: "#b45309", padding: "2px 8px", borderRadius: "4px" }}>
                          Sweeper Engine
                        </span>
                      </div>
                      <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                        {(() => {
                          const rule = escalationRules.find((r) => r.id === aiFlowTask.escalationPolicyId);
                          if (rule) {
                            return `Target completion: ${rule.completionTimeMins} mins. Warning chime triggers at ${rule.warningThresholdMins || 10} mins remaining. If unfulfilled, auto-escalates along hierarchy (${rule.escalationLevels?.length || 1} level).`;
                          }
                          return "Default SLA window (60 mins). Pre-deadline warning alert chimes 10 mins prior to overdue.";
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Step 4: Verification & Sign-off */}
                  <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        backgroundColor: currentStageNumber === 4 ? "#16a34a" : aiFlowTask.requiresApproval ? "#fef2f2" : "#dcfce7",
                        color: currentStageNumber === 4 ? "#ffffff" : aiFlowTask.requiresApproval ? "#dc2626" : "#16a34a",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: "13px",
                        boxShadow: currentStageNumber === 4 ? "0 0 0 4px #bbf7d0" : undefined,
                      }}>
                        4
                      </div>
                    </div>
                    <div style={{
                      flex: 1,
                      backgroundColor: "#ffffff",
                      border: currentStageNumber === 4 ? "2px solid #22c55e" : "1px solid #e2e8f0",
                      borderRadius: "8px",
                      padding: "12px 14px",
                      boxShadow: currentStageNumber === 4 ? "0 2px 6px rgba(22, 163, 74, 0.08)" : undefined,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontWeight: 700, fontSize: "14px", color: "#0f172a" }}>
                            {aiFlowTask.requiresApproval ? "Supervisor Audit & Sign-off" : "Instant Verification & Completion"}
                          </span>
                          {currentStageNumber === 4 && (
                            <span style={{ fontSize: "10px", fontWeight: 700, backgroundColor: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0", padding: "1px 7px", borderRadius: "12px" }}>
                              ● Current Stage: Complete &amp; Audited
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: "11px", fontWeight: 700, backgroundColor: aiFlowTask.requiresApproval ? "#fee2e2" : "#f0fdf4", color: aiFlowTask.requiresApproval ? "#991b1b" : "#166534", padding: "2px 8px", borderRadius: "4px" }}>
                          {aiFlowTask.requiresApproval ? "Two-Tier Approval" : "Direct Completion"}
                        </span>
                      </div>
                      <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                        {aiFlowTask.requiresApproval
                          ? "Routes directly to the supervisor in 'Supervisor Audit' tab. The supervisor can inspect submitted photos/checklist and Approve or Return for correction."
                          : "Task clears automatically upon employee submission and records into History & Compliance audit logs."}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </KalkiModal>
      )}
    </div>
  );
}
