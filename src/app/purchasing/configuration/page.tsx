import { db } from "@/db";
import { purchaseSchedules, vendors, businessRoles, locations, taskInstances } from "@/db/schema";
import { eq, desc, isNotNull, sql } from "drizzle-orm";
import Link from "next/link";
import { Plus, Clock, MapPin, Users, CheckCircle2, AlertCircle, ArrowRight, PlayCircle, Edit2, Shield, GitMerge } from "lucide-react";
import { ItemClassificationManager } from "@/components/purchasing/ItemClassificationManager";
import { PurchaseRoutingConfigPanel } from "@/components/purchasing/PurchaseRoutingConfigPanel";

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

  const recentTasks = await db
    .select({
      scheduleId: sql<string>`${taskInstances.contextData}->>'scheduleId'`,
      status: taskInstances.status,
      dueAt: taskInstances.dueAt,
      completedAt: taskInstances.completedAt
    })
    .from(taskInstances)
    .where(isNotNull(sql`${taskInstances.contextData}->>'scheduleId'`))
    .orderBy(desc(taskInstances.createdAt));

  const statusMap = new Map<string, "pending" | "completed" | "missed" | "none">();
  const now = new Date();
  
  for (const t of recentTasks) {
    if (!t.scheduleId || statusMap.has(t.scheduleId)) continue;
    
    if (t.status === "completed") {
      statusMap.set(t.scheduleId, "completed");
    } else if (t.status === "pending" && t.dueAt && new Date(t.dueAt) < now) {
      statusMap.set(t.scheduleId, "missed");
    } else {
      statusMap.set(t.scheduleId, "pending");
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
            <div style={{ padding: '2rem', textAlign: 'center', border: '1px dashed var(--border-color)', borderRadius: '8px' }}>
              <Clock size={24} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
              <p className="muted" style={{ marginBottom: '1rem' }}>You haven't configured any routine purchasing tasks yet.</p>
              <Link href={`/purchasing/schedules/new${querySuffix}`} style={{ fontSize: '0.9rem', color: 'var(--primary-color)', textDecoration: 'none', fontWeight: '500' }}>
                Create your first routine task &rarr;
              </Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
              {schedules.map((schedule) => {
                const statusType = statusMap.get(schedule.id) || "none";
                
                return (
                  <div key={schedule.id} style={{ display: 'flex', flexDirection: 'column', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'white', fontSize: '0.85rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                    <div style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--primary-color)', fontSize: '0.75rem', fontWeight: '600', backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: '2px 8px', borderRadius: '12px' }}>
                          <Clock size={12} />
                          {formatFrequency(schedule.frequencyRule)} at {schedule.reminderTime}
                        </div>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          {schedule.priority && (
                            <span style={{ 
                              fontSize: '0.65rem', 
                              fontWeight: 'bold', 
                              textTransform: 'uppercase',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: schedule.priority === 'high' || schedule.priority === 'critical' ? '#fee2e2' : schedule.priority === 'medium' ? '#fef3c7' : '#f1f5f9',
                              color: schedule.priority === 'high' || schedule.priority === 'critical' ? '#dc2626' : schedule.priority === 'medium' ? '#d97706' : '#64748b',
                            }}>
                              {schedule.priority}
                            </span>
                          )}
                          <Link href={`/purchasing/schedules/${schedule.id}${querySuffix}`} style={{ color: 'var(--text-muted)', padding: '4px', background: '#f8fafc', borderRadius: '4px' }} title="Edit">
                            <Edit2 size={14} />
                          </Link>
                        </div>
                      </div>
                      
                      <h4 style={{ fontSize: '1rem', fontWeight: '600', margin: '0 0 6px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{schedule.vendorName || "Unknown Vendor"}</h4>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '10px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={12} /> {schedule.locationName}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Users size={12} /> {schedule.roleName}</span>
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border-color)', padding: '10px 16px', backgroundColor: '#f8fafc', borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Last Run</span>
                        {statusType === "completed" && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 'bold', color: '#16a34a' }}>
                            <CheckCircle2 size={12} /> Completed
                          </span>
                        )}
                        {statusType === "missed" && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 'bold', color: '#dc2626' }}>
                            <AlertCircle size={12} /> Missed
                          </span>
                        )}
                        {statusType === "pending" && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 'bold', color: '#d97706' }}>
                            <PlayCircle size={12} /> Pending
                          </span>
                        )}
                        {statusType === "none" && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>
                            No Runs
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
