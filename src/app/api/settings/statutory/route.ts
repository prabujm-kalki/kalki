import { NextResponse } from "next/server";
import { db } from "@/db";
import { organizationStatutorySettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuthenticatedUser } from "@/lib/authorization";

export async function GET(request: Request) {
  try {
    await requireAuthenticatedUser(request);
    const url = new URL(request.url);
    const organizationId = url.searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json({ error: "organizationId is required" }, { status: 400 });
    }

    let settings = await db
      .select()
      .from(organizationStatutorySettings)
      .where(eq(organizationStatutorySettings.organizationId, organizationId))
      .limit(1);

    // If it doesn't exist, return defaults
    if (settings.length === 0) {
      return NextResponse.json({
        settings: {
          epfEmployeeContributionRate: "12.00",
          epfEmployerContributionRate: "12.00",
          epfWageCeiling: "15000.00",
          epfIncludeEmployerContributionInCTC: true,
          esiEmployeeContributionRate: "0.75",
          esiEmployerContributionRate: "3.25",
          esiWageCeiling: "21000.00",
          esiIncludeEmployerContributionInCTC: true,
        }
      });
    }

    return NextResponse.json({ settings: settings[0] });
  } catch (error: any) {
    console.error("Failed to fetch statutory settings:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAuthenticatedUser(request);
    const body = await request.json();
    
    if (!body.organizationId) {
      return NextResponse.json({ error: "organizationId is required" }, { status: 400 });
    }

    // Check if it exists
    const existing = await db
      .select()
      .from(organizationStatutorySettings)
      .where(eq(organizationStatutorySettings.organizationId, body.organizationId))
      .limit(1);

    if (existing.length > 0) {
      // Update
      const [updated] = await db.update(organizationStatutorySettings)
        .set({
          epfEmployeeContributionRate: body.epfEmployeeContributionRate,
          epfEmployerContributionRate: body.epfEmployerContributionRate,
          epfWageCeiling: body.epfWageCeiling,
          epfIncludeEmployerContributionInCTC: body.epfIncludeEmployerContributionInCTC,
          esiEmployeeContributionRate: body.esiEmployeeContributionRate,
          esiEmployerContributionRate: body.esiEmployerContributionRate,
          esiWageCeiling: body.esiWageCeiling,
          esiIncludeEmployerContributionInCTC: body.esiIncludeEmployerContributionInCTC,
          updatedAt: new Date()
        })
        .where(eq(organizationStatutorySettings.id, existing[0].id))
        .returning();
      return NextResponse.json({ settings: updated });
    } else {
      // Insert
      const [inserted] = await db.insert(organizationStatutorySettings).values({
        organizationId: body.organizationId,
        epfEmployeeContributionRate: body.epfEmployeeContributionRate,
        epfEmployerContributionRate: body.epfEmployerContributionRate,
        epfWageCeiling: body.epfWageCeiling,
        epfIncludeEmployerContributionInCTC: body.epfIncludeEmployerContributionInCTC,
        esiEmployeeContributionRate: body.esiEmployeeContributionRate,
        esiEmployerContributionRate: body.esiEmployerContributionRate,
        esiWageCeiling: body.esiWageCeiling,
        esiIncludeEmployerContributionInCTC: body.esiIncludeEmployerContributionInCTC,
      }).returning();
      return NextResponse.json({ settings: inserted });
    }

  } catch (error: any) {
    console.error("Failed to upsert statutory settings:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
