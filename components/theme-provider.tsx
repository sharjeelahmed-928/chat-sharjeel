"use client";

import { createContext, useContext, useEffect } from "react";
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
  useEffect(() => {
    const root = document.documentElement;

    root.style.setProperty("--accent", hexToHsl(theme.primary));
    root.style.setProperty("--ring", hexToHsl(theme.primary));
    root.style.setProperty("--assistant-rail", hexToHsl(theme.primary));
    root.style.setProperty("--user-rail", hexToHsl(theme.secondary));

    root.style.setProperty("--background", hexToHsl(theme.background));
    root.style.setProperty("--foreground", hexToHsl(theme.foreground));

    root.style.setProperty("--surface", hexToHsl(theme.background));
    root.style.setProperty("--surface-raised", hexToHsl(theme.background));
  }, [theme]);

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}