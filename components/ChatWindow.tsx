"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown } from "lucide-react";
import { Attachment, Conversation } from "@/types";
import { MessageBubble } from "./MessageBubble";
import { WelcomeScreen } from "./WelcomeScreen";
import { ChatInput } from "./ChatInput";
import { Button } from "./ui/button";

interface ChatWindowProps {
  conversation: Conversation | null;
  isStreaming: boolean;
  onSend: (text: string, attachments: Attachment[]) => void;
  onStop: () => void;
  onRegenerate: () => void;
  onEditMessage: (id: string, text: string) => void;
  welcomeTitle?: string;
  welcomeSubtitle?: string;
  welcomePrompts?: string[];
  placeholderText?: string;
}

export function ChatWindow({
  conversation,
  isStreaming,
  onSend,
  onStop,
  onRegenerate,
  onEditMessage,
  welcomeTitle,
  welcomeSubtitle,
  welcomePrompts,
  placeholderText,
}: ChatWindowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const messages = conversation?.messages ?? [];
  const lastAssistantIdx = [...messages].map((m) => m.role).lastIndexOf("assistant");
  const lastMessageContent = messages.at(-1)?.content;

  // Auto-scroll to bottom on new messages / streaming content, but only if
  // the user is already near the bottom — otherwise let them read in peace.
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    if (distanceFromBottom < 150) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages.length, lastMessageContent]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    function handleScroll() {
      if (!container) return;
      const distanceFromBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight;
      setShowScrollButton(distanceFromBottom > 300);
    }
    container.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => container.removeEventListener("scroll", handleScroll);
  }, [conversation?.id]);

  function scrollToBottom() {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }

  // Escape stops an in-flight generation from anywhere in the window.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isStreaming) onStop();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isStreaming, onStop]);

  return (
    <div className="relative flex h-full flex-1 flex-col overflow-hidden">
      <div ref={scrollRef} className="scrollbar-thin flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <WelcomeScreen
            onPick={(text) => onSend(text, [])}
            title={welcomeTitle}
            subtitle={welcomeSubtitle}
            prompts={welcomePrompts}
          />
        ) : (
          <div className="mx-auto max-w-3xl pb-4">
            {messages.map((message, idx) => (
              <MessageBubble
                key={message.id}
                message={message}
                isLast={idx === lastAssistantIdx}
                onRegenerate={idx === lastAssistantIdx ? onRegenerate : undefined}
                onEdit={message.role === "user" ? onEditMessage : undefined}
                disabled={isStreaming}
              />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {showScrollButton && (
        <Button
          size="icon"
          variant="outline"
          className="absolute bottom-24 left-1/2 h-9 w-9 -translate-x-1/2 rounded-full shadow-md"
          onClick={scrollToBottom}
          aria-label="Scroll to latest message"
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
      )}

      <ChatInput onSend={onSend} isStreaming={isStreaming} onStop={onStop} placeholder={placeholderText} />
    </div>
  );
}
