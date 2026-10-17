import React, { Suspense } from "react";
import { KalkiPageHeader } from "@/components/ui/KalkiPageHeader";
import { db } from "@/db";
import { marketingTemplates } from "@/db/schema";
import { desc, eq, and } from "drizzle-orm";
import { StatusMessage } from "@/components/StatusMessage";

import Link from "next/link";
import { TemplateRowActions } from "./TemplateRowActions";
import { TemplateStatusToggle } from "./TemplateStatusToggle";

export const dynamic = 'force-dynamic';

export default async function TemplatesPage(props: any) {
  const searchParams = await props.searchParams;
  const orgId = searchParams?.organizationId || "";
  const locId = searchParams?.locationId || "";

  const conditions = [];
  if (orgId) {
    conditions.push(eq(marketingTemplates.organizationId, orgId));
  }
  if (locId && locId !== "all" && locId !== "ALL") {
    conditions.push(eq(marketingTemplates.locationId, locId));
  }

  const templates = await db
    .select()
    .from(marketingTemplates)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(marketingTemplates.createdAt));

  return (
    <Suspense fallback={<main className="app-main"><StatusMessage tone="loading">Loading...</StatusMessage></main>}>
      <div className="kalki-page">
        <KalkiPageHeader 
          title="Templates" 
        />
        <div style={{ padding: '0 2rem' }}>
            <div className="card" style={{ backgroundColor: "#ffffff", padding: "24px", borderRadius: "8px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                <div>
                  <h2 style={{ margin: 0, color: "#1e293b", fontSize: "1.25rem", fontWeight: 600 }}>Marketing Templates</h2>
                  <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "0.875rem" }}>Manage and review your saved marketing audiences.</p>
                </div>
              </div>
              
              {templates.length === 0 ? (
                <div style={{ textAlign: "center", padding: "48px 0" }}>
                  <p style={{ color: "#64748b", fontSize: "0.875rem" }}>No templates found. Go to the Sales dashboard to create one.</p>
                </div>
              ) : (
                <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.875rem" }}>
                    <thead style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                      <tr>
                        <th style={{ padding: "12px 16px", color: "#475569", fontWeight: 600 }}>Template Name</th>
                        <th style={{ padding: "12px 16px", color: "#475569", fontWeight: 600, textAlign: "center" }}>Target Type</th>
                        <th style={{ padding: "12px 16px", color: "#475569", fontWeight: 600, textAlign: "center" }}>Cycle (Weeks)</th>
                        <th style={{ padding: "12px 16px", color: "#475569", fontWeight: 600 }}>Status</th>
                        <th style={{ padding: "12px 16px", color: "#475569", fontWeight: 600 }}>Created At</th>
                        <th style={{ padding: "12px 16px", color: "#475569", fontWeight: 600, textAlign: "center" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {templates.map(t => (
                        <tr key={t.id} style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: "#ffffff", transition: "background-color 0.2s" }}>
                          <td style={{ padding: "16px", color: "#0f172a", fontWeight: 500 }}>
                            <Link 
                              href={`/crm/templates/${t.id}?organizationId=${orgId}&locationId=${locId}`}
                              style={{ color: "#2563eb", textDecoration: "none", fontWeight: 500 }}
                            >
                              {t.name}
                            </Link>
                          </td>
                          <td style={{ padding: "16px", textAlign: "center" }}>
                            <span style={{ display: "inline-block", padding: "2px 8px", backgroundColor: "#f1f5f9", color: "#475569", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 600 }}>
                              {t.targetEntityType || "CUSTOMER"}
                            </span>
                          </td>
                          <td style={{ padding: "16px", color: "#475569", textAlign: "center" }}>{t.cycleDurationWeeks}</td>
                          <td style={{ padding: "16px" }}>
                            <TemplateStatusToggle templateId={t.id} initialStatus={t.status as "ACTIVE" | "INACTIVE"} />
                          </td>
                          <td style={{ padding: "16px", color: "#64748b" }}>{new Date(t.createdAt).toLocaleDateString()}</td>
                          <td style={{ padding: "16px", display: "flex", justifyContent: "center" }}>
                            <TemplateRowActions templateId={t.id} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
    </Suspense>
  );
}
