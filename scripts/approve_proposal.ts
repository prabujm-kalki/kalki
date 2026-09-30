import { config } from "dotenv";
config({ path: ".env" });
import { db } from "../src/db";
import { employeeChangeRequests, systemAuthorities, authUsers } from "../src/db/schema";
import { eq, and } from "drizzle-orm";
import { approveEmployeeChange } from "../src/domains/employees/service";

async function main() {
  const proposalId = "a3e3fffa-9d9a-4093-acb3-ff5bd4bc49de";
  const ownerAuth = await db.select().from(systemAuthorities).where(eq(systemAuthorities.authority, "OWNER")).limit(1);
  const user = await db.select().from(authUsers).where(eq(authUsers.id, ownerAuth[0].userId)).limit(1);
  const actor = { id: user[0].id, roles: ["owner"], email: user[0].email, name: user[0].name };
  try {
    const res = await approveEmployeeChange(actor as any, proposalId, "Approved via script");
    console.log("SUCCESS:", res);
  } catch (e) {
    console.error("FAILED:", e);
  }
  process.exit(0);
}
main();
