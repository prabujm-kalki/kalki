import React, { Suspense } from "react";
import { KalkiPageHeader } from "@/components/ui/KalkiPageHeader";
import { db } from "@/db";
import { marketingTemplates, marketingTemplateAudiences, customers } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { StatusMessage } from "@/components/StatusMessage";
import { TemplateDetailClient } from "./TemplateDetailClient";
import { TemplateStatusToggle } from "../TemplateStatusToggle";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function TemplateDetailsPage(props: any) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  
  const orgId = searchParams?.organizationId || "";
  const locId = searchParams?.locationId || "";
  const id = params.id;

  const [template] = await db.select().from(marketingTemplates).where(eq(marketingTemplates.id, id));

  if (!template) {
    notFound();
  }

  const audiencesRaw = await db
    .select({
      entityId: marketingTemplateAudiences.targetEntityId,
      entityType: marketingTemplateAudiences.targetEntityType,
      status: marketingTemplateAudiences.enrollmentStatus,
      customerName: customers.name,
      customerPhone: customers.phone,
    })
    .from(marketingTemplateAudiences)
    .leftJoin(customers, eq(marketingTemplateAudiences.targetEntityId, customers.id))
    .where(eq(marketingTemplateAudiences.templateId, id))
    .orderBy(desc(marketingTemplateAudiences.enrolledAt));

  const audiences = audiencesRaw.map(a => ({
    customerId: a.entityId,
    status: a.status,
    customerName: a.customerName || `Entity #${a.entityId.slice(0, 8)}`,
    contact: a.customerPhone || '-'
  }));

  return (
    <Suspense fallback={<main className="app-main"><StatusMessage tone="loading">Loading...</StatusMessage></main>}>
      <div className="kalki-page">
        <KalkiPageHeader 
          title="Template Details" 
          breadcrumbs={
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <Link href={`/crm/templates?organizationId=${orgId}&locationId=${locId}`} style={{ color: "#64748b", textDecoration: "none" }}>Templates</Link>
              <span style={{ color: "#cbd5e1" }}>/</span>
              <span style={{ color: "#0f172a", fontWeight: 500 }}>{template.name}</span>
            </div>
          }
        />
        <div style={{ padding: '0 2rem' }}>
          <div className="card" style={{ backgroundColor: "#ffffff", padding: "24px", borderRadius: "8px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)", marginBottom: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
              <div>
                <h2 style={{ margin: 0, color: "#1e293b", fontSize: "1.25rem", fontWeight: 600 }}>{template.name}</h2>
                <div style={{ display: "flex", gap: "16px", marginTop: "12px", fontSize: "0.875rem", color: "#64748b" }}>
                  <div><strong>Target:</strong> {template.targetEntityType || "CUSTOMER"}</div>
                  <div><strong>Cycle:</strong> {template.cycleDurationWeeks} Weeks</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <strong>Status:</strong>
                    <TemplateStatusToggle templateId={id} initialStatus={template.status as "ACTIVE" | "INACTIVE"} />
                  </div>
                  <div><strong>Enrolled:</strong> {audiences.length} Targets</div>
                </div>
              </div>
            </div>

            <h3 style={{ fontSize: "1rem", color: "#1e293b", fontWeight: 600, marginTop: "32px", marginBottom: "16px" }}>Audience List</h3>
            <TemplateDetailClient templateId={id} audiences={audiences} />
          </div>
        </div>
      </div>
    </Suspense>
  );
}
