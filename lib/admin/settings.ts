import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase";

// -----------------------------------------------------------------------------
// Website settings — branding, SEO, footer, contact, social, custom code.
// -----------------------------------------------------------------------------
export interface WebsiteSettings {
  siteName: string;
  siteDescription: string;
  logoUrl: string;
  faviconUrl: string;
  browserTitle: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  ogImageUrl: string;
  twitterCard: string;
  googleAnalyticsId: string;
  googleSiteVerification: string;
  robotsTxt: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  announcementEnabled: boolean;
  announcementText: string;
  footerCopyright: string;
  footerText: string;
  contactEmail: string;
  supportEmail: string;
  phone: string;
  address: string;

  social: {
    discord: string;
    github: string;
    linkedin: string;
    twitter: string;
    instagram: string;
    youtube: string;
  };

  theme: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
  };

  customCss: string;
  customJs: string;
  customHeadHtml: string;
  customFooterHtml: string;
}


export const DEFAULT_WEBSITE_SETTINGS: WebsiteSettings = {
  siteName: "chat.sharjeel.space",
  siteDescription:
    "An open-source, account-free AI assistant. Start chatting instantly — no signup, no login.",
  logoUrl: "",
  faviconUrl: "",
  browserTitle: "chat.sharjeel.space — AI Assistant",
  seoTitle: "chat.sharjeel.space — AI Assistant",
  seoDescription:
    "An open-source, account-free AI assistant. Start chatting instantly — no signup, no login, all your chats stay on your device.",
  seoKeywords: "",
  ogImageUrl: "",
  twitterCard: "summary_large_image",
  googleAnalyticsId: "",
  googleSiteVerification: "",
  robotsTxt: "User-agent: *\nAllow: /",
  maintenanceMode: false,
  maintenanceMessage: "We're performing scheduled maintenance. Please check back shortly.",
  announcementEnabled: false,
  announcementText: "",
  footerCopyright: "",
  footerText: "",
  contactEmail: "",
  supportEmail: "",
  phone: "",
  address: "",

  social: {
    discord: "",
    github: "",
    linkedin: "",
    twitter: "",
    instagram: "",
    youtube: "",
  },

  theme: {
    primary: "#2563eb",
    secondary: "#1e293b",
    accent: "#3b82f6",
    background: "#ffffff",
    foreground: "#111827",
  },

  customCss: "",
  customJs: "",
  customHeadHtml: "",
  customFooterHtml: "",
};

// -----------------------------------------------------------------------------
// Chat settings — model defaults, generation params, feature toggles, prompts UI
// -----------------------------------------------------------------------------
export interface ChatSettings {
  defaultModel: string;
  temperature: number;
  topP: number;
  topK: number;
  maxTokens: number;
  streamingEnabled: boolean;
  visionEnabled: boolean;
  webSearchEnabled: boolean;
  markdownEnabled: boolean;
  rateLimitPerMinute: number;
  welcomeMessage: string;
  placeholderText: string;
  defaultSuggestions: string[];
}

export const DEFAULT_CHAT_SETTINGS: ChatSettings = {
  defaultModel: "llama-3.3-70b-versatile",
  temperature: 0.7,
  topP: 0.95,
  topK: 40,
  maxTokens: 2048,
  streamingEnabled: true,
  visionEnabled: true,
  webSearchEnabled: false,
  markdownEnabled: true,
  rateLimitPerMinute: 20,
  welcomeMessage: "What's on your mind?",
  placeholderText: "Ask anything…",
  defaultSuggestions: [
    "Explain quantum computing like I'm 12",
    "Draft a polite email declining a meeting",
    "Give me 5 ideas for a weekend trip",
    "Help me debug a React useEffect loop",
  ],
};

function mergeDeep<T>(base: T, patch: Partial<T>): T {
  return { ...base, ...patch };
}

export async function getWebsiteSettings(): Promise<WebsiteSettings> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return DEFAULT_WEBSITE_SETTINGS;
  const { data, error } = await supabase.from("site_settings").select("data").eq("id", 1).single();
  if (error || !data) return DEFAULT_WEBSITE_SETTINGS;
  return mergeDeep(DEFAULT_WEBSITE_SETTINGS, (data.data ?? {}) as Partial<WebsiteSettings>);
}

export async function saveWebsiteSettings(
  patch: Partial<WebsiteSettings>,
  adminId: string
): Promise<WebsiteSettings> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase is not configured.");
  const current = await getWebsiteSettings();
  const next = mergeDeep(current, patch);
  const { error } = await supabase
    .from("site_settings")
    .update({ data: next, updated_at: new Date().toISOString(), updated_by: adminId })
    .eq("id", 1);
  if (error) throw error;
  return next;
}

export async function getChatSettings(): Promise<ChatSettings> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return DEFAULT_CHAT_SETTINGS;
  const { data, error } = await supabase.from("chat_settings").select("data").eq("id", 1).single();
  if (error || !data) return DEFAULT_CHAT_SETTINGS;
  return mergeDeep(DEFAULT_CHAT_SETTINGS, (data.data ?? {}) as Partial<ChatSettings>);
}

export async function saveChatSettings(
  patch: Partial<ChatSettings>,
  adminId: string
): Promise<ChatSettings> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase is not configured.");
  const current = await getChatSettings();
  const next = mergeDeep(current, patch);
  const { error } = await supabase
    .from("chat_settings")
    .update({ data: next, updated_at: new Date().toISOString(), updated_by: adminId })
    .eq("id", 1);
  if (error) throw error;
  return next;
}

/** The subset of website + chat settings that's safe to expose to the public frontend. */
export interface PublicSettings {
  siteName: string;
  siteDescription: string;
  logoUrl: string;
  faviconUrl: string;
  contactEmail: string;
  supportEmail: string;
  phone: string;
  address: string;
  theme: WebsiteSettings["theme"];
  maintenanceMode: boolean;
  maintenanceMessage: string;
  announcementEnabled: boolean;
  announcementText: string;
  footerCopyright: string;
  footerText: string;
  social: WebsiteSettings["social"];
  welcomeMessage: string;
  placeholderText: string;
  defaultSuggestions: string[];
  defaultModel: string;
  visionEnabled: boolean;
}

export async function getPublicSettings(): Promise<PublicSettings> {
  const [site, chat] = await Promise.all([getWebsiteSettings(), getChatSettings()]);
  return {
    siteName: site.siteName,
    siteDescription: site.siteDescription,
    logoUrl: site.logoUrl,
    faviconUrl: site.faviconUrl,
    theme: site.theme,
    maintenanceMode: site.maintenanceMode,
    maintenanceMessage: site.maintenanceMessage,
    announcementEnabled: site.announcementEnabled,
    announcementText: site.announcementText,
    footerCopyright: site.footerCopyright,
    footerText: site.footerText,
    contactEmail: site.contactEmail,
    supportEmail: site.supportEmail,
    phone: site.phone,
    address: site.address,
    social: site.social,
    welcomeMessage: chat.welcomeMessage,
    placeholderText: chat.placeholderText,
    defaultSuggestions: chat.defaultSuggestions,
    defaultModel: chat.defaultModel,
    visionEnabled: chat.visionEnabled,
  };
}
