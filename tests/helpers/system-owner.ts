import "dotenv/config";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { authUsers, systemAuthorities } from "@/db/schema";

const OWNER_ADVISORY_LOCK = 8_410_013;
const STABLE_OWNER_USER_ID = "test-system-owner";

export async function ensureSystemOwner() {
  await db.execute(sql`select pg_advisory_lock(${OWNER_ADVISORY_LOCK})`);
  try {
    const [existing] = await db
      .select({ userId: systemAuthorities.userId })
      .from(systemAuthorities)
      .where(eq(systemAuthorities.authority, "OWNER"))
      .limit(1);
    if (existing) return { userId: existing.userId };

    const [user] = await db
      .select({ id: authUsers.id })
      .from(authUsers)
      .where(eq(authUsers.id, STABLE_OWNER_USER_ID))
      .limit(1);
    if (!user) {
      await db.insert(authUsers).values({
        id: STABLE_OWNER_USER_ID,
        name: "Test System Owner",
        email: "test-system-owner@example.invalid",
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    await db.insert(systemAuthorities).values({
      userId: STABLE_OWNER_USER_ID,
      authority: "OWNER",
    });
    return { userId: STABLE_OWNER_USER_ID };
  } finally {
    await db.execute(sql`select pg_advisory_unlock(${OWNER_ADVISORY_LOCK})`);
  }
}
