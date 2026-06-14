import type { Metadata, Viewport } from "next";
import { Baloo_2, Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { SWRegister } from "@/components/SWRegister";
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
  title: "Manas 2026 — Unofficial Guide",
  description:
    "Unofficial timetable, now-playing and map for the Manas 2026 gathering. Not affiliated with the festival.",
  applicationName: "Manas 2026",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Manas 2026",
  },
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
            <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col">
              <Header />
              <main className="flex-1 pb-[calc(var(--nav-h)+var(--safe-bottom)+0.5rem)]">
                {children}
              </main>
            </div>
            <BottomNav />
            <SWRegister />
          </SettingsProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
