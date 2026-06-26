import type { Metadata } from "next";
import { AppShowcase } from "@/components/showcase/AppShowcase";

// The canonical showcase / download page for the native iOS + watchOS apps.
// Indexable. The og:image is the script-generated card
// (pwa/scripts/build_landing_images.py → public/landing/og.png) showing the framed
// iPhone + Apple Watch above the fold.
const title = "Guide for MANAS 2026 — iPhone & Apple Watch app";
const description =
  "The unofficial Guide for MANAS 2026 native app: the full festival timetable across every stage, a live Now view and Apple Watch widgets. On iPhone and on your wrist — free, no sign-up.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/app" },
  openGraph: {
    type: "website",
    siteName: "Guide for MANAS 2026",
    title,
    description,
    url: "/app",
    images: [{ url: "/landing/og.png", width: 1200, height: 630, alt: "Guide for MANAS 2026" }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/landing/og.png"],
  },
};

export default function AppPage() {
  return <AppShowcase />;
}
