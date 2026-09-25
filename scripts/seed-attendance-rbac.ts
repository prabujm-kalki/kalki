import { db } from "../src/db";
import { permissions } from "../src/db/schema";
import { eq } from "drizzle-orm";

const requiredPermissions = [
  // My Time
  { code: "attendance.my_time:read", name: "View My Time" },
  { code: "attendance.my_time:create", name: "Submit Leave Requests" },
  
  // Approvals
  { code: "attendance.approvals:read", name: "View Approvals" },
  { code: "attendance.approvals:approve", name: "Approve Leave Requests" },
  
  // Configuration
  { code: "attendance.configuration:read", name: "View Leave Configuration" },
  { code: "attendance.configuration:create", name: "Create Leave Configuration" },
  { code: "attendance.configuration:update", name: "Update Leave Configuration" },
];

async function seed() {
  console.log("Seeding RBAC permissions for Attendance module...");
  
  try {
    for (const perm of requiredPermissions) {
      const existing = await db.select().from(permissions).where(eq(permissions.code, perm.code)).limit(1);
      
      if (existing.length === 0) {
        await db.insert(permissions).values({
          code: perm.code,
          name: perm.name,
        });
        console.log(`Inserted permission: ${perm.code}`);
      } else {
        console.log(`Permission already exists: ${perm.code}`);
      }
    }
    
    console.log("RBAC Seeding complete.");
  } catch (error) {
    console.error("Failed to seed RBAC:", error);
  } finally {
    process.exit(0);
  }
}

seed();
