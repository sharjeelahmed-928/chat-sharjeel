import { AppSettings, ChatApiMessage } from "@/types";

const GROQ_BASE_URL = "https://api.groq.com/openai/v1/chat/completions";

const LENGTH_TOKEN_MAP: Record<AppSettings["responseLength"], number> = {
  concise: 512,
  balanced: 2048,
  detailed: 8192,
};

interface StreamOptions {
  messages: ChatApiMessage[];
  model: string;
  temperature: number;
  responseLength: AppSettings["responseLength"];
  signal?: AbortSignal;
  systemPrompt?: string;
}

function toGroqMessages(
  messages: ChatApiMessage[],
  systemPrompt?: string
) {
  const result: {
    role: "system" | "user" | "assistant";
    content: string;
  }[] = [];

  if (systemPrompt) {
    result.push({
      role: "system",
      content: systemPrompt,
    });
  }

  for (const message of messages) {
    let content = message.content;

    for (const attachment of message.attachments ?? []) {
      if (attachment.textContent) {
        content += `

--- Attached file: ${attachment.name} ---
${attachment.textContent}
--- End of ${attachment.name} ---`;
      }
    }

    result.push({
      role: message.role,
      content,
    });
  }

  return result;
}

export async function streamGroqResponse({
  messages,
  model,
  temperature,
  responseLength,
  signal,
  systemPrompt,
}: StreamOptions) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured.");
  }

  return fetch(GROQ_BASE_URL, {
    method: "POST",
    signal,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: toGroqMessages(messages, systemPrompt),
      temperature,
      max_tokens: LENGTH_TOKEN_MAP[responseLength],
      stream: true,
    }),
  });
}

export function extractTextFromSseLine(line: string): string | null {
  const trimmed = line.trim();

  if (!trimmed.startsWith("data:")) {
    return null;
  }

  const json = trimmed.slice(5).trim();

  if (!json || json === "[DONE]") {
    return null;
  }

  try {
    const parsed = JSON.parse(json);

    return (
      parsed?.choices?.[0]?.delta?.content ??
      null
    );
  } catch {
    return null;
  }
}