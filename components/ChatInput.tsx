"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Paperclip, Square } from "lucide-react";
import { Button } from "./ui/button";
import { AttachmentCard } from "./AttachmentCard";
import { useFileUpload } from "@/hooks/useFileUpload";
import { Attachment } from "@/types";
import { cn } from "@/lib/utils";

const ACCEPTED_TYPES =
  ".pdf,.docx,.txt,.md,.markdown,image/png,image/jpeg,image/webp,application/pdf," +
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown";

interface ChatInputProps {
  onSend: (text: string, attachments: Attachment[]) => void;
  isStreaming: boolean;
  onStop: () => void;
  initialValue?: string;
  placeholder?: string;
}

export function ChatInput({ onSend, isStreaming, onStop, initialValue, placeholder }: ChatInputProps) {
  const [value, setValue] = useState(initialValue ?? "");
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { attachments, addFiles, removeAttachment, clearAttachments, isUploading, hasBlockingErrors } =
    useFileUpload();

  useEffect(() => {
    if (initialValue) setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  const readyAttachments = attachments.filter((a) => a.status === "ready");
  const canSend =
    (value.trim().length > 0 || readyAttachments.length > 0) &&
    !isStreaming &&
    !isUploading &&
    !hasBlockingErrors;

  function handleSubmit() {
    if (!canSend) return;
    onSend(value, readyAttachments);
    setValue("");
    clearAttachments();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    if (!e.dataTransfer.types.includes("Files")) return;
    dragCounterRef.current += 1;
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
    if (dragCounterRef.current === 0) setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDragging(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  }

  return (
    <div
      className="relative border-t border-border bg-background/80 px-4 py-3 backdrop-blur sm:px-6"
      onDragEnter={handleDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-background/90">
          <div className="rounded-2xl border-2 border-dashed border-accent px-8 py-6 text-center">
            <Paperclip className="mx-auto mb-2 h-6 w-6 text-accent" />
            <p className="text-sm font-medium">Drop files to attach</p>
            <p className="text-xs text-muted-foreground">PDF, DOCX, TXT, Markdown, or images</p>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-3xl">
        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2" aria-label="Attached files">
            {attachments.map((a) => (
              <AttachmentCard key={a.id} attachment={a} onRemove={removeAttachment} compact />
            ))}
          </div>
        )}

        <div className="flex items-end gap-2 rounded-2xl border border-border bg-surface p-2 shadow-sm focus-within:ring-2 focus-within:ring-ring">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED_TYPES}
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <Button
            size="icon"
            variant="ghost"
            className="shrink-0 rounded-xl"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Attach files"
            disabled={isStreaming}
          >
            <Paperclip className="h-4 w-4" />
          </Button>

          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={placeholder || "Message the assistant… (Enter to send, Shift+Enter for a new line)"}
            aria-label="Message input"
            className="max-h-[200px] flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
          />
          {isStreaming ? (
            <Button
              size="icon"
              variant="destructive"
              className="shrink-0 rounded-xl"
              onClick={onStop}
              aria-label="Stop generating"
            >
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              size="icon"
              variant="accent"
              className={cn("shrink-0 rounded-xl", !canSend && "opacity-50")}
              onClick={handleSubmit}
              disabled={!canSend}
              aria-label="Send message"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <p className="mx-auto mt-2 max-w-3xl text-center text-[11px] text-muted-foreground">
        The assistant can make mistakes. Check important information.
      </p>
    </div>
  );
}
