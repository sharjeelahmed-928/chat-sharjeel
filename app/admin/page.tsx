import { MessageSquare, AlertTriangle, FileUp, ShieldAlert, TrendingUp } from "lucide-react";
import { getDashboardStats } from "@/lib/admin/analytics";
import { isSupabaseConfigured } from "@/lib/supabase";
import { StatCard } from "@/components/admin/StatCard";
import { MessagesChart } from "@/components/admin/MessagesChart";

export default async function AdminDashboardPage() {
  const configured = isSupabaseConfigured();
  const stats = await getDashboardStats();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Live usage stats, sourced from real chat activity.
        </p>
      </div>

      {!configured && (
        <div className="rounded-xl border border-border bg-surface p-4 text-sm text-muted-foreground">
          Supabase isn&apos;t configured yet, so these numbers are all zero. Set{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">SUPABASE_URL</code> and{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">SUPABASE_SERVICE_ROLE_KEY</code>{" "}
          and run the migration to start collecting data.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Total Messages" value={stats.totalMessages} icon={MessageSquare} />
        <StatCard label="Messages Today" value={stats.messagesToday} icon={TrendingUp} />
        <StatCard label="Errors Today" value={stats.errorsToday} icon={AlertTriangle} tone="destructive" />
        <StatCard label="Files Uploaded Today" value={stats.filesUploadedToday} icon={FileUp} />
        <StatCard label="Rate-Limited Today" value={stats.rateLimitedToday} icon={ShieldAlert} />
      </div>

      <div className="rounded-xl border border-border bg-surface p-4">
        <h2 className="text-sm font-medium">Messages — last 7 days</h2>
        <div className="mt-2">
          <MessagesChart data={stats.messagesLast7Days} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-4">
          <h2 className="text-sm font-medium">Popular questions</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Repeated within the last 7 days</p>
          <ul className="mt-3 space-y-2">
            {stats.popularQuestions.length === 0 && (
              <li className="text-sm text-muted-foreground">Not enough repeated questions yet.</li>
            )}
            {stats.popularQuestions.map((q, i) => (
              <li key={i} className="flex items-start justify-between gap-3 text-sm">
                <span className="line-clamp-1 text-foreground">{q.question}</span>
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  ×{q.count}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4">
          <h2 className="text-sm font-medium">Recent activity</h2>
          <ul className="mt-3 space-y-2">
            {stats.recentActivity.length === 0 && (
              <li className="text-sm text-muted-foreground">No activity recorded yet.</li>
            )}
            {stats.recentActivity.map((a, i) => (
              <li key={i} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-foreground">{a.type.replace(/_/g, " ")}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {new Date(a.createdAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
