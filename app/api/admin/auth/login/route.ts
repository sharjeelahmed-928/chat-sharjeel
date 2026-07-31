import { NextRequest, NextResponse } from "next/server";
import { findAdminByEmail, touchLastLogin } from "@/lib/admin/users";
import { createSessionToken, sessionCookieOptions, verifyPassword, SESSION_COOKIE } from "@/lib/admin/auth";
import { logAudit } from "@/lib/admin/analytics";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // Reuse the existing IP-based rate limiter to slow down credential
  // stuffing / brute-force attempts against the login endpoint.
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "anonymous";
  const rate = checkRateLimit(`admin-login:${ip}`, 10);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many login attempts. Please wait a moment and try again." },
      { status: 429 }
    );
  }

  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const admin = await findAdminByEmail(email);
  // Constant-shape response whether the user exists or not, to avoid
  // leaking which emails have admin accounts.
  const invalid = () => NextResponse.json({ error: "Invalid email or password." }, { status: 401 });

  if (!admin || !admin.is_active) return invalid();

  const valid = await verifyPassword(password, admin.password_hash);
  if (!valid) return invalid();

  const token = await createSessionToken({ sub: admin.id, email: admin.email, role: admin.role });
  await touchLastLogin(admin.id);
  await logAudit(admin.id, "login", { ip });

  const res = NextResponse.json({
    ok: true,
    admin: { id: admin.id, email: admin.email, role: admin.role },
  });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return res;
}
