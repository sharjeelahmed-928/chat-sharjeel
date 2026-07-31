import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase";
import { hashPassword } from "@/lib/admin/auth";

export interface AdminUserRow {
  id: string;
  email: string;
  role: "super_admin" | "admin";
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
}

export async function listAdminUsers(): Promise<AdminUserRow[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("admin_users")
    .select("id, email, role, is_active, created_at, last_login_at")
    .order("created_at");
  if (error) throw error;
  return data ?? [];
}

export async function countAdminUsers(): Promise<number> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return 0;
  const { count, error } = await supabase
    .from("admin_users")
    .select("id", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

export async function findAdminByEmail(email: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("admin_users")
    .select("*")
    .eq("email", email.toLowerCase().trim())
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createAdminUser(
  email: string,
  password: string,
  role: "super_admin" | "admin" = "admin"
): Promise<AdminUserRow> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase is not configured.");
  const password_hash = await hashPassword(password);
  const { data, error } = await supabase
    .from("admin_users")
    .insert({ email: email.toLowerCase().trim(), password_hash, role })
    .select("id, email, role, is_active, created_at, last_login_at")
    .single();
  if (error) throw error;
  return data;
}

export async function setAdminUserActive(id: string, isActive: boolean): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error } = await supabase.from("admin_users").update({ is_active: isActive }).eq("id", id);
  if (error) throw error;
}

export async function touchLastLogin(id: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;
  await supabase.from("admin_users").update({ last_login_at: new Date().toISOString() }).eq("id", id);
}
