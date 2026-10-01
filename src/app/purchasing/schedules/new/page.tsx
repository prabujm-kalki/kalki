import { db } from "@/db";
import { vendors, businessRoles } from "@/db/schema";
import RoutineConfigForm from "./RoutineConfigForm";

export default async function NewSchedulePage() {

  // Fetch reference data for the configuration form
  const allVendors = await db.select().from(vendors);
  const allRoles = await db.select().from(businessRoles);

  return (
    <div className="bg-slate-50 min-h-screen">
      <RoutineConfigForm 
        vendors={allVendors} 
        roles={allRoles} 
      />
    </div>
  );
}
