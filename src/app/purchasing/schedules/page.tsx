import { db } from "@/db";
import { purchaseSchedules, vendors, businessRoles, locations, taskInstances } from "@/db/schema";
import { eq, desc, isNotNull, sql } from "drizzle-orm";
import Link from "next/link";
import { Plus, Clock, MapPin, Users, Store, CheckCircle2, AlertCircle, ArrowRight, PlayCircle, Edit2 } from "lucide-react";

export default async function SchedulesListPage({ searchParams }: { searchParams: Promise<{ organizationId?: string; locationId?: string }> }) {
  const resolvedParams = await searchParams;
  const queryString = new URLSearchParams(resolvedParams as any).toString();
  const querySuffix = queryString ? `?${queryString}` : '';

  const schedules = await db
    .select({
      id: purchaseSchedules.id,
      frequencyRule: purchaseSchedules.frequencyRule,
      reminderTime: purchaseSchedules.reminderTime,
      isActive: purchaseSchedules.isActive,
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

  // Fetch real latest task instance for each schedule to determine status
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
    <div className="kalki-main-content">
      <div className="kalki-page-header" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="kalki-page-title">Routine Automations</h1>
          <p className="kalki-page-description">Manage scheduled purchasing tasks and monitor their daily execution status.</p>
        </div>
        <Link 
          href={`/purchasing/schedules/new${querySuffix}`}
          className="kalki-button kalki-button--primary"
          style={{ gap: '6px', fontSize: '13px', padding: '6px 12px' }}
        >
          <Plus size={14} /> Create Routine Task
        </Link>
      </div>

      {schedules.length === 0 ? (
        <div className="kalki-section" style={{ padding: '48px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ backgroundColor: '#eff6ff', padding: '12px', borderRadius: '50%', marginBottom: '12px' }}>
            <Clock size={24} style={{ color: 'var(--kalki-primary)' }} />
          </div>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 6px 0' }}>No Automations Running</h3>
          <p style={{ color: 'var(--kalki-text-secondary)', marginBottom: '16px', maxWidth: '300px', fontSize: '13px' }}>You haven't configured any routine purchasing tasks yet. Automate your daily orders to save time.</p>
          <Link href={`/purchasing/schedules/new${querySuffix}`} style={{ fontSize: '13px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
            Get started <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {schedules.map((schedule) => {
            const statusType = statusMap.get(schedule.id) || "none";
            
            return (
              <div key={schedule.id} className="kalki-section" style={{ display: 'flex', flexDirection: 'column', borderRadius: '8px' }}>
                <div className="kalki-section-content" style={{ flex: 1, padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#eff6ff', color: 'var(--kalki-primary)', padding: '2px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: '600' }}>
                      <Clock size={12} />
                      {formatFrequency(schedule.frequencyRule)} at {schedule.reminderTime}
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <Link href={`/purchasing/schedules/${schedule.id}${querySuffix}`} style={{ padding: '4px', color: 'var(--kalki-text-secondary)', background: '#f8fafc', borderRadius: '4px', display: 'flex' }} title="Edit">
                        <Edit2 size={14} />
                      </Link>
                    </div>
                  </div>
                  
                  <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 2px 0' }}>{schedule.vendorName || "Unknown Vendor"}</h3>
                  <p style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--kalki-text-secondary)', margin: '0 0 16px 0' }}>
                    <MapPin size={12} /> {schedule.locationName}
                  </p>

                  <div style={{ backgroundColor: '#f8fafc', borderRadius: '6px', padding: '12px', border: '1px solid var(--kalki-border)' }}>
                    <p style={{ fontSize: '10px', fontWeight: '600', color: 'var(--kalki-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px 0' }}>Responsible Team</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ backgroundColor: 'white', padding: '4px', borderRadius: '4px', border: '1px solid var(--kalki-border)' }}>
                        <Users size={12} />
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: '500' }}>{schedule.roleName}</span>
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--kalki-border)', padding: '12px 16px', backgroundColor: '#f8fafc' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--kalki-text-secondary)' }}>Last Execution</span>
                    {statusType === "completed" && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 'bold', color: '#16a34a', backgroundColor: '#dcfce7', padding: '2px 6px', borderRadius: '4px', border: '1px solid #bbf7d0' }}>
                        <CheckCircle2 size={12} /> Completed
                      </span>
                    )}
                    {statusType === "missed" && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 'bold', color: '#dc2626', backgroundColor: '#fee2e2', padding: '2px 6px', borderRadius: '4px', border: '1px solid #fecaca' }}>
                        <AlertCircle size={12} /> Missed
                      </span>
                    )}
                    {statusType === "pending" && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 'bold', color: '#d97706', backgroundColor: '#fef3c7', padding: '2px 6px', borderRadius: '4px', border: '1px solid #fde68a' }}>
                        <PlayCircle size={12} /> Pending
                      </span>
                    )}
                    {statusType === "none" && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 'bold', color: 'var(--kalki-text-secondary)', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                        No Runs Yet
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
  );
}
