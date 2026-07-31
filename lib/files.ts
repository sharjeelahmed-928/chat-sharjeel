import { Attachment, AttachmentKind } from "@/types";

export const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB per file
export const MAX_TOTAL_ATTACHMENTS_SIZE_BYTES = 30 * 1024 * 1024; // 30MB per message
export const MAX_ATTACHMENTS_PER_MESSAGE = 6;
export const MAX_EXTRACTED_TEXT_CHARS = 60_000; // guard against megabyte-sized text dumps

const IMAGE_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const PDF_MIME_TYPE = "application/pdf";
const TEXT_MIME_TYPES = new Set(["text/plain", "text/markdown"]);
const DOCX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const EXTENSION_KIND_MAP: Record<string, AttachmentKind> = {
  png: "image",
  jpg: "image",
  jpeg: "image",
  webp: "image",
  pdf: "pdf",
  txt: "text",
  md: "text",
  markdown: "text",
  docx: "docx",
};

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot + 1).toLowerCase();
}

export function classifyFile(file: File): AttachmentKind {
  if (IMAGE_MIME_TYPES.has(file.type)) return "image";
  if (file.type === PDF_MIME_TYPE) return "pdf";
  if (TEXT_MIME_TYPES.has(file.type)) return "text";
  if (file.type === DOCX_MIME_TYPE) return "docx";
  // Some browsers/OSes don't set a reliable MIME type — fall back to extension.
  const byExt = EXTENSION_KIND_MAP[extensionOf(file.name)];
  return byExt ?? "unsupported";
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export function validateFile(
  file: File,
  currentTotalBytes: number,
  currentCount: number
): FileValidationResult {
  const kind = classifyFile(file);
  if (kind === "unsupported") {
    return {
      valid: false,
      error: "Unsupported file type. Use PDF, DOCX, TXT, Markdown, PNG, JPG, or WebP.",
    };
  }
  if (file.size === 0) {
    return { valid: false, error: "This file is empty." };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File is too large (max ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB).`,
    };
  }
  if (currentCount >= MAX_ATTACHMENTS_PER_MESSAGE) {
    return { valid: false, error: `You can attach at most ${MAX_ATTACHMENTS_PER_MESSAGE} files.` };
  }
  if (currentTotalBytes + file.size > MAX_TOTAL_ATTACHMENTS_SIZE_BYTES) {
    return {
      valid: false,
      error: `Total attachments exceed ${MAX_TOTAL_ATTACHMENTS_SIZE_BYTES / (1024 * 1024)}MB.`,
    };
  }
  return { valid: true };
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

function readAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsArrayBuffer(file);
  });
}

function truncateText(text: string): string {
  if (text.length <= MAX_EXTRACTED_TEXT_CHARS) return text;
  return (
    text.slice(0, MAX_EXTRACTED_TEXT_CHARS) +
    `\n\n[…truncated, ${text.length - MAX_EXTRACTED_TEXT_CHARS} more characters omitted]`
  );
}

/**
 * Reads a File into a partial Attachment. Images and PDFs are base64-encoded
 * for Gemini's inline-data multimodal input; text/markdown/docx are
 * extracted to plain text and inlined into the prompt instead.
 */
export async function readAttachment(
  file: File,
  kind: AttachmentKind
): Promise<Pick<Attachment, "dataBase64" | "textContent" | "previewUrl">> {
  if (kind === "image" || kind === "pdf") {
    const dataUrl = await readAsDataURL(file);
    const base64 = dataUrl.split(",")[1] ?? "";
    return {
      dataBase64: base64,
      previewUrl: kind === "image" ? URL.createObjectURL(file) : undefined,
    };
  }

  if (kind === "text") {
    const text = await readAsText(file);
    return { textContent: truncateText(text) };
  }

  if (kind === "docx") {
    // Dynamically imported so mammoth's browser bundle never enters the
    // server bundle / SSR path.
    const mammoth = (await import("mammoth")).default;
    const buffer = await readAsArrayBuffer(file);
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    return { textContent: truncateText(result.value) };
  }

  throw new Error("Unsupported file type.");
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
