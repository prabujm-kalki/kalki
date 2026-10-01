import { db } from "@/db";
import { purchaseSchedules, vendors, businessRoles } from "@/db/schema";
import { eq } from "drizzle-orm";
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
  const allVendors = await db.select().from(vendors);
  const allRoles = await db.select().from(businessRoles);

  return (
    <div className="bg-slate-50 min-h-screen">
      <RoutineConfigForm 
        vendors={allVendors} 
        roles={allRoles} 
        initialData={schedule}
      />
    </div>
  );
}
