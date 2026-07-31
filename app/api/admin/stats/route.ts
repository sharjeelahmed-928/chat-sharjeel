import { NextResponse } from "next/server";
import { getSession } from "@/lib/admin/auth";
import { getDashboardStats } from "@/lib/admin/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const stats = await getDashboardStats();
    return NextResponse.json(stats);
  } catch (err) {
    console.error("dashboard stats failed", err);
    return NextResponse.json({ error: "Failed to load stats." }, { status: 500 });
  }
}
