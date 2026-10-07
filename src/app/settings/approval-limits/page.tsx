import React from "react";
import { db } from "@/db";
import { approvalLimits, businessRoles } from "@/db/schema";
import { eq } from "drizzle-orm";
import ApprovalLimitsClient from "./ApprovalLimitsClient";

export const dynamic = "force-dynamic";

export default async function ApprovalLimitsPage() {
  const allRoles = await db.select().from(businessRoles).where(eq(businessRoles.isActive, true));
  const limits = await db.select().from(approvalLimits);

  return (
    <div className="kalki-main-content">
      <div className="kalki-page-header">
        <h1 className="kalki-page-title">Approval Limits Configuration</h1>
        <p className="kalki-page-description">
          Set up role-based limits for bill review and approval across different modules.
        </p>
      </div>
      <div className="kalki-section">
        <ApprovalLimitsClient initialRoles={allRoles} initialLimits={limits} />
      </div>
    </div>
  );
}
