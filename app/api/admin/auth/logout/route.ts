import { NextResponse } from "next/server";
import { SESSION_COOKIE, getSession } from "@/lib/admin/auth";
import { logAudit } from "@/lib/admin/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getSession();
  if (session) await logAudit(session.sub, "logout", {});

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
