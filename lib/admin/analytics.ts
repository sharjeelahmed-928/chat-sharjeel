import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase";

export type AnalyticsEventType = "message_sent" | "chat_error" | "file_uploaded" | "rate_limited";

/**
 * Fire-and-forget event logger. Never throws — analytics must never be able
 * to break the chat request it's instrumenting. Safe no-op if Supabase isn't
 * configured.
 */
export async function logEvent(
  eventType: AnalyticsEventType,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) return;
    await supabase.from("analytics_events").insert({ event_type: eventType, metadata });
  } catch (err) {
    console.error("analytics logEvent failed", err);
  }
}

export async function logAudit(
  adminId: string,
  action: string,
  details: Record<string, unknown> = {}
): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) return;
    await supabase.from("audit_logs").insert({ admin_id: adminId, action, details });
  } catch (err) {
    console.error("audit log failed", err);
  }
}

export interface DashboardStats {
  totalMessages: number;
  messagesToday: number;
  messagesLast7Days: { date: string; count: number }[];
  totalErrors: number;
  errorsToday: number;
  filesUploadedToday: number;
  rateLimitedToday: number;
  popularQuestions: { question: string; count: number }[];
  recentActivity: { type: string; createdAt: string; metadata: Record<string, unknown> }[];
}

function startOfTodayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = getSupabaseAdmin();
  const empty: DashboardStats = {
    totalMessages: 0,
    messagesToday: 0,
    messagesLast7Days: [],
    totalErrors: 0,
    errorsToday: 0,
    filesUploadedToday: 0,
    rateLimitedToday: 0,
    popularQuestions: [],
    recentActivity: [],
  };
  if (!supabase) return empty;

  const todayIso = startOfTodayIso();
  const sevenDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const [
    { count: totalMessages },
    { count: messagesToday },
    { count: totalErrors },
    { count: errorsToday },
    { count: filesUploadedToday },
    { count: rateLimitedToday },
    { data: last7 },
    { data: recent },
  ] = await Promise.all([
    supabase.from("analytics_events").select("id", { count: "exact", head: true }).eq("event_type", "message_sent"),
    supabase
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .eq("event_type", "message_sent")
      .gte("created_at", todayIso),
    supabase.from("analytics_events").select("id", { count: "exact", head: true }).eq("event_type", "chat_error"),
    supabase
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .eq("event_type", "chat_error")
      .gte("created_at", todayIso),
    supabase
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .eq("event_type", "file_uploaded")
      .gte("created_at", todayIso),
    supabase
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .eq("event_type", "rate_limited")
      .gte("created_at", todayIso),
    supabase
      .from("analytics_events")
      .select("created_at, metadata")
      .eq("event_type", "message_sent")
      .gte("created_at", sevenDaysAgo.toISOString()),
    supabase
      .from("analytics_events")
      .select("event_type, created_at, metadata")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  // Bucket the last 7 days of messages by calendar date.
  const buckets = new Map<string, number>();
  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenDaysAgo);
    d.setDate(d.getDate() + i);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }
  for (const row of last7 ?? []) {
    const key = String(row.created_at).slice(0, 10);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  // Popular questions: first ~80 chars of each user message, counted.
  const questionCounts = new Map<string, number>();
  for (const row of last7 ?? []) {
    const q = (row.metadata as Record<string, unknown> | null)?.preview;
    if (typeof q === "string" && q.trim()) {
      const key = q.trim().slice(0, 80);
      questionCounts.set(key, (questionCounts.get(key) ?? 0) + 1);
    }
  }
  const popularQuestions = [...questionCounts.entries()]
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([question, count]) => ({ question, count }));

  return {
    totalMessages: totalMessages ?? 0,
    messagesToday: messagesToday ?? 0,
    messagesLast7Days: [...buckets.entries()].map(([date, count]) => ({ date, count })),
    totalErrors: totalErrors ?? 0,
    errorsToday: errorsToday ?? 0,
    filesUploadedToday: filesUploadedToday ?? 0,
    rateLimitedToday: rateLimitedToday ?? 0,
    popularQuestions,
    recentActivity: (recent ?? []).map((r) => ({
      type: r.event_type,
      createdAt: r.created_at,
      metadata: (r.metadata ?? {}) as Record<string, unknown>,
    })),
  };
}
