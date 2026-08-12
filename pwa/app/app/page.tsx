import type { Metadata } from "next";
import { AppShowcase } from "@/components/showcase/AppShowcase";
import { LANDING_IMG_V } from "@/lib/landing-version";

// The canonical showcase / download page for the native iOS + watchOS apps.
// Indexable. The og:image is the script-generated card
// (pwa/scripts/build_landing_images.py → public/landing/og.png) showing the framed
// iPhone + Apple Watch above the fold.
// ?v= busts scraper/browser caches (FB caches og:image per URL) whenever the
// card is regenerated — same trick lib/showcase.ts uses for the framed shots.
const OG_IMG = `/landing/og.png?v=${LANDING_IMG_V}`;

const title = "Guide for MicrOasis 2026 — iOS, watchOS, WebApp (Android)";
const description =
  "The unofficial Guide for MicrOasis 2026 native app: the full festival timetable across every stage, a live Now view and Apple Watch widgets. On iPhone and on your wrist — free, no sign-up.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/app" },
  openGraph: {
    type: "website",
    siteName: "Guide for MicrOasis 2026",
    title,
    description,
    url: "/app",
    images: [{ url: OG_IMG, width: 1200, height: 630, alt: "Guide for MicrOasis 2026" }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [OG_IMG],
  },
};

export default function AppPage() {
  return <AppShowcase />;
}
