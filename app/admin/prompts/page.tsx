"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { History, Plus, Trash2 } from "lucide-react";

interface Prompt {
  id: string;
  key: string;
  name: string;
  content: string;
  updated_at: string;
}

interface PromptVersion {
  id: string;
  content: string;
  created_at: string;
}

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [showVersions, setShowVersions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newName, setNewName] = useState("");

  const selected = prompts.find((p) => p.id === selectedId) ?? null;

  function loadPrompts() {
    fetch("/api/admin/prompts")
      .then((r) => r.json())
      .then((data: Prompt[]) => {
        setPrompts(data);
        if (!selectedId && data.length > 0) {
          setSelectedId(data[0].id);
          setContent(data[0].content);
        }
      });
  }

  useEffect(loadPrompts, []); // eslint-disable-line react-hooks/exhaustive-deps

  function selectPrompt(p: Prompt) {
    setSelectedId(p.id);
    setContent(p.content);
    setShowVersions(false);
  }

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/prompts/${selected.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPrompts((prev) => prev.map((p) => (p.id === data.id ? data : p)));
      setMessage("Saved — previous version snapshotted to history.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 4000);
    }
  }

  async function loadVersions() {
    if (!selected) return;
    setShowVersions(true);
    const res = await fetch(`/api/admin/prompts/${selected.id}/versions`);
    setVersions(await res.json());
  }

  async function restoreVersion(versionId: string) {
    if (!selected) return;
    const res = await fetch(`/api/admin/prompts/${selected.id}/restore`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ versionId }),
    });
    const data = await res.json();
    if (res.ok) {
      setContent(data.content);
      setPrompts((prev) => prev.map((p) => (p.id === data.id ? data : p)));
      setMessage("Version restored.");
      loadVersions();
    }
  }

  async function handleCreate() {
    if (!newKey.trim() || !newName.trim()) return;
    const res = await fetch("/api/admin/prompts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: newKey, name: newName, content: "" }),
    });
    if (res.ok) {
      const prompt = await res.json();
      setPrompts((prev) => [...prev, prompt]);
      setSelectedId(prompt.id);
      setContent("");
      setCreating(false);
      setNewKey("");
      setNewName("");
    }
  }

  async function handleDelete() {
    if (!selected || !confirm(`Delete prompt "${selected.name}"? This can't be undone.`)) return;
    const res = await fetch(`/api/admin/prompts/${selected.id}`, { method: "DELETE" });
    if (res.ok) {
      setPrompts((prev) => prev.filter((p) => p.id !== selected.id));
      setSelectedId(null);
      setContent("");
    }
  }

  return (
    <div className="flex gap-6">
      <aside className="w-56 shrink-0 space-y-1">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xs font-medium text-muted-foreground">Prompts</h2>
          <button onClick={() => setCreating((v) => !v)} aria-label="New prompt" className="rounded p-1 hover:bg-muted">
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        {creating && (
          <div className="mb-2 space-y-2 rounded-lg border border-border p-2">
            <Input placeholder="key" value={newKey} onChange={(e) => setNewKey(e.target.value)} className="h-8 text-xs" />
            <Input placeholder="Name" value={newName} onChange={(e) => setNewName(e.target.value)} className="h-8 text-xs" />
            <Button size="sm" className="w-full" onClick={handleCreate}>
              Create
            </Button>
          </div>
        )}
        {prompts.map((p) => (
          <button
            key={p.id}
            onClick={() => selectPrompt(p)}
            className={`block w-full truncate rounded-lg px-3 py-2 text-left text-sm ${
              p.id === selectedId ? "bg-accent/15 font-medium text-accent" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {p.name}
          </button>
        ))}
      </aside>

      <div className="min-w-0 flex-1 space-y-4">
        {!selected ? (
          <p className="text-sm text-muted-foreground">Select or create a prompt to edit.</p>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-xl font-semibold tracking-tight">{selected.name}</h1>
                <p className="text-xs text-muted-foreground">
                  key: <code>{selected.key}</code> · updated {new Date(selected.updated_at).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {message && <span className="text-xs text-muted-foreground">{message}</span>}
                <Button variant="ghost" size="sm" onClick={loadVersions}>
                  <History className="mr-1.5 h-3.5 w-3.5" />
                  History
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDelete}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>

            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={16}
              className="font-mono text-sm"
            />

            {showVersions && (
              <div className="rounded-xl border border-border bg-surface p-4">
                <h3 className="text-sm font-medium">Version history</h3>
                <ul className="mt-2 divide-y divide-border">
                  {versions.length === 0 && (
                    <li className="py-2 text-sm text-muted-foreground">No previous versions yet.</li>
                  )}
                  {versions.map((v) => (
                    <li key={v.id} className="flex items-center justify-between gap-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs text-muted-foreground">{v.content.slice(0, 100)}</p>
                        <p className="text-xs text-muted-foreground/70">
                          {new Date(v.created_at).toLocaleString()}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => restoreVersion(v.id)}>
                        Restore
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
