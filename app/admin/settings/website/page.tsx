"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import ImageUpload from "@/components/admin/ImageUpload";
import type { WebsiteSettings } from "@/lib/admin/settings";

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

export default function WebsiteSettingsPage() {
  const [settings, setSettings] = useState<WebsiteSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/settings/website")
      .then((r) => r.json())
      .then(setSettings);
  }, []);

  function set<K extends keyof WebsiteSettings>(key: K, value: WebsiteSettings[K]) {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function setSocial<K extends keyof WebsiteSettings["social"]>(key: K, value: string) {
    setSettings((prev) => (prev ? { ...prev, social: { ...prev.social, [key]: value } } : prev));
  }


  function setTheme<K extends keyof WebsiteSettings["theme"]>(
    key: K,
    value: string
  ) {
    setSettings((prev) =>
      prev
        ? {
            ...prev,
            theme: {
              ...prev.theme,
              [key]: value,
            },
          }
        : prev
    );
  }
  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/settings/website", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSettings(data);

      // Update CSS variables immediately
      document.documentElement.style.setProperty("--accent", data.theme.primary);
      document.documentElement.style.setProperty("--ring", data.theme.primary);

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
          <h1 className="font-display text-2xl font-semibold tracking-tight">Website Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Branding, SEO, footer, contact, and social links for the live site.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {message && <span className="text-xs text-muted-foreground">{message}</span>}
          <Button
            onClick={handleSave}
            disabled={saving}
           
          >
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>

      <Section title="Branding">
        <Field label="Site Name">
          <Input value={settings.siteName} onChange={(e) => set("siteName", e.target.value)} />
        </Field>
        <Field label="Logo">
          <ImageUpload
            folder="logos"
            value={settings.logoUrl}
            onChange={(url) => set("logoUrl", url)}
          />
        </Field>
        <Field label="Favicon">
          <ImageUpload
            folder="favicons"
            value={settings.faviconUrl}
            onChange={(url) => set("faviconUrl", url)}
          />
        </Field>
        <Field label="Description" full>
          <Textarea value={settings.siteDescription} onChange={(e) => set("siteDescription", e.target.value)} rows={2} />
        </Field>
      </Section>

      <Field label="Primary Color">
        <div className="flex items-center gap-3">
          <Input
            type="color"
            value={settings.theme.primary}
            onChange={(e) => setTheme("primary", e.target.value)}
            className="h-10 w-16 p-1"
          />

          <Input
            value={settings.theme.primary}
            onChange={(e) => setTheme("primary", e.target.value)}
          />
        </div>
      </Field>

      <Section title="SEO">
        <Field label="Browser Title">
          <Input value={settings.browserTitle} onChange={(e) => set("browserTitle", e.target.value)} />
        </Field>
        <Field label="SEO Title">
          <Input value={settings.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} />
        </Field>
        <Field label="SEO Description" full>
          <Textarea value={settings.seoDescription} onChange={(e) => set("seoDescription", e.target.value)} rows={2} />
        </Field>
        <Field label="Keywords (comma-separated)" full>
          <Input value={settings.seoKeywords} onChange={(e) => set("seoKeywords", e.target.value)} />
        </Field>
        <Field label="Open Graph Image URL">
          <Input value={settings.ogImageUrl} onChange={(e) => set("ogImageUrl", e.target.value)} />
        </Field>
        <Field label="Twitter Card Type">
          <Input value={settings.twitterCard} onChange={(e) => set("twitterCard", e.target.value)} placeholder="summary_large_image" />
        </Field>
        <Field label="Google Analytics ID">
          <Input value={settings.googleAnalyticsId} onChange={(e) => set("googleAnalyticsId", e.target.value)} placeholder="G-XXXXXXX" />
        </Field>
        <Field label="Google Site Verification">
          <Input value={settings.googleSiteVerification} onChange={(e) => set("googleSiteVerification", e.target.value)} />
        </Field>
        <Field label="robots.txt" full>
          <Textarea value={settings.robotsTxt} onChange={(e) => set("robotsTxt", e.target.value)} rows={3} className="font-mono text-xs" />
        </Field>
      </Section>

      <Section title="Site Status">
        <Field label="Maintenance Mode">
          <div className="flex items-center gap-2 pt-1">
            <Switch checked={settings.maintenanceMode} onCheckedChange={(v) => set("maintenanceMode", v)} />
            <span className="text-sm text-muted-foreground">
              {settings.maintenanceMode ? "Site is showing the maintenance page" : "Site is live"}
            </span>
          </div>
        </Field>
        <Field label="Maintenance Message">
          <Input value={settings.maintenanceMessage} onChange={(e) => set("maintenanceMessage", e.target.value)} />
        </Field>
        <Field label="Announcement Banner">
          <div className="flex items-center gap-2 pt-1">
            <Switch checked={settings.announcementEnabled} onCheckedChange={(v) => set("announcementEnabled", v)} />
            <span className="text-sm text-muted-foreground">
              {settings.announcementEnabled ? "Banner visible" : "Banner hidden"}
            </span>
          </div>
        </Field>
        <Field label="Announcement Text">
          <Input value={settings.announcementText} onChange={(e) => set("announcementText", e.target.value)} />
        </Field>
      </Section>

      <Section title="Footer">
        <Field label="Copyright">
          <Input value={settings.footerCopyright} onChange={(e) => set("footerCopyright", e.target.value)} placeholder="© 2026 …" />
        </Field>
        <Field label="Footer Text">
          <Input value={settings.footerText} onChange={(e) => set("footerText", e.target.value)} />
        </Field>
      </Section>

      <Section title="Contact">
        <Field label="Contact Email">
          <Input type="email" value={settings.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} />
        </Field>
        <Field label="Support Email">
          <Input type="email" value={settings.supportEmail} onChange={(e) => set("supportEmail", e.target.value)} />
        </Field>
        <Field label="Phone">
          <Input value={settings.phone} onChange={(e) => set("phone", e.target.value)} />
        </Field>
        <Field label="Address">
          <Input value={settings.address} onChange={(e) => set("address", e.target.value)} />
        </Field>
      </Section>

      <Section title="Social Links">
        {(["discord", "github", "linkedin", "twitter", "instagram", "youtube"] as const).map((key) => (
          <Field key={key} label={key[0].toUpperCase() + key.slice(1)}>
            <Input value={settings.social[key]} onChange={(e) => setSocial(key, e.target.value)} placeholder="https://…" />
          </Field>
        ))}
      </Section>

      <Section title="Custom Code" description="Advanced — injected as-is into the page. Use with care.">
        <Field label="Custom CSS" full>
          <Textarea value={settings.customCss} onChange={(e) => set("customCss", e.target.value)} rows={4} className="font-mono text-xs" />
        </Field>
        <Field label="Custom JavaScript" full>
          <Textarea value={settings.customJs} onChange={(e) => set("customJs", e.target.value)} rows={4} className="font-mono text-xs" />
        </Field>
        <Field label="Custom Head HTML" full>
          <Textarea value={settings.customHeadHtml} onChange={(e) => set("customHeadHtml", e.target.value)} rows={3} className="font-mono text-xs" />
        </Field>
        <Field label="Custom Footer HTML" full>
          <Textarea value={settings.customFooterHtml} onChange={(e) => set("customFooterHtml", e.target.value)} rows={3} className="font-mono text-xs" />
        </Field>
      </Section>
    </div>
  );
}
