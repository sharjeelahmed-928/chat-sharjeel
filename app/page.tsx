"use client";

import { useEffect, useState } from "react";
import { Settings, WifiOff } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { ChatWindow } from "@/components/ChatWindow";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SettingsDialog } from "@/components/SettingsDialog";
import { Button } from "@/components/ui/button";
import { useConversations } from "@/hooks/useConversations";
import { useSettings } from "@/hooks/useSettings";
import { Attachment } from "@/types";
import type { PublicSettings } from "@/lib/admin/settings";

export default function Home() {
  const {
    conversations,
    activeConversation,
    activeId,
    isStreaming,
    createConversation,
    selectConversation,
    deleteConversation,
    renameConversation,
    togglePin,
    clearAllConversations,
    setConversations,
    sendMessage,
    regenerate,
    editMessage,
    stopGeneration,
  } = useConversations();

  const { settings, updateSettings } = useSettings();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [publicSettings, setPublicSettings] = useState<PublicSettings | null>(null);

  // Admin-editable branding/welcome copy. Silently falls back to the
  // built-in defaults already baked into WelcomeScreen/ChatInput if this
  // fetch fails or the admin panel isn't configured.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/public/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data && !data.error) setPublicSettings(data as PublicSettings);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // Collapse the sidebar by default on small screens.
  useEffect(() => {
    if (window.innerWidth < 768) setSidebarCollapsed(true);
  }, []);

  // Global keyboard shortcuts: Cmd/Ctrl+K → new chat.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        createConversation();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [createConversation]);

  function handleSend(text: string, attachments: Attachment[]) {
    sendMessage(text, attachments, { settings });
  }

  function handleRegenerate() {
    regenerate({ settings });
  }

  function handleEditMessage(id: string, text: string) {
    editMessage(id, text, { settings });
  }

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((v) => !v)}
        onSelect={selectConversation}
        onCreate={createConversation}
        onDelete={deleteConversation}
        onRename={renameConversation}
        onTogglePin={togglePin}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border px-4 py-2.5 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="font-display text-sm font-semibold tracking-tight sm:hidden">
              {publicSettings?.siteName ?? "chat.sharjeel.space"}
            </span>
            <h1 className="hidden truncate text-sm font-medium text-muted-foreground sm:block">
              {activeConversation?.title ?? "New chat"}
            </h1>
          </div>
          <div className="flex items-center gap-1">
            {!isOnline && (
              <span className="mr-1 flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-1 text-xs text-destructive">
                <WifiOff className="h-3 w-3" />
                Offline
              </span>
            )}
            <ThemeToggle theme={settings.theme} onChange={(theme) => updateSettings({ theme })} />
            <Button
              variant="ghost"
              size="icon"
              aria-label="Open settings"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <ChatWindow
          conversation={activeConversation}
          isStreaming={isStreaming}
          onSend={handleSend}
          onStop={stopGeneration}
          onRegenerate={handleRegenerate}
          onEditMessage={handleEditMessage}
          welcomeTitle={publicSettings?.welcomeMessage}
          welcomePrompts={publicSettings?.defaultSuggestions}
          placeholderText={publicSettings?.placeholderText}
        />
      </div>

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={settings}
        onUpdateSettings={updateSettings}
        onClearAllChats={clearAllConversations}
        onImportConversations={setConversations}
      />
    </div>
  );
}
