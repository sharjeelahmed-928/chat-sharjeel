import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/admin/auth";
import { deletePrompt, updatePrompt } from "@/lib/admin/prompts";
import { logAudit } from "@/lib/admin/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  let body: { content?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  if (typeof body.content !== "string") {
    return NextResponse.json({ error: "content is required." }, { status: 400 });
  }

  try {
    const prompt = await updatePrompt(id, body.content, session.sub);
    await logAudit(session.sub, "update_prompt", { id });
    return NextResponse.json(prompt);
  } catch (err) {
    console.error("update prompt failed", err);
    return NextResponse.json({ error: "Failed to update prompt." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "super_admin") {
    return NextResponse.json({ error: "Only super_admin can delete prompts." }, { status: 403 });
  }
  const { id } = await params;

  try {
    await deletePrompt(id);
    await logAudit(session.sub, "delete_prompt", { id });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("delete prompt failed", err);
    return NextResponse.json({ error: "Failed to delete prompt." }, { status: 500 });
  }
}
