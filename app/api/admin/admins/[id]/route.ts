import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/admin/auth";
import { setAdminUserActive } from "@/lib/admin/users";
import { logAudit } from "@/lib/admin/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  if (id === session.sub) {
    return NextResponse.json({ error: "You can't deactivate your own account." }, { status: 400 });
  }

  let body: { isActive?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  if (typeof body.isActive !== "boolean") {
    return NextResponse.json({ error: "isActive (boolean) is required." }, { status: 400 });
  }

  try {
    await setAdminUserActive(id, body.isActive);
    await logAudit(session.sub, body.isActive ? "activate_admin" : "deactivate_admin", { id });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("update admin active state failed", err);
    return NextResponse.json({ error: "Failed to update admin." }, { status: 500 });
  }
}
