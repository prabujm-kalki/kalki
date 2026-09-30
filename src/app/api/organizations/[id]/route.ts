import { NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: Request, context: any) {
  const params = await context.params;
  const id = params.id;
  
  if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });
  
  try {
    const orgs = await db.select().from(organizations).where(eq(organizations.id, id)).limit(1);
    const org = orgs[0];
    return NextResponse.json({ organization: org });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req: Request, context: any) {
  const params = await context.params;
  const id = params.id;
  
  if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });
  
  try {
    const body = await req.json();
    await db.update(organizations)
      .set({ whatsappPoTemplate: body.whatsappPoTemplate })
      .where(eq(organizations.id, id));
      
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
