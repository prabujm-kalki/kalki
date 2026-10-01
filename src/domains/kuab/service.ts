import { z } from "zod";
import { db } from "@/db";
import { kuabEvents, kuabTasks, kuabEscalationRules } from "@/db/schema";
import { handlePurchaseStockEntered, PurchaseStockEnteredPayload } from "./handlers/purchasingHandler";

export const eventPayloadSchema = z.object({
  organizationId: z.string().uuid(),
  eventType: z.string().min(1),
  sourceModule: z.string().min(1),
  payload: z.any(),
});

export type EmitEventParams = z.infer<typeof eventPayloadSchema>;

/**
 * Emits an event to the Kalki Universal Automation Bus (KUAB).
 * This acts as the single entry point for all module-wise task generation
 * and orchestration, preventing hard-coded cross-module logic.
 */
export async function emitEvent(params: EmitEventParams) {
  // 1. Validate payload
  const validated = eventPayloadSchema.parse(params);

  // 2. Persist the event to the audit log
  const [event] = await db
    .insert(kuabEvents)
    .values({
      organizationId: validated.organizationId,
      eventType: validated.eventType,
      sourceModule: validated.sourceModule,
      payload: validated.payload,
      status: "PROCESSED", 
    })
    .returning();

  // 3. Route the event to task generation or background logic
  if (event.eventType === 'PURCHASING_STOCK_ENTERED') {
    const payload = event.payload as PurchaseStockEnteredPayload;
    await handlePurchaseStockEntered(payload);
  }

  return event;
}
