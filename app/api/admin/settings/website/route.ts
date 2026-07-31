import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/admin/auth";
import { getWebsiteSettings, saveWebsiteSettings } from "@/lib/admin/settings";
import { logAudit } from "@/lib/admin/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getWebsiteSettings();
  return NextResponse.json(settings);
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let patch: Record<string, unknown>;
  try {
    patch = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  try {
    const next = await saveWebsiteSettings(patch, session.sub);
    await logAudit(session.sub, "update_website_settings", { keys: Object.keys(patch) });
    return NextResponse.json(next);
  } catch (err) {
    console.error("save website settings failed", err);
    return NextResponse.json({ error: "Failed to save settings." }, { status: 500 });
  }
}
