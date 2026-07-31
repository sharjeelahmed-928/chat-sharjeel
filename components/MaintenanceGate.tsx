"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { X } from "lucide-react";

export function MaintenanceGate({
  children,
  maintenanceMode,
  maintenanceMessage,
  announcementEnabled,
  announcementText,
}: {
  children: React.ReactNode;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  announcementEnabled: boolean;
  announcementText: string;
}) {
  const pathname = usePathname();
  const [dismissed, setDismissed] = useState(false);
  const isAdminRoute = pathname?.startsWith("/admin");

  // The admin panel must always be reachable, even during maintenance mode,
  // so admins can turn it back off.
  if (maintenanceMode && !isAdminRoute) {
    return (
      <div className="flex h-dvh w-full flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          We&apos;ll be right back
        </h1>
        <p className="max-w-md text-sm text-muted-foreground">{maintenanceMessage}</p>
      </div>
    );
  }

  return (
    <>
      {announcementEnabled && announcementText && !dismissed && !isAdminRoute && (
        <div className="flex items-center justify-center gap-3 bg-accent/15 px-4 py-2 text-center text-xs text-accent-foreground">
          <span>{announcementText}</span>
          <button
            aria-label="Dismiss announcement"
            onClick={() => setDismissed(true)}
            className="rounded p-0.5 hover:bg-accent/20"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
      {children}
    </>
  );
}
