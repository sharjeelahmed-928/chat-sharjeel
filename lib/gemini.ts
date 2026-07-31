import { AppSettings, ChatApiMessage } from "@/types";

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

const LENGTH_TOKEN_MAP: Record<AppSettings["responseLength"], number> = {
  concise: 512,
  balanced: 2048,
  detailed: 8192,
};

interface GeminiTextPart {
  text: string;
}
interface GeminiInlineDataPart {
  inline_data: { mime_type: string; data: string };
}
type GeminiPart = GeminiTextPart | GeminiInlineDataPart;

function toGeminiContents(messages: ChatApiMessage[]) {
  return messages.map((m) => {
    const parts: GeminiPart[] = [];
    const textBlocks: string[] = [];
    const inlineParts: GeminiInlineDataPart[] = [];

    for (const attachment of m.attachments ?? []) {
      if ((attachment.kind === "image" || attachment.kind === "pdf") && attachment.dataBase64) {
        // Gemini natively parses both images (vision) and PDFs (document
        // understanding) when passed as inline_data — no separate OCR or
        // PDF-parsing step needed on our side.
        inlineParts.push({
          inline_data: { mime_type: attachment.mimeType, data: attachment.dataBase64 },
        });
      } else if (attachment.textContent) {
        textBlocks.push(
          `--- Attached file: ${attachment.name} ---\n${attachment.textContent}\n--- End of ${attachment.name} ---`
        );
      }
    }

    if (m.content) textBlocks.push(m.content);

    // Inline data parts first so Gemini has the visual/document context
    // before reading the accompanying instructions.
    parts.push(...inlineParts);
    if (textBlocks.length > 0) parts.push({ text: textBlocks.join("\n\n") });
    if (parts.length === 0) parts.push({ text: "" });

    return {
      role: m.role === "assistant" ? "model" : "user",
      parts,
    };
  });
}

interface StreamOptions {
  messages: ChatApiMessage[];
  model: string;
  temperature: number;
  responseLength: AppSettings["responseLength"];
  signal?: AbortSignal;
  /** Optional system instruction, sourced from the admin-editable System Prompt. */
  systemPrompt?: string;
}

/**
 * Calls Gemini's streaming generateContent endpoint and returns the raw
 * fetch Response so the caller can pipe its body straight through to the
 * client as an SSE-like stream of text chunks.
 */
export async function streamGeminiResponse({
  messages,
  model,
  temperature,
  responseLength,
  signal,
  systemPrompt,
}: StreamOptions) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server.");
  }

  const url = `${GEMINI_BASE_URL}/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

  const body = {
    contents: toGeminiContents(messages),
    ...(systemPrompt
      ? { system_instruction: { parts: [{ text: systemPrompt }] } }
      : {}),
    generationConfig: {
      temperature,
      maxOutputTokens: LENGTH_TOKEN_MAP[responseLength],
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
    ],
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  return response;
}

/**
 * Parses a single SSE "data: {...}" line from the Gemini stream and
 * extracts the incremental text delta, if any.
 */
export function extractTextFromSseLine(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("data:")) return null;
  const jsonStr = trimmed.slice(5).trim();
  if (!jsonStr || jsonStr === "[DONE]") return null;

  try {
    const parsed = JSON.parse(jsonStr);
    const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
    return typeof text === "string" ? text : null;
  } catch {
    return null;
  }
}
