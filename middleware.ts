import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/admin/auth";

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};

// Routes under the matcher above that must stay reachable without a session.
const PUBLIC_ADMIN_PATHS = ["/admin/login", "/api/admin/auth/login", "/api/admin/setup"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_ADMIN_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  const session = await getSessionFromRequest(req);

  if (!session) {
    if (pathname.startsWith("/api/admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/admin/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin-user management is restricted to super_admins; enforce it at the
  // edge too (API routes double-check this server-side as well).
  if (pathname.startsWith("/api/admin/admins") && session.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden — super_admin only." }, { status: 403 });
  }
  if (pathname.startsWith("/admin/admins") && session.role !== "super_admin") {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  return NextResponse.next();
}
