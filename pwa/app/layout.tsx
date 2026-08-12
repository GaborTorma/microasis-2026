import type { Metadata, Viewport } from "next";
import { Baloo_2, Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { SWRegister } from "@/components/SWRegister";
import { FavoritesProvider } from "@/components/favorites/FavoritesContext";
import { SettingsProvider } from "@/components/settings/SettingsContext";

const display = Baloo_2({
  subsets: ["latin", "latin-ext"],
  weight: ["600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

const body = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  // Absolute base so og:image (and other relative URLs) resolve on prod, which is
  // what link-preview fetchers (iOS share sheet, iMessage, Telegram, Messenger)
  // read to show the app icon when a link is shared.
  metadataBase: new URL("https://microasis.torma.ai"),
  title: "Guide for MicrOasis 2026",
  description:
    "Unofficial timetable and now-playing view for the MicrOasis 2026 gathering. Not affiliated with the festival.",
  applicationName: "Guide for MicrOasis 2026",
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    siteName: "Guide for MicrOasis 2026",
    title: "Guide for MicrOasis 2026",
    description:
      "Unofficial timetable and now-playing view for the MicrOasis 2026 gathering.",
    images: [{ url: "/icons/icon-512.png", width: 512, height: 512, alt: "MicrOasis 2026" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    // Home-screen label for an installed PWA — short so it doesn't truncate.
    title: "MicrOasis 2026",
  },
  // Apple Smart App Banner: native "open in App Store" strip Safari shows on iOS.
  // Covers real Safari; InstallPrompt covers the in-app / non-Safari iOS cases.
  itunes: { appId: "6782099675" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#160c08",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [locale, messages] = await Promise.all([getLocale(), getMessages()]);

  return (
    <html lang={locale} className={`${display.variable} ${body.variable} h-full`}>
      <body className="min-h-full">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <SettingsProvider>
            <FavoritesProvider>
              <AppShell>{children}</AppShell>
              <SWRegister />
            </FavoritesProvider>
          </SettingsProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
