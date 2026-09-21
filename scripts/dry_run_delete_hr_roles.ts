import "dotenv/config";
import { db } from "../src/db";
import { roles } from "../src/db/schema";
import { like } from "drizzle-orm";

async function main() {
  console.log("🔍 Performing DRY RUN for deleting unwanted HR roles...");
  
  // Find roles that have the generic 'HR' name or 'HR_' prefix
  const unwantedRoles = await db.select().from(roles).where(like(roles.code, "HR_%"));
  
  console.log(`\nFound ${unwantedRoles.length} unwanted HR roles matching the criteria.`);
  
  if (unwantedRoles.length > 0) {
    console.log("\nSample of roles to be deleted (showing up to 20):");
    unwantedRoles.slice(0, 20).forEach(r => {
      console.log(`- ID: ${r.id} | Code: ${r.code} | Name: ${r.name}`);
    });
    
    // Save IDs to a local file for safe deletion later
    const fs = require('fs');
    const path = require('path');
    const idsFile = path.join(__dirname, '..', 'scratch', 'unwanted_role_ids.json');
    
    // Ensure scratch directory exists
    if (!fs.existsSync(path.dirname(idsFile))) {
      fs.mkdirSync(path.dirname(idsFile), { recursive: true });
    }
    
    fs.writeFileSync(idsFile, JSON.stringify(unwantedRoles.map(r => r.id), null, 2));
    console.log(`\n✅ Saved ${unwantedRoles.length} IDs to ${idsFile}`);
    console.log("Please review this list. No deletions have been performed yet.");
  } else {
    console.log("No matching roles found to delete.");
  }
  
  process.exit(0);
}

main().catch(err => {
  console.error("❌ Dry run failed:", err);
  process.exit(1);
});
