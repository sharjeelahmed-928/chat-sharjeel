"use client";

import { useCallback, useRef, useState } from "react";
import { Attachment } from "@/types";
import { classifyFile, readAttachment, validateFile } from "@/lib/files";

function newAttachmentId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `att-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useFileUpload() {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const objectUrlsRef = useRef<Set<string>>(new Set());

  const addFiles = useCallback((files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) return;

    setAttachments((prev) => {
      let totalBytes = prev.reduce((sum, a) => sum + a.size, 0);
      let count = prev.length;
      const additions: Attachment[] = [];

      for (const file of list) {
        const validation = validateFile(file, totalBytes, count);
        const kind = classifyFile(file);
        const id = newAttachmentId();

        if (!validation.valid) {
          additions.push({
            id,
            name: file.name,
            size: file.size,
            mimeType: file.type,
            kind,
            status: "error",
            error: validation.error,
          });
          continue;
        }

        totalBytes += file.size;
        count += 1;
        additions.push({
          id,
          name: file.name,
          size: file.size,
          mimeType: file.type,
          kind,
          status: "reading",
        });

        // Read asynchronously; patch this attachment in place once done.
        readAttachment(file, kind)
          .then((result) => {
            if (result.previewUrl) objectUrlsRef.current.add(result.previewUrl);
            setAttachments((curr) =>
              curr.map((a) => (a.id === id ? { ...a, ...result, status: "ready" } : a))
            );
          })
          .catch((err) => {
            setAttachments((curr) =>
              curr.map((a) =>
                a.id === id
                  ? {
                      ...a,
                      status: "error",
                      error: err instanceof Error ? err.message : "Failed to read file.",
                    }
                  : a
              )
            );
          });
      }

      return [...prev, ...additions];
    });
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => {
      const target = prev.find((a) => a.id === id);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
        objectUrlsRef.current.delete(target.previewUrl);
      }
      return prev.filter((a) => a.id !== id);
    });
  }, []);

  const clearAttachments = useCallback(() => {
    for (const url of objectUrlsRef.current) URL.revokeObjectURL(url);
    objectUrlsRef.current.clear();
    setAttachments([]);
  }, []);

  const isUploading = attachments.some((a) => a.status === "reading");
  const hasBlockingErrors = attachments.some((a) => a.status === "error");

  return {
    attachments,
    addFiles,
    removeAttachment,
    clearAttachments,
    isUploading,
    hasBlockingErrors,
  };
}
