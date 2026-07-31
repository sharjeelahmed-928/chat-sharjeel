"use client";

import { useCallback, useEffect, useState } from "react";
import { storage } from "@/lib/storage";
import { AppSettings, DEFAULT_SETTINGS } from "@/types";

function applyTheme(theme: AppSettings["theme"]) {
  if (typeof document === "undefined") return;
  const isDark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", isDark);
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const loaded = storage.loadSettings();
    setSettings(loaded);
    applyTheme(loaded.theme);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (settings.theme !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [settings.theme]);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      storage.saveSettings(next);
      if (patch.theme) applyTheme(patch.theme);
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    storage.saveSettings(DEFAULT_SETTINGS);
    setSettings(DEFAULT_SETTINGS);
    applyTheme(DEFAULT_SETTINGS.theme);
  }, []);

  return { settings, updateSettings, resetSettings, hydrated };
}
