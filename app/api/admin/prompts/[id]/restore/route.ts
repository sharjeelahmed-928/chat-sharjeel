import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/admin/auth";
import { restorePromptVersion } from "@/lib/admin/prompts";
import { logAudit } from "@/lib/admin/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  let body: { versionId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  if (!body.versionId) {
    return NextResponse.json({ error: "versionId is required." }, { status: 400 });
  }

  try {
    const prompt = await restorePromptVersion(id, body.versionId, session.sub);
    await logAudit(session.sub, "restore_prompt_version", { id, versionId: body.versionId });
    return NextResponse.json(prompt);
  } catch (err) {
    console.error("restore prompt version failed", err);
    return NextResponse.json({ error: "Failed to restore version." }, { status: 500 });
  }
}
