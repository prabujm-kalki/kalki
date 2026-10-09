import { ReturnSettingsClient } from "@/components/sales/ReturnSettingsClient";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function ReturnSettingsPage({ searchParams }: { searchParams: { organizationId?: string, locationId?: string } }) {
  const orgId = searchParams.organizationId || "";
  let returnPolicies = {
    maxReturnDays: 30,
    allowMultipleReturns: true,
    requireApproval: true,
    applyRestockingFee: "None"
  };

  if (orgId) {
    const org = await db.select({ returnPolicies: organizations.returnPolicies }).from(organizations).where(eq(organizations.id, orgId));
    if (org.length > 0 && org[0].returnPolicies) {
      returnPolicies = org[0].returnPolicies as any;
    }
  }

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", width: "100%" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: "600", color: "var(--kalki-text-primary)", marginBottom: "0.5rem" }}>Return Policies</h1>
      <p style={{ color: "var(--kalki-text-secondary)", marginBottom: "2rem", fontSize: "0.875rem" }}>
        Configure the rules and constraints for handling customer sales returns across your organization.
      </p>
      
      <ReturnSettingsClient initialSettings={returnPolicies} />
    </div>
  );
}
