import { NextResponse } from "next/server";
import { getPublicSettings } from "@/lib/admin/settings";

export const runtime = "nodejs";
// Cached briefly at the edge/CDN since these values change rarely; keeps the
// admin panel's writes affecting the live site within a minute without
// hitting Supabase on every page load.
export const revalidate = 30;

export async function GET() {
  try {
    const settings = await getPublicSettings();
    return NextResponse.json(settings, {
      headers: { "Cache-Control": "public, max-age=0, s-maxage=30, stale-while-revalidate=60" },
    });
  } catch (err) {
    console.error("public settings failed", err);
    return NextResponse.json({ error: "Failed to load settings." }, { status: 500 });
  }
}
