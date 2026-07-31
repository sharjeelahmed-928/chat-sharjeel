"use client";

import { useRef, useState } from "react";
import { Download, Upload, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Slider } from "./ui/slider";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "./ui/select";
import { AppSettings, AVAILABLE_MODELS, Conversation, ThemeMode } from "@/types";
import { storage } from "@/lib/storage";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: AppSettings;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  onClearAllChats: () => void;
  onImportConversations: (conversations: Conversation[]) => void;
}

const RESPONSE_LENGTHS: { value: AppSettings["responseLength"]; label: string }[] = [
  { value: "concise", label: "Concise" },
  { value: "balanced", label: "Balanced" },
  { value: "detailed", label: "Detailed" },
];

const THEMES: { value: ThemeMode; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

export function SettingsDialog({
  open,
  onOpenChange,
  settings,
  onUpdateSettings,
  onClearAllChats,
  onImportConversations,
}: SettingsDialogProps) {
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleExport() {
    const bundle = storage.exportBundle();
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chat-sharjeel-space-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportClick() {
    setImportError(null);
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const imported = storage.importBundle(parsed);
      if (!imported) {
        setImportError("That file doesn't look like a valid export.");
        return;
      }
      onImportConversations(imported);
      setImportError(null);
    } catch {
      setImportError("Couldn't read that file. Make sure it's a valid JSON export.");
    } finally {
      e.target.value = "";
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Everything here is stored only on this device.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label>Theme</Label>
            <Select value={settings.theme} onValueChange={(v) => onUpdateSettings({ theme: v as ThemeMode })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {THEMES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Default AI model</Label>
            <Select value={settings.model} onValueChange={(v) => onUpdateSettings({ model: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_MODELS.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Response length</Label>
            <Select
              value={settings.responseLength}
              onValueChange={(v) => onUpdateSettings({ responseLength: v as AppSettings["responseLength"] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RESPONSE_LENGTHS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Temperature</Label>
              <span className="text-xs text-muted-foreground">{settings.temperature.toFixed(1)}</span>
            </div>
            <Slider
              value={[settings.temperature]}
              min={0}
              max={2}
              step={0.1}
              onValueChange={([v]) => onUpdateSettings({ temperature: v })}
            />
            <p className="text-xs text-muted-foreground">
              Lower is more focused and deterministic; higher is more creative and varied.
            </p>
          </div>

          <div className="space-y-2 border-t border-border pt-4">
            <Label>Your data</Label>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}>
                <Download className="h-3.5 w-3.5" />
                Export chats as JSON
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleImportClick}>
                <Upload className="h-3.5 w-3.5" />
                Import chats
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
            {importError && <p className="text-xs text-destructive">{importError}</p>}

            {confirmingClear ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">
                <p className="mb-2">Delete every chat on this device? This can&apos;t be undone.</p>
                <div className="flex gap-2">
                  <Button variant="destructive" size="sm" onClick={() => { onClearAllChats(); setConfirmingClear(false); }}>
                    Yes, delete everything
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmingClear(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-destructive hover:text-destructive"
                onClick={() => setConfirmingClear(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear all chats
              </Button>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
