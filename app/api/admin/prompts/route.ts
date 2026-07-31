import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/admin/auth";
import { createPrompt, listPrompts } from "@/lib/admin/prompts";
import { logAudit } from "@/lib/admin/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const prompts = await listPrompts();
    return NextResponse.json(prompts);
  } catch (err) {
    console.error("list prompts failed", err);
    return NextResponse.json({ error: "Failed to load prompts." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { key?: string; name?: string; content?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const key = (body.key ?? "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-");
  const name = (body.name ?? "").trim();
  const content = body.content ?? "";

  if (!key || !name) {
    return NextResponse.json({ error: "key and name are required." }, { status: 400 });
  }

  try {
    const prompt = await createPrompt(key, name, content);
    await logAudit(session.sub, "create_prompt", { key });
    return NextResponse.json(prompt, { status: 201 });
  } catch (err) {
    console.error("create prompt failed", err);
    return NextResponse.json({ error: "Failed to create prompt (key may already exist)." }, { status: 500 });
  }
}
