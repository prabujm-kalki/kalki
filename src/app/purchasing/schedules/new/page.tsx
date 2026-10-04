import { db } from "@/db";
import { vendors, businessRoles, taskDefinitions } from "@/db/schema";
import { eq, and, notInArray } from "drizzle-orm";
import RoutineConfigForm from "./RoutineConfigForm";

export default async function NewSchedulePage({ searchParams }: { searchParams: Promise<{ organizationId?: string; locationId?: string }> }) {
  const resolvedParams = await searchParams;
  const orgId = resolvedParams.organizationId;

  // Fetch reference data for the configuration form
  const allVendors = orgId ? await db.select().from(vendors).where(eq(vendors.organizationId, orgId)) : await db.select().from(vendors);
  const allRoles = orgId ? await db.select().from(businessRoles).where(eq(businessRoles.organizationId, orgId)) : await db.select().from(businessRoles);
  
  const defsConditions = [
    notInArray(taskDefinitions.title, ["Routine Purchase Order", "Perform Daily Stock Assessment"])
  ];
  if (orgId) {
    defsConditions.push(eq(taskDefinitions.organizationId, orgId));
  }

  const allDefs = await db.select({ id: taskDefinitions.id, title: taskDefinitions.title })
    .from(taskDefinitions)
    .where(and(...defsConditions));

  return (
    <div className="bg-slate-50 min-h-screen">
      <RoutineConfigForm 
        vendors={allVendors} 
        roles={allRoles} 
        taskDefinitions={allDefs}
      />
    </div>
  );
}
