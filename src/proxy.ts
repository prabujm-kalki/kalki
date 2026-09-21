import { NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static/public paths should never be intercepted
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/static") ||
    pathname === "/favicon.ico" ||
    pathname.includes(".") // Exclude files
  ) {
    return NextResponse.next();
  }

  // Attempt to fetch session from Better Auth API
  let session: any | null = null;
  try {
    // Fetch directly from localhost to avoid looping out to the internet and being blocked by Cloudflare
    const response = await fetch(`http://localhost:3001/api/auth/get-session`, {
      headers: {
        // Forward the cookies from the client
        cookie: request.headers.get("cookie") || "",
        // Forward the host header so Better Auth knows the actual domain
        host: request.headers.get("host") || "",
      },
    });
    if (response.ok) {
      session = await response.json();
    }
  } catch (e) {
    // Ignore fetch errors, session remains null
  }

  const isAuthRoute = pathname === "/login";

  // Case 1: Unauthenticated user trying to access a protected route
  if (!session && !isAuthRoute) {
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("next", pathname + request.nextUrl.search);
    }
    return NextResponse.redirect(loginUrl);
  }

  // Case 2: Authenticated user trying to access login page
  if (session && isAuthRoute) {
    // Determine where to send them
    const nextUrl = request.nextUrl.searchParams.get("next") || "/work";
    return NextResponse.redirect(new URL(nextUrl, request.url));
  }

  // Case 3: Pass through
  return NextResponse.next();
}

export const config = {
  // Apply middleware to all routes except api, _next/static, _next/image, favicon.ico
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
