"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

const DEFAULT_PROMPTS = [
  "Explain quantum computing like I'm 12",
  "Draft a polite email declining a meeting",
  "Give me 5 ideas for a weekend trip",
  "Help me debug a React useEffect loop",
];

export function WelcomeScreen({
  onPick,
  title = "What's on your mind?",
  subtitle = "No account needed — everything you send stays in your browser. Ask anything to get started.",
  prompts = DEFAULT_PROMPTS,
}: {
  onPick: (text: string) => void;
  title?: string;
  subtitle?: string;
  prompts?: string[];
}) {
  const PROMPTS = prompts.length > 0 ? prompts : DEFAULT_PROMPTS;
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15"
      >
        <Sparkles className="h-7 w-7 text-accent" />
      </motion.div>
      <motion.h1
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        className="font-display text-2xl font-semibold tracking-tight sm:text-3xl"
      >
        {title}
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        className="mt-2 max-w-md text-sm text-muted-foreground"
      >
        {subtitle}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.15 }}
        className="mt-8 grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-2"
      >
        {PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => onPick(prompt)}
            className="rounded-xl border border-border bg-surface px-4 py-3 text-left text-sm transition-colors hover:border-accent/50 hover:bg-muted"
          >
            {prompt}
          </button>
        ))}
      </motion.div>
    </div>
  );
}
