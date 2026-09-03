import { NextResponse } from "next/server";
import { getSessionContext, SessionServiceError } from "@/domains/session/service";
import { requireAuthenticatedUser } from "@/lib/authorization";

export async function GET(request: Request) {
  const user = await requireAuthenticatedUser(request);
  try {
    return NextResponse.json({ session: await getSessionContext(user) });
  } catch (error) {
    if (error instanceof SessionServiceError && error.code === "AUTHENTICATION_REQUIRED") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    throw error;
  }
}
