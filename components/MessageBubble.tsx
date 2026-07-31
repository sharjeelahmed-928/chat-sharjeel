"use client";

import { useState } from "react";
import { Check, Copy, RotateCcw, AlertTriangle, Pencil, X } from "lucide-react";
import { Message } from "@/types";
import { cn, formatTime } from "@/lib/utils";
import { Markdown } from "./Markdown";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { AttachmentCard } from "./AttachmentCard";

interface MessageBubbleProps {
  message: Message;
  isLast: boolean;
  onRegenerate?: () => void;
  onEdit?: (id: string, text: string) => void;
  disabled?: boolean;
}

export function MessageBubble({ message, isLast, onRegenerate, onEdit, disabled }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const isUser = message.role === "user";

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  function startEdit() {
    setDraft(message.content);
    setIsEditing(true);
  }

  function commitEdit() {
    const trimmed = draft.trim();
    if (trimmed && onEdit) onEdit(message.id, trimmed);
    setIsEditing(false);
  }

  return (
    <div className="group animate-fade-in flex gap-3 px-4 py-4 sm:px-6">
      {/* Signature: a colored margin rail marks the speaker, manuscript-style */}
      <div
        className={cn(
          "mt-1 h-full w-[3px] shrink-0 self-stretch rounded-full",
          isUser ? "bg-user" : "bg-assistant"
        )}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-baseline gap-2">
          <span className="font-display text-sm font-semibold">
            {isUser ? "You" : "Assistant"}
          </span>
          <span className="text-xs text-muted-foreground">{formatTime(message.createdAt)}</span>
          {message.edited && <span className="text-xs text-muted-foreground">(edited)</span>}
        </div>

        {message.attachments && message.attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {message.attachments.map((a) => (
              <AttachmentCard key={a.id} attachment={a} compact />
            ))}
          </div>
        )}

        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  commitEdit();
                }
                if (e.key === "Escape") setIsEditing(false);
              }}
              className="min-h-[80px] text-[0.95rem]"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                <X className="mr-1 h-3.5 w-3.5" />
                Cancel
              </Button>
              <Button variant="accent" size="sm" onClick={commitEdit}>
                <Check className="mr-1 h-3.5 w-3.5" />
                Save &amp; resend
              </Button>
            </div>
          </div>
        ) : message.error ? (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{message.error}</span>
          </div>
        ) : isUser ? (
          <p className="whitespace-pre-wrap text-[0.95rem] leading-7">{message.content}</p>
        ) : (
          <>
            <Markdown content={message.content} />
            {message.pending && message.content.length === 0 && (
              <span className="inline-flex gap-1 py-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
              </span>
            )}
            {message.pending && message.content.length > 0 && (
              <span
                className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse bg-foreground/70"
                aria-hidden
              />
            )}
          </>
        )}

        {!isEditing && !message.pending && !message.error && (
          <div className="mt-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            {isUser ? (
              onEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 px-2"
                  onClick={startEdit}
                  disabled={disabled}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
              )
            ) : (
              <>
                <Button variant="ghost" size="sm" className="h-7 gap-1 px-2" onClick={handleCopy}>
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
                {isLast && onRegenerate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 px-2"
                    onClick={onRegenerate}
                    disabled={disabled}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Regenerate
                  </Button>
                )}
              </>
            )}
          </div>
        )}

        {message.error && isLast && onRegenerate && (
          <Button variant="outline" size="sm" className="mt-2 gap-1" onClick={onRegenerate} disabled={disabled}>
            <RotateCcw className="h-3.5 w-3.5" />
            Retry
          </Button>
        )}
      </div>
    </div>
  );
}
