import { NextRequest, NextResponse } from "next/server";
import { countAdminUsers, createAdminUser } from "@/lib/admin/users";
import { isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * One-time bootstrap: creates the first super_admin.
 *
 * Locked down two ways:
 *  1. It requires ADMIN_SETUP_SECRET (set as an env var, never committed) to
 *     match what's posted.
 *  2. It refuses to run at all once at least one admin_users row exists —
 *     so even a leaked secret can't be used to add a second super_admin
 *     later (use the Admins screen for that, which requires a real session).
 */
export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured on the server." }, { status: 500 });
  }

  const setupSecret = process.env.ADMIN_SETUP_SECRET;
  if (!setupSecret) {
    return NextResponse.json(
      { error: "ADMIN_SETUP_SECRET is not set on the server. Set it before running setup." },
      { status: 500 }
    );
  }

  let body: { email?: string; password?: string; setupSecret?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (body.setupSecret !== setupSecret) {
    return NextResponse.json({ error: "Invalid setup secret." }, { status: 403 });
  }

  const existing = await countAdminUsers();
  if (existing > 0) {
    return NextResponse.json(
      { error: "Setup already completed — an admin already exists. Log in normally." },
      { status: 409 }
    );
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }
  if (password.length < 10) {
    return NextResponse.json({ error: "Password must be at least 10 characters." }, { status: 400 });
  }

  const admin = await createAdminUser(email, password, "super_admin");
  return NextResponse.json({ ok: true, admin: { id: admin.id, email: admin.email, role: admin.role } });
}
