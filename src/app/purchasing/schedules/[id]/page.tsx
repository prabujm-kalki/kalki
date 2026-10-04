import { db } from "@/db";
import { purchaseSchedules, vendors, businessRoles, taskDefinitions } from "@/db/schema";
import { eq, and, notInArray } from "drizzle-orm";
import RoutineConfigForm from "../new/RoutineConfigForm";
import { notFound } from "next/navigation";

export default async function EditSchedulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: scheduleId } = await params;

  const [schedule] = await db
    .select()
    .from(purchaseSchedules)
    .where(eq(purchaseSchedules.id, scheduleId))
    .limit(1);

  if (!schedule) {
    notFound();
  }

  // Fetch reference data for the configuration form
  const allVendors = await db.select().from(vendors).where(eq(vendors.organizationId, schedule.organizationId));
  const allRoles = await db.select().from(businessRoles).where(eq(businessRoles.organizationId, schedule.organizationId));
  const allDefs = await db.select({ id: taskDefinitions.id, title: taskDefinitions.title })
    .from(taskDefinitions)
    .where(
      and(
        eq(taskDefinitions.organizationId, schedule.organizationId),
        notInArray(taskDefinitions.title, ["Routine Purchase Order", "Perform Daily Stock Assessment"])
      )
    );

  return (
    <div className="bg-slate-50 min-h-screen">
      <RoutineConfigForm 
        vendors={allVendors} 
        roles={allRoles} 
        initialData={schedule}
        taskDefinitions={allDefs}
      />
    </div>
  );
}
