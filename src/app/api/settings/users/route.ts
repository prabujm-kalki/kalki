import { NextResponse } from "next/server";
import { db } from "@/db";
import { authUsers } from "@/db/schema";
import { requireAuthenticatedUser } from "@/lib/authorization";

export async function GET(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const allUsers = await db.select({
      id: authUsers.id,
      name: authUsers.name,
      email: authUsers.email,
    }).from(authUsers);

    return NextResponse.json(allUsers);
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
