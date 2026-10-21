import { db } from "@/db";
import { purchaseSchedules, vendors, businessRoles, locations, taskInstances } from "@/db/schema";
import { eq, desc, isNotNull, sql } from "drizzle-orm";
import Link from "next/link";
import { Plus, Clock, MapPin, Users, CheckCircle2, AlertCircle, ArrowRight, PlayCircle, Edit2, Shield, GitMerge } from "lucide-react";
import { ItemClassificationManager } from "@/components/purchasing/ItemClassificationManager";
import { PurchaseRoutingConfigPanel } from "@/components/purchasing/PurchaseRoutingConfigPanel";
import { RecentExecutionAuditLog } from "@/components/purchasing/RecentExecutionAuditLog";

export default async function ConfigurationPage({ searchParams }: { searchParams: Promise<{ organizationId?: string; locationId?: string }> }) {
  const resolvedParams = await searchParams;
  const queryString = new URLSearchParams(resolvedParams as any).toString();
  const querySuffix = queryString ? `?${queryString}` : '';

  const schedules = await db
    .select({
      id: purchaseSchedules.id,
      frequencyRule: purchaseSchedules.frequencyRule,
      reminderTime: purchaseSchedules.reminderTime,
      isActive: purchaseSchedules.isActive,
      priority: purchaseSchedules.priority,
      vendorName: vendors.name,
      locationName: locations.name,
      roleName: businessRoles.name,
    })
    .from(purchaseSchedules)
    .leftJoin(vendors, eq(purchaseSchedules.vendorId, vendors.id))
    .leftJoin(locations, eq(purchaseSchedules.locationId, locations.id))
    .leftJoin(businessRoles, eq(purchaseSchedules.responsibleRoleId, businessRoles.id))
    .orderBy(desc(purchaseSchedules.createdAt));

  const formatFrequency = (rule: string) => {
    if (rule.startsWith("WEEKLY:")) {
      const day = rule.split(":")[1];
      return `Weekly on ${day.charAt(0) + day.slice(1).toLowerCase()}`;
    }
    if (rule.startsWith("BIWEEKLY:")) {
      const day = rule.split(":")[1];
      return `Bi-weekly on ${day.charAt(0) + day.slice(1).toLowerCase()}`;
    }
    if (rule.startsWith("MONTHLY:")) {
      const day = rule.split(":")[1];
      const suffix = (day === '1' || day === '21' || day === '31') ? 'st' : (day === '2' || day === '22') ? 'nd' : (day === '3' || day === '23') ? 'rd' : 'th';
      return `Monthly on the ${day}${suffix}`;
    }
    return rule.charAt(0) + rule.slice(1).toLowerCase();
  };

  const now = new Date();
  // Ensure calendar day boundaries and timestamps are strictly aligned to Indian Standard Time (IST)
  const istDateStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(now);
  const startOfToday = new Date(`${istDateStr}T00:00:00+05:30`);
  const endOfToday = new Date(`${istDateStr}T23:59:59.999+05:30`);

  // Fetch recent tasks linked to any schedule
  const recentTasks = await db
    .select({
      id: taskInstances.id,
      scheduleId: sql<string>`${taskInstances.contextData}->>'scheduleId'`,
      status: taskInstances.status,
      dueAt: taskInstances.dueAt,
      completedAt: taskInstances.completedAt,
      createdAt: taskInstances.createdAt,
      contextData: taskInstances.contextData,
      roleName: businessRoles.name,
    })
    .from(taskInstances)
    .leftJoin(businessRoles, eq(taskInstances.assignedRoleId, businessRoles.id))
    .where(isNotNull(sql`${taskInstances.contextData}->>'scheduleId'`))
    .orderBy(desc(taskInstances.createdAt))
    .limit(20);

  // Map today's execution status vs last recorded execution
  const statusMap = new Map<string, {
    status: "completed" | "audit_pending" | "in_progress" | "missed" | "pending" | "scheduled_today" | "none";
    isToday: boolean;
    lastRunDate?: Date | null;
  }>();
  
  for (const s of schedules) {
    const taskToday = recentTasks.find(t => t.scheduleId === s.id && new Date(t.createdAt) >= startOfToday && new Date(t.createdAt) <= endOfToday);
    const latestTaskAny = recentTasks.find(t => t.scheduleId === s.id);

    if (taskToday) {
      if (taskToday.status === "completed") {
        statusMap.set(s.id, { status: "completed", isToday: true, lastRunDate: taskToday.completedAt || taskToday.createdAt });
      } else if (taskToday.status === "audit_pending") {
        statusMap.set(s.id, { status: "audit_pending", isToday: true, lastRunDate: taskToday.createdAt });
      } else if (taskToday.status === "in_progress") {
        statusMap.set(s.id, { status: "in_progress", isToday: true, lastRunDate: taskToday.createdAt });
      } else if (taskToday.status === "pending" && taskToday.dueAt && new Date(taskToday.dueAt) < now) {
        statusMap.set(s.id, { status: "missed", isToday: true, lastRunDate: taskToday.createdAt });
      } else {
        statusMap.set(s.id, { status: "pending", isToday: true, lastRunDate: taskToday.createdAt });
      }
    } else if (latestTaskAny) {
      // No run today, but has historical execution
      statusMap.set(s.id, { status: "scheduled_today", isToday: false, lastRunDate: latestTaskAny.completedAt || latestTaskAny.createdAt });
    } else {
      statusMap.set(s.id, { status: "none", isToday: false });
    }
  }

  return (
    <div className="stack">
      <section className="panel">
        <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2>Configuration</h2>
            <p className="muted">Purchasing module configuration.</p>
          </div>
        </div>
        
        <div style={{ padding: "1.5rem" }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.25rem 0' }}>Routine Automations</h3>
              <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
                Manage scheduled purchasing tasks and monitor their execution status.
              </p>
            </div>
            <Link 
              href={`/purchasing/schedules/new${querySuffix}`}
              className="kalki-button primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
            >
              <Plus size={16} /> Create Routine Task
            </Link>
          </div>

          {schedules.length === 0 ? (
            <div style={{ padding: '2.5rem', textAlign: 'center', border: '1px dashed var(--border-color)', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
              <Clock size={28} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
              <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>No Routine Automations Configured</h4>
              <p className="muted" style={{ margin: '0 0 1rem 0', fontSize: '0.85rem' }}>You haven't configured any routine purchasing tasks yet. Automate daily orders to save time.</p>
              <Link href={`/purchasing/schedules/new${querySuffix}`} style={{ fontSize: '0.85rem', color: '#2563eb', textDecoration: 'none', fontWeight: '600' }}>
                Create your first routine task &rarr;
              </Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
              {schedules.map((schedule) => {
                const statusInfo = statusMap.get(schedule.id);
                const isCritical = schedule.priority === 'critical' || schedule.priority === 'high';
                const isMedium = schedule.priority === 'medium';
                
                return (
                  <div 
                    key={schedule.id} 
                    style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      borderRadius: '10px', 
                      border: '1px solid #e2e8f0', 
                      backgroundColor: 'white', 
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                      overflow: 'hidden' 
                    }}
                  >
                    <div style={{ padding: '1.25rem', flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                        <div style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '5px', 
                          backgroundColor: '#f1f5f9', 
                          color: '#334155', 
                          padding: '3px 10px', 
                          borderRadius: '999px', 
                          fontSize: '0.75rem', 
                          fontWeight: '600' 
                        }}>
                          <Clock size={12} style={{ color: '#2563eb' }} />
                          {formatFrequency(schedule.frequencyRule)} at {schedule.reminderTime}
                        </div>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          {schedule.priority && (
                            <span style={{ 
                              fontSize: '0.6875rem', 
                              fontWeight: '700', 
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              backgroundColor: isCritical ? '#fee2e2' : isMedium ? '#fef3c7' : '#f1f5f9',
                              color: isCritical ? '#dc2626' : isMedium ? '#d97706' : '#64748b',
                            }}>
                              {schedule.priority}
                            </span>
                          )}
                          <Link 
                            href={`/purchasing/schedules/${schedule.id}${querySuffix}`} 
                            style={{ 
                              padding: '5px', 
                              color: '#64748b', 
                              backgroundColor: '#f8fafc', 
                              border: '1px solid #e2e8f0', 
                              borderRadius: '5px', 
                              display: 'flex',
                              alignItems: 'center',
                              textDecoration: 'none'
                            }} 
                            title="Edit Configuration"
                          >
                            <Edit2 size={13} />
                          </Link>
                        </div>
                      </div>
                      
                      <h4 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {schedule.vendorName || "Unknown Vendor"}
                      </h4>
                      
                      <p style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.775rem', color: '#64748b', margin: '0 0 16px 0' }}>
                        <MapPin size={13} style={{ color: '#94a3b8' }} /> {schedule.locationName || "All Locations"}
                      </p>

                      <div style={{ 
                        backgroundColor: '#f8fafc', 
                        borderRadius: '8px', 
                        padding: '10px 12px', 
                        border: '1px solid #e2e8f0' 
                      }}>
                        <p style={{ fontSize: '0.675rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px 0' }}>
                          Responsible Team
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ 
                            backgroundColor: '#ffffff', 
                            padding: '5px', 
                            borderRadius: '6px', 
                            border: '1px solid #e2e8f0',
                            color: '#2563eb',
                            display: 'flex'
                          }}>
                            <Users size={13} />
                          </div>
                          <span style={{ fontSize: '0.8125rem', fontWeight: '600', color: '#1e293b' }}>
                            {schedule.roleName || "Unassigned"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ 
                      borderTop: '1px solid #e2e8f0', 
                      padding: '10px 16px', 
                      backgroundColor: '#f8fafc',
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between' 
                    }}>
                      <span style={{ fontSize: '0.725rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Today's Status
                      </span>
                      {statusInfo?.status === "completed" && statusInfo.isToday && (
                        <span style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '4px', 
                          fontSize: '0.725rem', 
                          fontWeight: '700', 
                          color: '#16a34a', 
                          backgroundColor: '#dcfce7', 
                          padding: '3px 8px', 
                          borderRadius: '5px', 
                          border: '1px solid #bbf7d0' 
                        }}>
                          <CheckCircle2 size={12} /> Completed Today
                        </span>
                      )}
                      {statusInfo?.status === "missed" && (
                        <span style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '4px', 
                          fontSize: '0.725rem', 
                          fontWeight: '700', 
                          color: '#dc2626', 
                          backgroundColor: '#fee2e2', 
                          padding: '3px 8px', 
                          borderRadius: '5px', 
                          border: '1px solid #fecaca' 
                        }}>
                          <AlertCircle size={12} /> Missed Today
                        </span>
                      )}
                      {statusInfo?.status === "audit_pending" && (
                        <span style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '4px', 
                          fontSize: '0.725rem', 
                          fontWeight: '700', 
                          color: '#c2410c', 
                          backgroundColor: '#ffedd5', 
                          padding: '3px 8px', 
                          borderRadius: '5px', 
                          border: '1px solid #fed7aa' 
                        }}>
                          <AlertCircle size={12} /> Audit Pending
                        </span>
                      )}
                      {statusInfo?.status === "in_progress" && (
                        <span style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '4px', 
                          fontSize: '0.725rem', 
                          fontWeight: '700', 
                          color: '#2563eb', 
                          backgroundColor: '#eff6ff', 
                          padding: '3px 8px', 
                          borderRadius: '5px', 
                          border: '1px solid #bfdbfe' 
                        }}>
                          <PlayCircle size={12} /> In Progress
                        </span>
                      )}
                      {statusInfo?.status === "pending" && (
                        <span style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '4px', 
                          fontSize: '0.725rem', 
                          fontWeight: '700', 
                          color: '#d97706', 
                          backgroundColor: '#fef3c7', 
                          padding: '3px 8px', 
                          borderRadius: '5px', 
                          border: '1px solid #fde68a' 
                        }}>
                          <Clock size={12} /> Pending Run
                        </span>
                      )}
                      {statusInfo?.status === "scheduled_today" && (
                        <span style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '4px', 
                          fontSize: '0.725rem', 
                          fontWeight: '600', 
                          color: '#475569', 
                          backgroundColor: '#f1f5f9', 
                          padding: '3px 8px', 
                          borderRadius: '5px', 
                          border: '1px solid #e2e8f0' 
                        }} title={statusInfo.lastRunDate ? `Last run: ${new Date(statusInfo.lastRunDate).toLocaleDateString()}` : undefined}>
                          <Clock size={12} style={{ color: '#64748b' }} /> Scheduled at {schedule.reminderTime}
                        </span>
                      )}
                      {(!statusInfo || statusInfo?.status === "none") && (
                        <span style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '4px', 
                          fontSize: '0.725rem', 
                          fontWeight: '600', 
                          color: '#64748b', 
                          backgroundColor: '#f1f5f9', 
                          padding: '3px 8px', 
                          borderRadius: '5px', 
                          border: '1px solid #e2e8f0' 
                        }}>
                          No Runs Yet
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Recent Automation Execution History */}
          <div style={{ marginTop: '2rem', borderTop: '1px solid #edf2f7', paddingTop: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' }}>
                  Recent Execution Audit Log
                </h4>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                  Real-time log of automated procurement assessments, task triggers, and manager audit escalations.
                </p>
              </div>
              <Link 
                href={`/purchasing/reports?type=routine_automations${querySuffix}`}
                style={{ 
                  fontSize: '0.8125rem', 
                  fontWeight: '600', 
                  color: '#2563eb', 
                  textDecoration: 'none', 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '4px' 
                }}
              >
                <span>View Full History</span>
                <ArrowRight size={13} />
              </Link>
            </div>

            <RecentExecutionAuditLog 
              tasks={recentTasks.slice(0, 5)} 
              nowIso={now.toISOString()} 
            />
          </div>
        </div>

        {/* Approval Routing Rules Section */}
        <div style={{ padding: "1.5rem", borderTop: "1px solid var(--border-color)" }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.25rem 0' }}>Approval Routing Rules</h3>
              <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
                Define condition-based rules to route Purchase Orders to the correct approver (e.g., limits above ₹10,000).
              </p>
            </div>
            <Link 
              href={`/purchasing/configuration/routing/new${querySuffix}`}
              className="kalki-button secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
            >
              <Plus size={16} /> Create Rule
            </Link>
          </div>
          
          <div style={{ padding: '2rem', textAlign: 'center', border: '1px dashed var(--border-color)', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
            <GitMerge size={24} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
            <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>No Routing Rules Configured</h4>
            <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
              All purchase orders are currently being routed to the default manager. Configure rules to change this behavior.
            </p>
          </div>
        </div>

        {/* Escalation Policies Section */}
        <div style={{ padding: "1.5rem", borderTop: "1px solid var(--border-color)" }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.25rem 0' }}>Escalation Policies</h3>
              <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
                Set up automated alerts for missed tasks or stalled approvals to ensure timely action.
              </p>
            </div>
            <Link 
              href={`/purchasing/configuration/escalation/new${querySuffix}`}
              className="kalki-button secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
            >
              <Plus size={16} /> Create Policy
            </Link>
          </div>
          
          <div style={{ padding: '2rem', textAlign: 'center', border: '1px dashed var(--border-color)', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
            <Shield size={24} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
            <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>No Escalation Policies Configured</h4>
            <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
              Missed tasks will not trigger automated escalations. Configure policies to notify managers of delays.
            </p>
          </div>
        </div>

        {/* Post-Receiving Workflow Configuration */}
        <div style={{ padding: "1.5rem", borderTop: "1px solid var(--border-color)" }}>
          <PurchaseRoutingConfigPanel 
            organizationId={resolvedParams.organizationId || ""} 
            locationId={resolvedParams.locationId || ""} 
          />
        </div>

        {/* Item Classification Manager */}
        <div style={{ padding: "1.5rem", borderTop: "1px solid var(--border-color)" }}>
          <ItemClassificationManager />
        </div>

      </section>
    </div>
  );
}
