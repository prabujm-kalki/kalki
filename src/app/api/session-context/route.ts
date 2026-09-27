import { NextResponse } from "next/server";
import { getSessionContext, SessionServiceError } from "@/domains/session/service";
import { requireAuthenticatedUser } from "@/lib/authorization";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  console.log("=== SESSION-CONTEXT CHECK ===");
  console.log("Headers (cookie):", request.headers.get("cookie"));
  console.log("Headers (host):", request.headers.get("host"));
  console.log("Headers (origin):", request.headers.get("origin"));
  console.log("Headers (x-forwarded-proto):", request.headers.get("x-forwarded-proto"));
  
  const user = await requireAuthenticatedUser(request);
  console.log("Authenticated User:", user ? user.id : "NULL");

  try {
    if (!user) {
       console.log("No user found. Returning 401 manually.");
       return NextResponse.json({ error: "No user found" }, { status: 401 });
    }
    const sessionCtx = await getSessionContext(user);
    console.log("Session Context generated:", sessionCtx ? "YES" : "NO");
    return NextResponse.json({ session: sessionCtx });
  } catch (error) {
    console.log("Error in getSessionContext:", error);
    if (error instanceof SessionServiceError && error.code === "AUTHENTICATION_REQUIRED") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    throw error;
  }
}
