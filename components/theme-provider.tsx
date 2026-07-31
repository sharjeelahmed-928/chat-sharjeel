"use client";

import { createContext, useContext } from "react";
import { hexToHsl } from "@/lib/theme";

export interface ThemeSettings {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  foreground: string;
}

const ThemeContext = createContext<ThemeSettings>({
  primary: "#2563eb",
  secondary: "#1e293b",
  accent: "#3b82f6",
  background: "#ffffff",
  foreground: "#111827",
});

export function ThemeProvider({
  theme,
  children,
}: {
  theme: ThemeSettings;
  children: React.ReactNode;
}) {
  return (
    <ThemeContext.Provider value={theme}>
      <div
        style={
        {
            "--accent": hexToHsl(theme.primary),
            "--ring": hexToHsl(theme.primary),
            "--assistant-rail": hexToHsl(theme.primary),
            "--user-rail": hexToHsl(theme.secondary),
        } as React.CSSProperties
        }
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}