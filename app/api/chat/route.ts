import { NextRequest } from "next/server";
import { streamGroqResponse, extractTextFromSseLine } from "@/lib/groq";
import { checkRateLimit } from "@/lib/rate-limit";
import { ChatApiMessage, ChatApiRequest } from "@/types";
import { getChatSettings } from "@/lib/admin/settings";
import { getActiveSystemPrompt } from "@/lib/admin/prompts";
import { logEvent } from "@/lib/admin/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_MESSAGES = 60;
const MAX_MESSAGE_LENGTH = 24_000;
const VALID_LENGTHS = ["concise", "balanced", "detailed"];
const MAX_ATTACHMENTS_PER_MESSAGE = 6;
const MAX_BASE64_CHARS = 20 * 1024 * 1024; // ~15MB decoded, base64 overhead included
const MAX_TEXT_ATTACHMENT_CHARS = 60_000;
const VALID_ATTACHMENT_KINDS = ["image", "pdf", "text", "docx"];

function badRequest(message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status: 400,
    headers: { "Content-Type": "application/json" },
  });
}

function sanitizeText(text: string) {
  // Strip control characters that have no business in chat text while
  // leaving newlines/tabs intact.
  return text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
}

function isValidAttachment(a: unknown): boolean {
  if (!a || typeof a !== "object") return false;
  const att = a as Record<string, unknown>;
  if (typeof att.name !== "string" || typeof att.mimeType !== "string") return false;
  if (typeof att.kind !== "string" || !VALID_ATTACHMENT_KINDS.includes(att.kind)) return false;
  if (att.dataBase64 !== undefined) {
    if (typeof att.dataBase64 !== "string" || att.dataBase64.length > MAX_BASE64_CHARS) return false;
  }
  if (att.textContent !== undefined) {
    if (typeof att.textContent !== "string" || att.textContent.length > MAX_TEXT_ATTACHMENT_CHARS)
      return false;
  }
  if (!att.dataBase64 && !att.textContent) return false;
  return true;
}

function validateMessages(messages: unknown): messages is ChatApiMessage[] {
  if (!Array.isArray(messages) || messages.length === 0) return false;
  if (messages.length > MAX_MESSAGES) return false;
  return messages.every((m) => {
    if (
      !m ||
      typeof m !== "object" ||
      (m.role !== "user" && m.role !== "assistant") ||
      typeof m.content !== "string" ||
      m.content.length > MAX_MESSAGE_LENGTH
    ) {
      return false;
    }
    if (m.attachments !== undefined) {
      if (!Array.isArray(m.attachments) || m.attachments.length > MAX_ATTACHMENTS_PER_MESSAGE) {
        return false;
      }
      if (!m.attachments.every(isValidAttachment)) return false;
    }
    // A message must carry either text or at least one attachment.
    if (m.content.length === 0 && (!m.attachments || m.attachments.length === 0)) return false;
    return true;
  });
}

export async function POST(req: NextRequest) {
  // --- Load admin-configured chat settings (falls back to env/defaults if
  // Supabase isn't configured, so the account-free app keeps working as-is)
  const chatSettings = await getChatSettings().catch(() => null);

  // --- Rate limiting -------------------------------------------------
  const limitPerMinute =
    chatSettings?.rateLimitPerMinute ?? Number(process.env.RATE_LIMIT_PER_MINUTE ?? 20);
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "anonymous";
  const rate = checkRateLimit(ip, limitPerMinute);
  if (!rate.allowed) {
    logEvent("rate_limited", { ip });
    return new Response(
      JSON.stringify({
        error: "You're sending messages too quickly. Please wait a moment and try again.",
        code: "RATE_LIMITED",
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(Math.ceil(rate.resetInMs / 1000)),
        },
      }
    );
  }

  // --- Validation ------------------------------------------------------
  let payload: ChatApiRequest;
  try {
    payload = await req.json();
  } catch {
    return badRequest("Request body must be valid JSON.");
  }

  if (!validateMessages(payload.messages)) {
    return badRequest("`messages` must be a non-empty array of { role, content } objects.");
  }

  const model = "llama-3.3-70b-versatile";
  const temperature =
    typeof payload.temperature === "number" && payload.temperature >= 0 && payload.temperature <= 2
      ? payload.temperature
      : chatSettings?.temperature ?? 0.7;
  const responseLength = VALID_LENGTHS.includes(payload.responseLength ?? "")
    ? (payload.responseLength as ChatApiRequest["responseLength"])
    : "balanced";

  const sanitizedMessages = payload.messages.map((m) => ({
    role: m.role,
    content: sanitizeText(m.content),
    attachments: m.attachments?.map((a) => ({
      ...a,
      name: sanitizeText(a.name),
      textContent: a.textContent ? sanitizeText(a.textContent) : undefined,
    })),
  }));

  if (!process.env.GROQ_API_KEY) {
    return new Response(
      JSON.stringify({
        error:
          "The server is missing a GROQ_API_KEY. Add one to your .env.local file (see .env.example) and restart the dev server.",
        code: "MISSING_API_KEY",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // --- Call Groq and re-stream as plain text chunks ------------------
  const systemPrompt = await getActiveSystemPrompt("").catch(() => "");
  const lastUserMessage = [...sanitizedMessages].reverse().find((m) => m.role === "user");
  logEvent("message_sent", { preview: lastUserMessage?.content?.slice(0, 120) ?? "", model });

  try {
    const upstream = await streamGroqResponse({
      messages: sanitizedMessages,
      model,
      temperature,
      responseLength: responseLength ?? "balanced",
      signal: req.signal,
      systemPrompt: systemPrompt || undefined,
    });

    if (!upstream.ok || !upstream.body) {
      const errText = await upstream.text().catch(() => "");
      let message = "The AI provider returned an error. Please try again.";
      let code = "UPSTREAM_ERROR";

      if (upstream.status === 429) {
        message = "The AI provider is rate-limiting requests right now. Please wait and try again.";
        code = "UPSTREAM_RATE_LIMITED";
      } else if (upstream.status === 401 || upstream.status === 403) {
        message = "The server's Groq API key was rejected. Check GROQ_API_KEY.";
        code = "INVALID_API_KEY";
      } else if (upstream.status === 400) {
        message = "The request was rejected by the AI provider (it may violate content policy).";
        code = "UPSTREAM_BAD_REQUEST";
      }

      console.error("Groq upstream error", upstream.status, errText);
      logEvent("chat_error", { status: upstream.status, code });
      return new Response(JSON.stringify({ error: message, code }), {
        status: upstream.status >= 400 && upstream.status < 600 ? upstream.status : 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const reader = upstream.body.getReader();

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let buffer = "";
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              const text = extractTextFromSseLine(line);
              if (text) controller.enqueue(encoder.encode(text));
            }
          }
          controller.close();
        } catch (err) {
          console.error("Stream read error", err);
          controller.error(err);
        }
      },
      cancel() {
        reader.cancel().catch(() => {});
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return new Response(null, { status: 499 });
    }
    console.error("Chat route error", err);
    logEvent("chat_error", { code: "INTERNAL_ERROR" });
    return new Response(
      JSON.stringify({
        error: "Something went wrong while contacting the AI provider.",
        code: "INTERNAL_ERROR",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
