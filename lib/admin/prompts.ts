import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase";

export interface Prompt {
  id: string;
  key: string;
  name: string;
  content: string;
  updated_at: string;
}

export interface PromptVersion {
  id: string;
  prompt_id: string;
  content: string;
  created_at: string;
}

export async function listPrompts(): Promise<Prompt[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];
  const { data, error } = await supabase.from("prompts").select("*").order("name");
  if (error) throw error;
  return data ?? [];
}

export async function getPromptByKey(key: string): Promise<Prompt | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  const { data, error } = await supabase.from("prompts").select("*").eq("key", key).maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function createPrompt(key: string, name: string, content: string): Promise<Prompt> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase
    .from("prompts")
    .insert({ key, name, content })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/** Updates a prompt's content and snapshots the previous content into prompt_versions. */
export async function updatePrompt(
  id: string,
  content: string,
  adminId: string
): Promise<Prompt> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase is not configured.");

  const { data: existing, error: fetchErr } = await supabase
    .from("prompts")
    .select("*")
    .eq("id", id)
    .single();
  if (fetchErr) throw fetchErr;

  // Snapshot the version being replaced so it can be restored later.
  const { error: versionErr } = await supabase
    .from("prompt_versions")
    .insert({ prompt_id: id, content: existing.content, created_by: adminId });
  if (versionErr) throw versionErr;

  const { data, error } = await supabase
    .from("prompts")
    .update({ content, updated_at: new Date().toISOString(), updated_by: adminId })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deletePrompt(id: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error } = await supabase.from("prompts").delete().eq("id", id);
  if (error) throw error;
}

export async function listPromptVersions(promptId: string): Promise<PromptVersion[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("prompt_versions")
    .select("*")
    .eq("prompt_id", promptId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function restorePromptVersion(
  promptId: string,
  versionId: string,
  adminId: string
): Promise<Prompt> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data: version, error: vErr } = await supabase
    .from("prompt_versions")
    .select("*")
    .eq("id", versionId)
    .eq("prompt_id", promptId)
    .single();
  if (vErr) throw vErr;
  return updatePrompt(promptId, version.content, adminId);
}

/** Fetches the live system prompt content, falling back to a default when Supabase isn't configured. */
export async function getActiveSystemPrompt(fallback: string): Promise<string> {
  try {
    const prompt = await getPromptByKey("system");
    return prompt?.content || fallback;
  } catch {
    return fallback;
  }
}
