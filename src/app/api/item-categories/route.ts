import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { itemCategories } from "@/db/schema";
import { requireAuthenticatedUser, loadAuthorizationGrants } from "@/lib/authorization";
import { eq, and } from "drizzle-orm";
import { headers } from "next/headers";

export async function GET(req: NextRequest) {
  try {
    const actor = await requireAuthenticatedUser(req);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('organizationId');
    if (!orgId) return NextResponse.json({ error: "organizationId is required" }, { status: 400 });

    const categories = await db
      .select()
      .from(itemCategories)
      .where(
        and(
          eq(itemCategories.organizationId, orgId),
          eq(itemCategories.isActive, true)
        )
      )
      .orderBy(itemCategories.name);

    return NextResponse.json(categories);
  } catch (error: any) {
    console.error("GET /api/item-categories error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await requireAuthenticatedUser(req);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { name, code, organizationId } = body;

    if (!name || !organizationId) {
      return NextResponse.json({ error: "Name and organizationId are required" }, { status: 400 });
    }

    const [newCategory] = await db
      .insert(itemCategories)
      .values({
        organizationId,
        name,
        code: code || null,
      })
      .returning();

    return NextResponse.json(newCategory);
  } catch (error: any) {
    console.error("POST /api/item-categories error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
