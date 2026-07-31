import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/admin/auth";
import { listPromptVersions } from "@/lib/admin/prompts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  try {
    const versions = await listPromptVersions(id);
    return NextResponse.json(versions);
  } catch (err) {
    console.error("list prompt versions failed", err);
    return NextResponse.json({ error: "Failed to load version history." }, { status: 500 });
  }
}
