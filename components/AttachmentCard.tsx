"use client";

import { FileText, FileImage, File as FileIcon, Loader2, X, AlertTriangle } from "lucide-react";
import { Attachment } from "@/types";
import { formatFileSize } from "@/lib/files";
import { cn } from "@/lib/utils";

interface AttachmentCardProps {
  attachment: Attachment;
  onRemove?: (id: string) => void;
  compact?: boolean;
}

function KindIcon({ kind }: { kind: Attachment["kind"] }) {
  if (kind === "image") return <FileImage className="h-4 w-4" />;
  if (kind === "pdf" || kind === "docx") return <FileText className="h-4 w-4" />;
  return <FileIcon className="h-4 w-4" />;
}

export function AttachmentCard({ attachment, onRemove, compact }: AttachmentCardProps) {
  const isImage = attachment.kind === "image" && attachment.previewUrl;

  return (
    <div
      className={cn(
        "group relative flex items-center gap-2 rounded-xl border border-border bg-surface pr-2 shadow-sm",
        compact ? "h-14 w-52" : "h-16 w-60",
        attachment.status === "error" && "border-destructive/40 bg-destructive/5"
      )}
    >
      <div
        className={cn(
          "flex h-full w-14 shrink-0 items-center justify-center overflow-hidden rounded-l-xl bg-muted",
          attachment.status === "error" && "bg-destructive/10"
        )}
      >
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={attachment.previewUrl}
            alt={attachment.name}
            className="h-full w-full object-cover"
          />
        ) : attachment.status === "error" ? (
          <AlertTriangle className="h-4 w-4 text-destructive" />
        ) : (
          <KindIcon kind={attachment.kind} />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium" title={attachment.name}>
          {attachment.name}
        </p>
        {attachment.status === "error" ? (
          <p className="truncate text-[11px] text-destructive" title={attachment.error}>
            {attachment.error}
          </p>
        ) : attachment.status === "reading" ? (
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Reading…
          </span>
        ) : (
          <p className="text-[11px] text-muted-foreground">{formatFileSize(attachment.size)}</p>
        )}
      </div>

      {onRemove && (
        <button
          type="button"
          onClick={() => onRemove(attachment.id)}
          aria-label={`Remove ${attachment.name}`}
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
