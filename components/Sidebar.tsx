"use client";

import { useMemo, useState } from "react";
import {
  MessageSquarePlus,
  Search,
  Pin,
  PinOff,
  Pencil,
  Trash2,
  Check,
  X,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { Conversation } from "@/types";
import { cn, formatRelativeDate, truncate } from "@/lib/utils";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface SidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onTogglePin: (id: string) => void;
}

function groupConversations(conversations: Conversation[]) {
  const pinned = conversations.filter((c) => c.pinned);
  const rest = conversations.filter((c) => !c.pinned).sort((a, b) => b.updatedAt - a.updatedAt);

  const groups: { label: string; items: Conversation[] }[] = [];
  if (pinned.length) groups.push({ label: "Pinned", items: pinned });

  const buckets = new Map<string, Conversation[]>();
  for (const c of rest) {
    const label = formatRelativeDate(c.updatedAt);
    if (!buckets.has(label)) buckets.set(label, []);
    buckets.get(label)!.push(c);
  }
  for (const [label, items] of buckets) groups.push({ label, items });

  return groups;
}

export function Sidebar({
  conversations,
  activeId,
  collapsed,
  onToggleCollapsed,
  onSelect,
  onCreate,
  onDelete,
  onRename,
  onTogglePin,
}: SidebarProps) {
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return conversations;
    const q = query.toLowerCase();
    return conversations.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.messages.some((m) => m.content.toLowerCase().includes(q))
    );
  }, [conversations, query]);

  const groups = useMemo(() => groupConversations(filtered), [filtered]);

  function startEditing(c: Conversation) {
    setEditingId(c.id);
    setEditValue(c.title);
  }

  function commitEdit() {
    if (editingId) onRename(editingId, editValue);
    setEditingId(null);
  }

  if (collapsed) {
    return (
      <div className="flex h-full w-14 flex-col items-center gap-2 border-r border-border bg-surface py-3">
        <Button variant="ghost" size="icon" onClick={onToggleCollapsed} aria-label="Expand sidebar">
          <PanelLeft className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onCreate} aria-label="New chat">
          <MessageSquarePlus className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full w-72 shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex items-center justify-between gap-2 px-3 py-3">
        <span className="font-display text-sm font-semibold tracking-tight">
          chat.sharjeel.space
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapsed}
          aria-label="Collapse sidebar"
        >
          <PanelLeftClose className="h-4 w-4" />
        </Button>
      </div>

      <div className="px-3">
        <Button className="w-full justify-start gap-2 rounded-xl" onClick={onCreate}>
          <MessageSquarePlus className="h-4 w-4" />
          New chat
        </Button>
      </div>

      <div className="px-3 pt-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats"
            className="pl-8"
            aria-label="Search chats"
          />
        </div>
      </div>

      <nav className="scrollbar-thin mt-2 flex-1 overflow-y-auto px-2 pb-3" aria-label="Chat history">
        {groups.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">
            {query ? "No chats match your search." : "No chats yet — start one above."}
          </p>
        )}
        {groups.map((group) => (
          <div key={group.label} className="mb-3">
            <p className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {group.label}
            </p>
            {group.items.map((c) => (
              <div
                key={c.id}
                className={cn(
                  "group relative flex items-center gap-1 rounded-lg px-2 py-2 text-sm transition-colors",
                  c.id === activeId ? "bg-muted" : "hover:bg-muted/60"
                )}
              >
                {editingId === c.id ? (
                  <div className="flex flex-1 items-center gap-1">
                    <Input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitEdit();
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className="h-7 text-sm"
                    />
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={commitEdit}>
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setEditingId(null)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => onSelect(c.id)}
                      className="flex-1 truncate text-left"
                      title={c.title}
                    >
                      {truncate(c.title, 30)}
                    </button>
                    <div className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => onTogglePin(c.id)}
                        aria-label={c.pinned ? "Unpin chat" : "Pin chat"}
                      >
                        {c.pinned ? (
                          <PinOff className="h-3.5 w-3.5" />
                        ) : (
                          <Pin className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => startEditing(c)}
                        aria-label="Rename chat"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 hover:text-destructive"
                        onClick={() => setConfirmingDeleteId(c.id)}
                        aria-label="Delete chat"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </>
                )}

                {confirmingDeleteId === c.id && (
                  <div className="absolute right-0 top-9 z-10 w-48 rounded-lg border border-border bg-popover p-2 text-xs shadow-lg">
                    <p className="mb-2">Delete this chat? This can&apos;t be undone.</p>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => setConfirmingDeleteId(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => {
                          onDelete(c.id);
                          setConfirmingDeleteId(null);
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </nav>
    </div>
  );
}
