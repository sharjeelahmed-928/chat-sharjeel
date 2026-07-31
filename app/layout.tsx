import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { getWebsiteSettings } from "@/lib/admin/settings";
import { hexToHsl } from "@/lib/theme";
import Footer from "@/components/Footer";
import { MaintenanceGate } from "@/components/MaintenanceGate";
import { ThemeProvider } from "@/components/theme-provider";

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

// Dynamic SEO/branding, editable from the admin panel (Website Settings).
// Falls back to the original static defaults if Supabase isn't configured.
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getWebsiteSettings();
  return {
    title: settings.browserTitle || "chat.sharjeel.space — AI Assistant",
    description:
      settings.seoDescription ||
      "An open-source, account-free AI assistant. Start chatting instantly — no signup, no login, all your chats stay on your device.",
    keywords: settings.seoKeywords || undefined,
    icons: settings.faviconUrl ? { icon: settings.faviconUrl } : undefined,
    openGraph: {
      title: settings.seoTitle || settings.browserTitle,
      description: settings.seoDescription,
      images: settings.ogImageUrl ? [settings.ogImageUrl] : undefined,
    },
    twitter: {
      card: (settings.twitterCard as "summary" | "summary_large_image") || "summary_large_image",
    },
    other: settings.googleSiteVerification
      ? { "google-site-verification": settings.googleSiteVerification }
      : undefined,
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf9f6" },
    { media: "(prefers-color-scheme: dark)", color: "#15171c" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const settings = await getWebsiteSettings();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Prevents a flash of the wrong theme before hydration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = JSON.parse(localStorage.getItem('css.settings.v1') || '{}');
                  var theme = stored.theme || 'system';
                  var isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                  document.documentElement.classList.toggle('dark', isDark);
                } catch (e) {}
              })();
            `,
          }}
        />
        {settings.googleAnalyticsId && (
          <>
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${settings.googleAnalyticsId}`}
            />
            <script
              dangerouslySetInnerHTML={{
                __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config','${settings.googleAnalyticsId}');`,
              }}
            />
          </>
        )}
        {settings.customCss && <style dangerouslySetInnerHTML={{ __html: settings.customCss }} />}
        {settings.customHeadHtml && (
          <div dangerouslySetInnerHTML={{ __html: settings.customHeadHtml }} />
        )}
      </head>
      <body
        style={
          {
            "--primary": settings.theme.primary,
          } as React.CSSProperties
        }
        className={`${display.variable} ${body.variable} ${mono.variable} font-sans`}
      >
       <ThemeProvider theme={settings.theme}>
          <MaintenanceGate
            maintenanceMode={settings.maintenanceMode}
            maintenanceMessage={settings.maintenanceMessage}
            announcementEnabled={settings.announcementEnabled}
            announcementText={settings.announcementText}
          >
            <div className="flex min-h-screen flex-col">
              <main className="flex-1">
                {children}
              </main>

              <Footer />
            </div>
          </MaintenanceGate>
        </ThemeProvider>
        {settings.customJs && <script dangerouslySetInnerHTML={{ __html: settings.customJs }} />}
        {settings.customFooterHtml && (
          <div dangerouslySetInnerHTML={{ __html: settings.customFooterHtml }} />
        )}
      </body>
    </html>
  );
}
