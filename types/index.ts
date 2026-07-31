export type Role = "user" | "assistant";

/** What kind of content an attachment carries and how the model should read it. */
export type AttachmentKind = "image" | "pdf" | "text" | "docx" | "unsupported";

export type AttachmentStatus = "reading" | "ready" | "error";

export interface Attachment {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  kind: AttachmentKind;
  status: AttachmentStatus;
  error?: string;
  /** Base64 (no data: prefix) — used for images and PDFs sent to Groq as inline data. */
  dataBase64?: string;
  /** Extracted plain text — used for txt/md/docx, inlined into the prompt. */
  textContent?: string;
  /** Local object URL for image thumbnails. Revoked when the attachment is removed. */
  previewUrl?: string;
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
  /** true while the assistant response is still streaming in */
  pending?: boolean;
  /** set when a message failed to send / generate */
  error?: string;
  /** files attached to this (user) message */
  attachments?: Attachment[];
  /** true if this message has been edited from its original content */
  edited?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  pinned?: boolean;
  messages: Message[];
}

export type ThemeMode = "light" | "dark" | "system";

export interface AppSettings {
  theme: ThemeMode;
  model: string;
  responseLength: "concise" | "balanced" | "detailed";
  temperature: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "system",
  model: "llama-3.3-70b-versatile",
  responseLength: "balanced",
  temperature: 0.7,
};

export const AVAILABLE_MODELS = [
  { id: "llama-3.3-70b-versatile", label: "llama-3.3-70b-versatile — fast & versatile" },
  { id: "llama-3.3-70b-versatile", label: "llama-3.3-70b-versatile-Lite — fastest" },
  { id: "llama-3.3-70b-versatile", label: "llama-3.3-70b-versatilePro — most capable" },
] as const;

/** Slimmed-down attachment payload sent to /api/chat — only what Groq needs. */
export interface ChatApiAttachment {
  name: string;
  mimeType: string;
  kind: AttachmentKind;
  dataBase64?: string;
  textContent?: string;
}

export interface ChatApiMessage {
  role: Role;
  content: string;
  attachments?: ChatApiAttachment[];
}

export interface ChatApiRequest {
  messages: ChatApiMessage[];
  model?: string;
  temperature?: number;
  responseLength?: AppSettings["responseLength"];
}

export interface ExportBundle {
  version: 1;
  exportedAt: number;
  conversations: Conversation[];
}
