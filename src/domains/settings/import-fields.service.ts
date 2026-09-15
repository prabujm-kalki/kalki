import { db } from "@/db";
import { importFieldDefinitions } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";

export type ImportFieldDefinition = typeof importFieldDefinitions.$inferSelect;
export type InsertImportFieldDefinition = typeof importFieldDefinitions.$inferInsert;

export async function getImportFields(organizationId: string, importType: string = "SALES_TRANSACTION") {
  return db
    .select()
    .from(importFieldDefinitions)
    .where(
      and(
        eq(importFieldDefinitions.organizationId, organizationId),
        eq(importFieldDefinitions.importType, importType)
      )
    )
    .orderBy(asc(importFieldDefinitions.displayOrder));
}

export async function getActiveImportFields(organizationId: string, importType: string = "SALES_TRANSACTION") {
  return db
    .select()
    .from(importFieldDefinitions)
    .where(
      and(
        eq(importFieldDefinitions.organizationId, organizationId),
        eq(importFieldDefinitions.importType, importType),
        eq(importFieldDefinitions.isActive, true)
      )
    )
    .orderBy(asc(importFieldDefinitions.displayOrder));
}

export async function updateImportField(id: string, organizationId: string, data: Partial<InsertImportFieldDefinition>) {
  const [updated] = await db
    .update(importFieldDefinitions)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(importFieldDefinitions.id, id),
        eq(importFieldDefinitions.organizationId, organizationId)
      )
    )
    .returning();
  return updated;
}

export async function createImportField(data: InsertImportFieldDefinition) {
  const [created] = await db
    .insert(importFieldDefinitions)
    .values(data)
    .returning();
  return created;
}

export async function deleteImportField(id: string, organizationId: string) {
  await db
    .delete(importFieldDefinitions)
    .where(
      and(
        eq(importFieldDefinitions.id, id),
        eq(importFieldDefinitions.organizationId, organizationId)
      )
    );
}

export async function updateImportFieldsOrder(organizationId: string, importType: string, orderedIds: string[]) {
  // Update the display_order of all fields in a single transaction
  await db.transaction(async (tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await tx
        .update(importFieldDefinitions)
        .set({ displayOrder: i + 1, updatedAt: new Date() })
        .where(
          and(
            eq(importFieldDefinitions.id, orderedIds[i]),
            eq(importFieldDefinitions.organizationId, organizationId),
            eq(importFieldDefinitions.importType, importType)
          )
        );
    }
  });
}
