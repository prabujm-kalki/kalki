import { NextResponse } from "next/server";
import { db } from "@/db";
import { roles } from "@/db/schema";
import { requireAuthenticatedUser } from "@/lib/authorization";

export async function GET(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const allRoles = await db.select().from(roles);
    return NextResponse.json(allRoles);
  } catch (error) {
    console.error("Failed to fetch roles:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { name, code } = body;

    if (!name || !code) {
      return NextResponse.json({ error: "Name and code are required" }, { status: 400 });
    }

    const [newRole] = await db.insert(roles).values({
      name,
      code,
    }).returning();

    return NextResponse.json(newRole);
  } catch (error) {
    console.error("Failed to create role:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
