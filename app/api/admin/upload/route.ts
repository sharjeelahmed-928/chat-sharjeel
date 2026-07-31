import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 500 }
    );
  }

  const form = await req.formData();

  const file = form.get("file") as File;
  const folder = (form.get("folder") as string) || "uploads";

  if (!file) {
    return NextResponse.json(
      { error: "No file" },
      { status: 400 }
    );
  }

  const fileName = `${folder}/${Date.now()}-${file.name}`;

  const { error } = await supabase.storage
    .from("assets")
    .upload(fileName, file);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  const { data } = supabase.storage
    .from("assets")
    .getPublicUrl(fileName);

  return NextResponse.json({
    url: data.publicUrl,
  });
}