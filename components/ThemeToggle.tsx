"use client";

import { Moon, Sun, Monitor } from "lucide-react";
import { ThemeMode } from "@/types";
import { Button } from "./ui/button";

const ORDER: ThemeMode[] = ["light", "dark", "system"];
const ICON = { light: Sun, dark: Moon, system: Monitor };
const LABEL = { light: "Light mode", dark: "Dark mode", system: "System theme" };

export function ThemeToggle({
  theme,
  onChange,
}: {
  theme: ThemeMode;
  onChange: (t: ThemeMode) => void;
}) {
  const Icon = ICON[theme];

  function cycle() {
    const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
    onChange(next);
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={cycle}
      aria-label={`Switch theme (currently ${LABEL[theme]})`}
      title={LABEL[theme]}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}
