import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { itemSubcategories } from "@/db/schema";
import { requireAuthenticatedUser, loadAuthorizationGrants } from "@/lib/authorization";
import { eq, and } from "drizzle-orm";
import { headers } from "next/headers";

export async function GET(req: NextRequest) {
  try {
    const actor = await requireAuthenticatedUser(req);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get('categoryId');

    if (!categoryId) {
      return NextResponse.json({ error: "categoryId is required" }, { status: 400 });
    }

    const subcategories = await db
      .select()
      .from(itemSubcategories)
      .where(
        and(
          eq(itemSubcategories.categoryId, categoryId),
          eq(itemSubcategories.isActive, true)
        )
      )
      .orderBy(itemSubcategories.name);

    return NextResponse.json(subcategories);
  } catch (error: any) {
    console.error("GET /api/item-subcategories error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await requireAuthenticatedUser(req);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { name, categoryId } = body;

    if (!name || !categoryId) {
      return NextResponse.json({ error: "Name and categoryId are required" }, { status: 400 });
    }

    const [newSubcategory] = await db
      .insert(itemSubcategories)
      .values({
        categoryId,
        name,
      })
      .returning();

    return NextResponse.json(newSubcategory);
  } catch (error: any) {
    console.error("POST /api/item-subcategories error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
