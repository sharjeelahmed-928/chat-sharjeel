import { AppSettings, Conversation, DEFAULT_SETTINGS, ExportBundle } from "@/types";

const CONVERSATIONS_KEY = "css.conversations.v1";
const SETTINGS_KEY = "css.settings.v1";

/**
 * Thin wrapper around localStorage so the rest of the app never touches
 * `window` directly and every read/write is guarded against:
 *  - server-side rendering (no `window`)
 *  - corrupted / manually-edited JSON
 *  - storage quota errors
 */
function safeGet<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeSet(key: string, value: unknown): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.error("Storage write failed", err);
    return false;
  }
}

export const storage = {
  loadConversations(): Conversation[] {
    return safeGet<Conversation[]>(CONVERSATIONS_KEY, []);
  },

  saveConversations(conversations: Conversation[]): boolean {
    return safeSet(CONVERSATIONS_KEY, conversations);
  },

  loadSettings(): AppSettings {
    return safeGet<AppSettings>(SETTINGS_KEY, DEFAULT_SETTINGS);
  },

  saveSettings(settings: AppSettings): boolean {
    return safeSet(SETTINGS_KEY, settings);
  },

  clearAll() {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(CONVERSATIONS_KEY);
    window.localStorage.removeItem(SETTINGS_KEY);
  },

  exportBundle(): ExportBundle {
    return {
      version: 1,
      exportedAt: Date.now(),
      conversations: this.loadConversations(),
    };
  },

  importBundle(bundle: unknown): Conversation[] | null {
    if (
      !bundle ||
      typeof bundle !== "object" ||
      !Array.isArray((bundle as ExportBundle).conversations)
    ) {
      return null;
    }
    const conversations = (bundle as ExportBundle).conversations;
    this.saveConversations(conversations);
    return conversations;
  },
};
