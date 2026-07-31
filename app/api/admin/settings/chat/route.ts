import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/admin/auth";
import { getChatSettings, saveChatSettings } from "@/lib/admin/settings";
import { logAudit } from "@/lib/admin/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getChatSettings();
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

  if (
    "temperature" in patch &&
    (typeof patch.temperature !== "number" || patch.temperature < 0 || patch.temperature > 2)
  ) {
    return NextResponse.json({ error: "temperature must be a number between 0 and 2." }, { status: 400 });
  }
  if (
    "rateLimitPerMinute" in patch &&
    (typeof patch.rateLimitPerMinute !== "number" || patch.rateLimitPerMinute < 1)
  ) {
    return NextResponse.json({ error: "rateLimitPerMinute must be a positive number." }, { status: 400 });
  }

  try {
    const next = await saveChatSettings(patch, session.sub);
    await logAudit(session.sub, "update_chat_settings", { keys: Object.keys(patch) });
    return NextResponse.json(next);
  } catch (err) {
    console.error("save chat settings failed", err);
    return NextResponse.json({ error: "Failed to save settings." }, { status: 500 });
  }
}
