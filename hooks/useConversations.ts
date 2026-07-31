"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { storage } from "@/lib/storage";
import { deriveTitle } from "@/lib/utils";
import { AppSettings, Attachment, ChatApiAttachment, ChatApiMessage, Conversation, Message } from "@/types";

function newId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function newConversation(): Conversation {
  const now = Date.now();
  return {
    id: newId(),
    title: "New chat",
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
}

/** Drops browser-only fields (preview URLs, in-progress status) before sending to the API. */
function toApiAttachments(attachments?: Attachment[]): ChatApiAttachment[] | undefined {
  if (!attachments || attachments.length === 0) return undefined;
  const ready = attachments.filter((a) => a.status === "ready");
  if (ready.length === 0) return undefined;
  return ready.map((a) => ({
    name: a.name,
    mimeType: a.mimeType,
    kind: a.kind,
    dataBase64: a.dataBase64,
    textContent: a.textContent,
  }));
}

export type ChatErrorCode =
  | "RATE_LIMITED"
  | "MISSING_API_KEY"
  | "INVALID_API_KEY"
  | "UPSTREAM_ERROR"
  | "UPSTREAM_RATE_LIMITED"
  | "UPSTREAM_BAD_REQUEST"
  | "NETWORK_ERROR"
  | "INTERNAL_ERROR"
  | "ABORTED";

interface SendOptions {
  settings: Pick<AppSettings, "model" | "temperature" | "responseLength">;
}

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Hydrate from localStorage on mount.
  useEffect(() => {
    const loaded = storage.loadConversations();
    setConversations(loaded);
    setActiveId(loaded[0]?.id ?? null);
    setHydrated(true);
  }, []);

  // Persist on every change (post-hydration).
  useEffect(() => {
    if (!hydrated) return;
    storage.saveConversations(conversations);
  }, [conversations, hydrated]);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId]
  );

  const createConversation = useCallback(() => {
    const convo = newConversation();
    setConversations((prev) => [convo, ...prev]);
    setActiveId(convo.id);
    return convo.id;
  }, []);

  const selectConversation = useCallback((id: string) => {
    setActiveId(id);
  }, []);

  const deleteConversation = useCallback((id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    setActiveId((current) => (current === id ? null : current));
  }, []);

  const renameConversation = useCallback((id: string, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: trimmed, updatedAt: Date.now() } : c))
    );
  }, []);

  const togglePin = useCallback((id: string) => {
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c)));
  }, []);

  const clearAllConversations = useCallback(() => {
    setConversations([]);
    setActiveId(null);
  }, []);

  const updateConversationMessages = useCallback(
    (id: string, updater: (messages: Message[]) => Message[]) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, messages: updater(c.messages), updatedAt: Date.now() } : c
        )
      );
    },
    []
  );

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
  }, []);

  const runGeneration = useCallback(
    async (conversationId: string, history: Message[], { settings }: SendOptions) => {
      const assistantId = newId();
      const controller = new AbortController();
      abortRef.current = controller;
      setIsStreaming(true);

      updateConversationMessages(conversationId, (msgs) => [
        ...msgs,
        { id: assistantId, role: "assistant", content: "", createdAt: Date.now(), pending: true },
      ]);

      const apiMessages: ChatApiMessage[] = history.map((m) => ({
        role: m.role,
        content: m.content,
        attachments: toApiAttachments(m.attachments),
      }));

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: apiMessages,
            model: settings.model,
            temperature: settings.temperature,
            responseLength: settings.responseLength,
          }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          let errorMessage = "Something went wrong. Please try again.";
          try {
            const data = await res.json();
            if (data?.error) errorMessage = data.error;
          } catch {
            /* non-JSON error body */
          }
          updateConversationMessages(conversationId, (msgs) =>
            msgs.map((m) =>
              m.id === assistantId ? { ...m, pending: false, error: errorMessage } : m
            )
          );
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
          const snapshot = accumulated;
          updateConversationMessages(conversationId, (msgs) =>
            msgs.map((m) => (m.id === assistantId ? { ...m, content: snapshot } : m))
          );
        }

        updateConversationMessages(conversationId, (msgs) =>
          msgs.map((m) => (m.id === assistantId ? { ...m, pending: false } : m))
        );
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          updateConversationMessages(conversationId, (msgs) =>
            msgs.map((m) => (m.id === assistantId ? { ...m, pending: false } : m))
          );
        } else {
          updateConversationMessages(conversationId, (msgs) =>
            msgs.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    pending: false,
                    error: "Network error — check your connection and try again.",
                  }
                : m
            )
          );
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [updateConversationMessages]
  );

  const sendMessage = useCallback(
    async (text: string, attachments: Attachment[], options: SendOptions) => {
      const trimmed = text.trim();
      if ((!trimmed && attachments.length === 0) || isStreaming) return;

      let conversationId = activeId;
      let isFirstMessage = false;

      if (!conversationId) {
        const convo = newConversation();
        conversationId = convo.id;
        isFirstMessage = true;
        setConversations((prev) => [convo, ...prev]);
        setActiveId(convo.id);
      } else {
        const existing = conversations.find((c) => c.id === conversationId);
        isFirstMessage = (existing?.messages.length ?? 0) === 0;
      }

      const userMessage: Message = {
        id: newId(),
        role: "user",
        content: trimmed,
        createdAt: Date.now(),
        attachments: attachments.length > 0 ? attachments : undefined,
      };

      let fullHistory: Message[] = [];
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== conversationId) return c;
          fullHistory = [...c.messages, userMessage];
          return {
            ...c,
            title: isFirstMessage ? deriveTitle(trimmed || attachments[0]?.name || "New chat") : c.title,
            messages: fullHistory,
            updatedAt: Date.now(),
          };
        })
      );

      // Wait a tick so the state update above is reflected before we read
      // `fullHistory` (captured synchronously via the updater above).
      await runGeneration(conversationId, fullHistory, options);
    },
    [activeId, conversations, isStreaming, runGeneration]
  );

  const regenerate = useCallback(
    async (options: SendOptions) => {
      if (!activeConversation || isStreaming) return;
      const messages = activeConversation.messages;
      const lastUserIdx = [...messages].reverse().findIndex((m) => m.role === "user");
      if (lastUserIdx === -1) return;
      const cutIdx = messages.length - 1 - lastUserIdx;
      const trimmedHistory = messages.slice(0, cutIdx + 1);

      updateConversationMessages(activeConversation.id, () => trimmedHistory);
      await runGeneration(activeConversation.id, trimmedHistory, options);
    },
    [activeConversation, isStreaming, runGeneration, updateConversationMessages]
  );

  /** Edits a user message, drops everything after it, and regenerates the reply. */
  const editMessage = useCallback(
    async (id: string, newText: string, options: SendOptions) => {
      if (!activeConversation || isStreaming) return;
      const trimmed = newText.trim();
      if (!trimmed) return;

      const idx = activeConversation.messages.findIndex((m) => m.id === id);
      if (idx === -1) return;

      const edited: Message = {
        ...activeConversation.messages[idx],
        content: trimmed,
        edited: true,
      };
      const truncatedHistory = [...activeConversation.messages.slice(0, idx), edited];

      updateConversationMessages(activeConversation.id, () => truncatedHistory);
      await runGeneration(activeConversation.id, truncatedHistory, options);
    },
    [activeConversation, isStreaming, runGeneration, updateConversationMessages]
  );

  return {
    conversations,
    activeConversation,
    activeId,
    isStreaming,
    hydrated,
    createConversation,
    selectConversation,
    deleteConversation,
    renameConversation,
    togglePin,
    clearAllConversations,
    setConversations,
    sendMessage,
    regenerate,
    editMessage,
    stopGeneration,
  };
}
