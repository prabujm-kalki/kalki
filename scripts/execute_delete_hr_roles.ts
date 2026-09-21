import "dotenv/config";
import { db } from "../src/db";
import { roles } from "../src/db/schema";
import { inArray } from "drizzle-orm";
import fs from "fs";
import path from "path";

async function main() {
  console.log("🗑️ Executing SAFE DELETION of unwanted HR roles...");
  
  const idsFile = path.join(__dirname, '..', 'scratch', 'unwanted_role_ids.json');
  
  if (!fs.existsSync(idsFile)) {
    console.error("❌ Cannot find the IDs file from the dry run! Aborting.");
    process.exit(1);
  }
  
  const idsToDelete: string[] = JSON.parse(fs.readFileSync(idsFile, "utf-8"));
  
  if (!idsToDelete || idsToDelete.length === 0) {
    console.log("No IDs found to delete.");
    process.exit(0);
  }
  
  console.log(`Executing deletion for exactly ${idsToDelete.length} roles...`);
  
  try {
    const deleted = await db.delete(roles)
      .where(inArray(roles.id, idsToDelete))
      .returning();
      
    console.log(`\n✅ Successfully deleted ${deleted.length} roles.`);
    
    // Rename the scratch file to indicate completion
    fs.renameSync(idsFile, `${idsFile}.completed`);
    
  } catch (error) {
    console.error("❌ Deletion failed:", error);
    process.exit(1);
  }
  
  process.exit(0);
}

main();
