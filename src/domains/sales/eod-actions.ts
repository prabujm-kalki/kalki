"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { closeDay, EODDenomination } from "./eod-service";

const eodSchema = z.object({
  organizationId: z.string().uuid(),
  locationId: z.string().uuid(),
  date: z.string().date(),
  denominations: z.array(z.object({
    denomination: z.number().positive(),
    count: z.number().min(0)
  }))
});

export async function submitDayClose(input: z.infer<typeof eodSchema>) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session || !session.user) {
      return { error: "Unauthorized" };
    }

    const validated = eodSchema.parse(input);

    const result = await closeDay(
      validated.organizationId,
      validated.locationId,
      validated.date,
      session.user.id,
      validated.denominations
    );

    return { success: true, data: result.data };
  } catch (error: any) {
    console.error("EOD Close Error:", error);
    return { error: error.message || "Failed to close the day" };
  }
}
