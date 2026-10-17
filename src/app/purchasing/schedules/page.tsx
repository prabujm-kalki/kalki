import { db } from "@/db";
import { purchaseSchedules, vendors, businessRoles, locations, taskInstances } from "@/db/schema";
import { eq, desc, isNotNull, sql, and } from "drizzle-orm";
import Link from "next/link";
import { 
  Plus, 
  Clock, 
  MapPin, 
  Users, 
  Store, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  PlayCircle, 
  Edit2, 
  Calendar,
  Sparkles,
  ShieldCheck,
  Receipt
} from "lucide-react";

export default async function SchedulesListPage({ searchParams }: { searchParams: Promise<{ organizationId?: string; locationId?: string }> }) {
  const resolvedParams = await searchParams;
  const queryString = new URLSearchParams(resolvedParams as any).toString();
  const querySuffix = queryString ? `?${queryString}` : '';

  const orgId = resolvedParams.organizationId;
  const locId = resolvedParams.locationId;

  const conditions = [];
  if (orgId) conditions.push(eq(purchaseSchedules.organizationId, orgId));
  if (locId) conditions.push(eq(purchaseSchedules.locationId, locId));

  // Alias joins for responsible, review, and bill review roles
  const respRole = db.$with("resp_role").as(
    db.select({ id: businessRoles.id, name: businessRoles.name }).from(businessRoles)
  );

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
      createdAt: purchaseSchedules.createdAt,
    })
    .from(purchaseSchedules)
    .leftJoin(vendors, eq(purchaseSchedules.vendorId, vendors.id))
    .leftJoin(locations, eq(purchaseSchedules.locationId, locations.id))
    .leftJoin(businessRoles, eq(purchaseSchedules.responsibleRoleId, businessRoles.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(purchaseSchedules.createdAt));

  const formatFrequency = (rule: string) => {
    if (rule.startsWith("WEEKLY:")) {
      const day = rule.split(":")[1];
      return `Weekly • ${day.charAt(0) + day.slice(1).toLowerCase()}`;
    }
    if (rule.startsWith("BIWEEKLY:")) {
      const day = rule.split(":")[1];
      return `Bi-Weekly • ${day.charAt(0) + day.slice(1).toLowerCase()}`;
    }
    if (rule.startsWith("MONTHLY:")) {
      const day = rule.split(":")[1];
      const suffix = (day === '1' || day === '21' || day === '31') ? 'st' : (day === '2' || day === '22') ? 'nd' : (day === '3' || day === '23') ? 'rd' : 'th';
      return `Monthly • ${day}${suffix}`;
    }
    return `Daily`;
  };

  // Fetch real task instances for each schedule to determine status
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const recentTasks = await db
    .select({
      id: taskInstances.id,
      scheduleId: sql<string>`${taskInstances.contextData}->>'scheduleId'`,
      status: taskInstances.status,
      dueAt: taskInstances.dueAt,
      completedAt: taskInstances.completedAt,
      createdAt: taskInstances.createdAt
    })
    .from(taskInstances)
    .where(isNotNull(sql`${taskInstances.contextData}->>'scheduleId'`))
    .orderBy(desc(taskInstances.createdAt));

  const statusMap = new Map<string, { status: "pending" | "in_progress" | "audit_pending" | "completed" | "missed" | "scheduled_today" | "none"; isToday: boolean; date?: Date | null }>();
  
  for (const s of schedules) {
    const taskToday = recentTasks.find(t => t.scheduleId === s.id && new Date(t.createdAt) >= startOfToday && new Date(t.createdAt) <= endOfToday);
    const latestTaskAny = recentTasks.find(t => t.scheduleId === s.id);

    if (taskToday) {
      if (taskToday.status === "completed") {
        statusMap.set(s.id, { status: "completed", isToday: true, date: taskToday.completedAt || taskToday.createdAt });
      } else if (taskToday.status === "audit_pending") {
        statusMap.set(s.id, { status: "audit_pending", isToday: true, date: taskToday.dueAt });
      } else if (taskToday.status === "in_progress") {
        statusMap.set(s.id, { status: "in_progress", isToday: true, date: taskToday.dueAt });
      } else if (taskToday.status === "pending" && taskToday.dueAt && new Date(taskToday.dueAt) < now) {
        statusMap.set(s.id, { status: "missed", isToday: true, date: taskToday.dueAt });
      } else {
        statusMap.set(s.id, { status: "pending", isToday: true, date: taskToday.dueAt });
      }
    } else if (latestTaskAny) {
      statusMap.set(s.id, { status: "scheduled_today", isToday: false, date: latestTaskAny.completedAt || latestTaskAny.createdAt });
    } else {
      statusMap.set(s.id, { status: "none", isToday: false });
    }
  }

  const activeCount = schedules.filter(s => s.isActive).length;
  const completedCount = schedules.filter(s => statusMap.get(s.id)?.status === "completed" && statusMap.get(s.id)?.isToday).length;
  const pendingCount = schedules.filter(s => {
    const st = statusMap.get(s.id)?.status;
    return st === "pending" || st === "in_progress" || st === "audit_pending";
  }).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '0 0.25rem' }}>
      
      {/* Premium Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        padding: '1.25rem 1.5rem',
        backgroundColor: '#ffffff',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              width: '32px', 
              height: '32px', 
              borderRadius: '8px', 
              backgroundColor: '#eff6ff', 
              color: '#2563eb' 
            }}>
              <Calendar size={18} />
            </span>
            <h1 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
              Routine Automations
            </h1>
          </div>
          <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: '6px 0 0 0' }}>
            Automated recurring purchasing assessments, periodic vendor orders, and workflow schedules.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Link 
            href={`/purchasing/schedules/new${querySuffix}`}
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px', 
              fontSize: '0.8125rem', 
              fontWeight: '600', 
              padding: '8px 16px', 
              backgroundColor: '#2563eb', 
              color: '#ffffff', 
              borderRadius: '6px', 
              textDecoration: 'none',
              boxShadow: '0 1px 2px rgba(37,99,235,0.2)',
              transition: 'background-color 0.15s ease'
            }}
          >
            <Plus size={15} /> Create Routine Task
          </Link>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div style={{ 
          padding: '1rem 1.25rem', 
          backgroundColor: '#ffffff', 
          borderRadius: '8px', 
          border: '1px solid #e2e8f0',
          display: 'flex', 
          flexDirection: 'column',
          gap: '4px'
        }}>
          <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Active Automations
          </span>
          <span style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a' }}>
            {activeCount}
          </span>
        </div>

        <div style={{ 
          padding: '1rem 1.25rem', 
          backgroundColor: '#ffffff', 
          borderRadius: '8px', 
          border: '1px solid #e2e8f0',
          display: 'flex', 
          flexDirection: 'column',
          gap: '4px'
        }}>
          <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Pending Runs Today
          </span>
          <span style={{ fontSize: '1.5rem', fontWeight: '700', color: '#d97706' }}>
            {pendingCount}
          </span>
        </div>

        <div style={{ 
          padding: '1rem 1.25rem', 
          backgroundColor: '#ffffff', 
          borderRadius: '8px', 
          border: '1px solid #e2e8f0',
          display: 'flex', 
          flexDirection: 'column',
          gap: '4px'
        }}>
          <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Completed Executions
          </span>
          <span style={{ fontSize: '1.5rem', fontWeight: '700', color: '#16a34a' }}>
            {completedCount}
          </span>
        </div>
      </div>

      {/* Card Grid / Empty State */}
      {schedules.length === 0 ? (
        <div style={{ 
          padding: '3.5rem 2rem', 
          textAlign: 'center', 
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          border: '1px dashed #cbd5e1',
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center' 
        }}>
          <div style={{ backgroundColor: '#eff6ff', padding: '16px', borderRadius: '50%', marginBottom: '14px', color: '#2563eb' }}>
            <Clock size={32} />
          </div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#0f172a', margin: '0 0 6px 0' }}>
            No Routine Automations Configured
          </h3>
          <p style={{ color: '#64748b', marginBottom: '20px', maxWidth: '360px', fontSize: '0.85rem', lineHeight: '1.4' }}>
            You haven't scheduled any routine purchasing assessments yet. Automate daily vegetable, dairy, or pantry orders to streamline operations.
          </p>
          <Link 
            href={`/purchasing/schedules/new${querySuffix}`} 
            style={{ 
              fontSize: '0.85rem', 
              fontWeight: '600', 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px',
              padding: '8px 18px',
              backgroundColor: '#2563eb',
              color: 'white',
              borderRadius: '6px',
              textDecoration: 'none'
            }}
          >
            <Plus size={16} /> Configure First Routine Task
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
          {schedules.map((schedule) => {
            const statusInfo = statusMap.get(schedule.id) || { status: "none" };
            const statusType = statusInfo.status;
            
            const isCritical = schedule.priority === 'critical' || schedule.priority === 'high';
            const isMedium = schedule.priority === 'medium';

            return (
              <div 
                key={schedule.id} 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  backgroundColor: '#ffffff', 
                  borderRadius: '10px', 
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
                  overflow: 'hidden'
                }}
              >
                <div style={{ flex: 1, padding: '1.25rem' }}>
                  {/* Card Header Tag & Priority */}
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
                  
                  {/* Vendor & Location */}
                  <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' }}>
                    {schedule.vendorName || "Unknown Vendor"}
                  </h3>
                  <p style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.775rem', color: '#64748b', margin: '0 0 16px 0' }}>
                    <MapPin size={13} style={{ color: '#94a3b8' }} /> {schedule.locationName || "All Locations"}
                  </p>

                  {/* Responsible Team Capsule */}
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

                {/* Card Footer: Status Bar */}
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
                  
                  {statusInfo.status === "completed" && statusInfo.isToday && (
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

                  {statusInfo.status === "missed" && (
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

                  {statusInfo.status === "audit_pending" && (
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

                  {statusInfo.status === "in_progress" && (
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

                  {statusInfo.status === "pending" && (
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

                  {statusInfo.status === "scheduled_today" && (
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
                    }} title={statusInfo.date ? `Last run: ${new Date(statusInfo.date).toLocaleDateString()}` : undefined}>
                      <Clock size={12} style={{ color: '#64748b' }} /> Scheduled at {schedule.reminderTime}
                    </span>
                  )}

                  {statusInfo.status === "none" && (
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
    </div>
  );
}

