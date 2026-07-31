"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import type { ChatSettings } from "@/lib/admin/settings";

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <h2 className="text-sm font-medium">{title}</h2>
      {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <div className={`space-y-1.5 ${full ? "sm:col-span-2" : ""}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export default function ChatSettingsPage() {
  const [settings, setSettings] = useState<ChatSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [suggestionsText, setSuggestionsText] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings/chat")
      .then((r) => r.json())
      .then((data: ChatSettings) => {
        setSettings(data);
        setSuggestionsText(data.defaultSuggestions.join("\n"));
      });
  }, []);

  function set<K extends keyof ChatSettings>(key: K, value: ChatSettings[K]) {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    setMessage(null);
    const payload: ChatSettings = {
      ...settings,
      defaultSuggestions: suggestionsText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    };
    try {
      const res = await fetch("/api/admin/settings/chat", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSettings(data);
      setMessage("Saved.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  }

  if (!settings) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Chat Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Model defaults, generation parameters, and the welcome experience.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {message && <span className="text-xs text-muted-foreground">{message}</span>}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>

      <Section title="Model Defaults" description="Used whenever the client doesn't override these per-request.">
        <Field label="Default Model">
          <Input value={settings.defaultModel} onChange={(e) => set("defaultModel", e.target.value)} />
        </Field>
        <Field label="Max Tokens">
          <Input
            type="number"
            value={settings.maxTokens}
            onChange={(e) => set("maxTokens", Number(e.target.value))}
          />
        </Field>
        <Field label={`Temperature — ${settings.temperature.toFixed(2)}`}>
          <Slider
            min={0}
            max={2}
            step={0.05}
            value={[settings.temperature]}
            onValueChange={([v]) => set("temperature", v)}
          />
        </Field>
        <Field label={`Top P — ${settings.topP.toFixed(2)}`}>
          <Slider min={0} max={1} step={0.05} value={[settings.topP]} onValueChange={([v]) => set("topP", v)} />
        </Field>
        <Field label={`Top K — ${settings.topK}`}>
          <Slider min={1} max={100} step={1} value={[settings.topK]} onValueChange={([v]) => set("topK", v)} />
        </Field>
        <Field label="Rate Limit (messages / minute / IP)">
          <Input
            type="number"
            min={1}
            value={settings.rateLimitPerMinute}
            onChange={(e) => set("rateLimitPerMinute", Number(e.target.value))}
          />
        </Field>
      </Section>

      <Section title="Feature Toggles">
        {(
          [
            { key: "streamingEnabled", label: "Streaming" },
            { key: "visionEnabled", label: "Vision (image understanding)" },
            { key: "webSearchEnabled", label: "Web Search" },
            { key: "markdownEnabled", label: "Markdown Rendering" },
          ] as const
        ).map(({ key, label }) => (
          <Field key={key} label={label}>
            <div className="flex items-center gap-2 pt-1">
              <Switch checked={settings[key]} onCheckedChange={(v) => set(key, v)} />
            </div>
          </Field>
        ))}
      </Section>

      <Section title="Welcome Experience">
        <Field label="Welcome Message">
          <Input value={settings.welcomeMessage} onChange={(e) => set("welcomeMessage", e.target.value)} />
        </Field>
        <Field label="Input Placeholder">
          <Input value={settings.placeholderText} onChange={(e) => set("placeholderText", e.target.value)} />
        </Field>
        <Field label="Default Suggestions (one per line)" full>
          <Textarea value={suggestionsText} onChange={(e) => setSuggestionsText(e.target.value)} rows={4} />
        </Field>
      </Section>
    </div>
  );
}
