import { getSession } from "@/lib/admin/auth";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  // No session: middleware already redirects protected /admin/* pages to
  // /admin/login before they ever reach this layout, so if we get here
  // without a session it's the login page itself — render it bare, no
  // sidebar chrome.
  if (!session) {
    return <div className="min-h-dvh bg-background">{children}</div>;
  }

  return (
    <div className="flex min-h-dvh w-full bg-gray-100 dark:bg-gray-950">
      <AdminSidebar role={session.role} />
      <main className="min-w-0 flex-1 overflow-y-auto bg-gray-100 dark:bg-gray-950">
        <div className="mx-auto max-w-5xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
