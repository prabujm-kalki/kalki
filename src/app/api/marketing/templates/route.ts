import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { whatsappTemplates, organizations } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { getWhatsAppCredentials } from "@/lib/whatsapp";

/**
 * GET /api/marketing/templates?organizationId=...
 * Returns all local templates stored for the organization.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json({ error: "organizationId is required" }, { status: 400 });
    }

    const templates = await db
      .select()
      .from(whatsappTemplates)
      .where(eq(whatsappTemplates.organizationId, organizationId))
      .orderBy(desc(whatsappTemplates.createdAt));

    return NextResponse.json({ success: true, data: templates });
  } catch (err: any) {
    console.error("[Templates API GET Error]:", err);
    return NextResponse.json({ error: err?.message || "Failed to fetch templates" }, { status: 500 });
  }
}

/**
 * POST /api/marketing/templates
 * Actions:
 * 1. action: "SYNC_FROM_META" -> Queries Meta Cloud API via WABA ID and imports all approved templates.
 * 2. action: "CREATE_META_TEMPLATE" -> Submits a brand-new template directly to Meta for official approval.
 * 3. Default -> Saves an approved template directly into local ledger.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action = "SAVE_LOCAL", organizationId } = body;

    if (!organizationId) {
      return NextResponse.json({ error: "organizationId is required" }, { status: 400 });
    }

    const { phoneNumberId, businessAccountId, apiToken } = await getWhatsAppCredentials(organizationId);

    // =========================================================================
    // ACTION 1: SYNC ALL APPROVED TEMPLATES FROM META
    // =========================================================================
    if (action === "SYNC_FROM_META") {
      const wabaId = (businessAccountId || "").trim();

      if (!wabaId) {
        return NextResponse.json(
          {
            error:
              "WhatsApp Business Account ID (WABA ID) is not configured. Please save your WABA ID in Settings > General Settings.",
          },
          { status: 400 }
        );
      }

      if (!apiToken) {
        return NextResponse.json(
          { error: "WhatsApp Access Token is not configured in Settings." },
          { status: 400 }
        );
      }

      // Call Meta Graph API
      const metaRes = await fetch(
        `https://graph.facebook.com/v19.0/${wabaId}/message_templates?limit=100`,
        {
          headers: { Authorization: `Bearer ${apiToken}` },
        }
      );

      const metaData = await metaRes.json();

      if (!metaRes.ok || metaData.error) {
        return NextResponse.json(
          {
            error:
              metaData.error?.message ||
              "Failed to fetch templates from Meta. Please check your WABA ID and Access Token permissions.",
            details: metaData.error,
          },
          { status: 400 }
        );
      }

      const metaTemplates: any[] = metaData.data || [];
      let syncedCount = 0;

      for (const t of metaTemplates) {
        const bodyComponent = t.components?.find((c: any) => c.type === "BODY");
        const headerComponent = t.components?.find((c: any) => c.type === "HEADER");
        const footerComponent = t.components?.find((c: any) => c.type === "FOOTER");

        const bodyText = bodyComponent?.text || "";
        const headerType = headerComponent?.format || "NONE";
        const headerText = headerComponent?.text || null;
        const footerText = footerComponent?.text || null;

        // Count {{1}}, {{2}} variables in body
        const varMatches = bodyText.match(/\{\{\d+\}\}/g);
        const variableCount = varMatches ? varMatches.length : 0;

        // Upsert into whatsappTemplates
        const existing = await db
          .select({ id: whatsappTemplates.id })
          .from(whatsappTemplates)
          .where(
            and(
              eq(whatsappTemplates.organizationId, organizationId),
              eq(whatsappTemplates.name, t.name),
              eq(whatsappTemplates.language, t.language)
            )
          )
          .limit(1);

        if (existing.length > 0) {
          await db
            .update(whatsappTemplates)
            .set({
              status: t.status,
              category: t.category || "MARKETING",
              bodyText,
              headerType,
              headerText,
              footerText,
              variableCount,
              metaTemplateId: t.id,
              rejectionReason: t.rejected_reason || null,
              updatedAt: new Date(),
            })
            .where(eq(whatsappTemplates.id, existing[0].id));
        } else {
          await db.insert(whatsappTemplates).values({
            organizationId,
            name: t.name,
            displayName: t.name.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
            category: t.category || "MARKETING",
            language: t.language,
            status: t.status,
            bodyText,
            headerType,
            headerText,
            footerText,
            variableCount,
            metaTemplateId: t.id,
            rejectionReason: t.rejected_reason || null,
          });
        }
        syncedCount++;
      }

      return NextResponse.json({
        success: true,
        message: `Successfully synchronized ${syncedCount} templates from Meta!`,
        syncedCount,
      });
    }

    // =========================================================================
    // ACTION 2: CREATE & SUBMIT NEW TEMPLATE DIRECTLY TO META FOR APPROVAL
    // =========================================================================
    if (action === "CREATE_META_TEMPLATE") {
      const {
        name,
        displayName,
        category = "MARKETING",
        language = "en",
        bodyText,
        headerType = "NONE",
        headerText,
        footerText,
        exampleVariables = [],
      } = body;

      if (!name || !bodyText) {
        return NextResponse.json(
          { error: "Template name and body text are required." },
          { status: 400 }
        );
      }

      const cleanName = name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_]/g, "");

      const wabaId = (businessAccountId || "").trim();

      // Build Meta API Components Payload
      const components: any[] = [];

      // Header component
      if (headerType === "TEXT" && headerText) {
        components.push({
          type: "HEADER",
          format: "TEXT",
          text: headerText,
        });
      }

      // Body component with variable examples
      const bodyObj: any = {
        type: "BODY",
        text: bodyText,
      };

      if (exampleVariables && exampleVariables.length > 0) {
        bodyObj.example = {
          body_text: [exampleVariables],
        };
      }

      components.push(bodyObj);

      // Footer component
      if (footerText && footerText.trim()) {
        components.push({
          type: "FOOTER",
          text: footerText.trim(),
        });
      }

      let metaTemplateId: string | null = null;
      let initialStatus = "PENDING";

      // If WABA ID and Token are configured, submit live to Meta!
      if (wabaId && apiToken) {
        const metaRes = await fetch(
          `https://graph.facebook.com/v19.0/${wabaId}/message_templates`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiToken}`,
            },
            body: JSON.stringify({
              name: cleanName,
              category,
              language,
              components,
            }),
          }
        );

        const metaData = await metaRes.json();

        if (!metaRes.ok || metaData.error) {
          return NextResponse.json(
            {
              error:
                metaData.error?.message ||
                "Failed to submit template to Meta for approval.",
              details: metaData.error,
            },
            { status: 400 }
          );
        }

        metaTemplateId = metaData.id;
        initialStatus = metaData.status || "PENDING";
      }

      // Count variables in bodyText
      const varMatches = bodyText.match(/\{\{\d+\}\}/g);
      const variableCount = varMatches ? varMatches.length : 0;

      // Save into Kalki BOS local ledger
      const [saved] = await db
        .insert(whatsappTemplates)
        .values({
          organizationId,
          name: cleanName,
          displayName: displayName || cleanName.replace(/_/g, " "),
          category,
          language,
          status: initialStatus,
          bodyText,
          headerType,
          headerText: headerText || null,
          footerText: footerText || null,
          variableCount,
          metaTemplateId,
        })
        .returning();

      return NextResponse.json({
        success: true,
        message: "Template created and submitted to Meta for approval successfully!",
        data: saved,
      });
    }

    // =========================================================================
    // ACTION 3: SAVE APPROVED TEMPLATE DIRECTLY INTO LOCAL CATALOG
    // =========================================================================
    if (action === "SAVE_LOCAL") {
      const {
        name,
        displayName,
        category = "MARKETING",
        language = "en",
        status = "APPROVED",
        bodyText,
        variableCount = 0,
      } = body;

      const cleanName = name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_]/g, "");

      const [saved] = await db
        .insert(whatsappTemplates)
        .values({
          organizationId,
          name: cleanName,
          displayName: displayName || cleanName.replace(/_/g, " "),
          category,
          language,
          status,
          bodyText,
          variableCount,
        })
        .returning();

      return NextResponse.json({
        success: true,
        message: "Template saved into Kalki BOS Template Catalog!",
        data: saved,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("[Templates API POST Error]:", err);
    return NextResponse.json({ error: err?.message || "Failed to process template" }, { status: 500 });
  }
}
