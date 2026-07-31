import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/admin/auth";
import { createAdminUser, findAdminByEmail, listAdminUsers } from "@/lib/admin/users";
import { logAudit } from "@/lib/admin/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const admins = await listAdminUsers();
    return NextResponse.json(admins);
  } catch (err) {
    console.error("list admins failed", err);
    return NextResponse.json({ error: "Failed to load admins." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { email?: string; password?: string; role?: "super_admin" | "admin" };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  const role = body.role === "super_admin" ? "super_admin" : "admin";

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }
  if (password.length < 10) {
    return NextResponse.json({ error: "Password must be at least 10 characters." }, { status: 400 });
  }

  const existing = await findAdminByEmail(email);
  if (existing) {
    return NextResponse.json({ error: "An admin with this email already exists." }, { status: 409 });
  }

  try {
    const admin = await createAdminUser(email, password, role);
    await logAudit(session.sub, "create_admin", { email, role });
    return NextResponse.json(admin, { status: 201 });
  } catch (err) {
    console.error("create admin failed", err);
    return NextResponse.json({ error: "Failed to create admin." }, { status: 500 });
  }
}
